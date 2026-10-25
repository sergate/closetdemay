import { DEFAULT_LIVE_NOTICE, DEFAULT_PAYMENT_INSTRUCTIONS } from "./types";
import type {
  Customer,
  Order,
  OrderInput,
  Product,
  ProductInput,
  Result,
  State,
} from "./types";

export const LOW_STOCK_LIMIT = 3;

export function emptyState(): State {
  return {
    products: [],
    orders: [],
    live: null,
    lives: [],
    nextOrderNumber: 1,
    customers: [],
    settings: {
      paymentInstructions: DEFAULT_PAYMENT_INSTRUCTIONS,
      whatsapp: "",
      liveSchedule: "",
      liveNotice: DEFAULT_LIVE_NOTICE,
    },
  };
}

/** Completa datos guardados por versiones anteriores (Fase 1). */
type StoredState = Omit<Partial<State>, "orders" | "products" | "customers"> & {
  orders?: Partial<Order>[];
  products?: Partial<Product>[];
  customers?: Partial<Customer>[];
};

export function migrateState(raw: StoredState): State {
  const base = emptyState();
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...raw.settings },
    lives: raw.lives ?? (raw.live ? [raw.live] : []),
    products: (raw.products ?? []).map(
      (p) => ({ image: "", published: true, wholesalePrice: null, wholesaleMin: 6, ...p }) as Product,
    ),
    customers: (raw.customers ?? []).map((c) => ({ wholesale: false, ...c }) as Customer),
    orders: (raw.orders ?? []).map(
      (o) =>
        ({
          paymentMethod: null,
          paidAt: null,
          courier: null,
          trackingCode: "",
          shippedAt: null,
          ...o,
        }) as Order,
    ),
  };
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizeCustomer(customer: string): string {
  const clean = customer.trim().replace(/\s+/g, "");
  if (!clean) return "";
  return clean.startsWith("@") ? clean : `@${clean}`;
}

export function findProduct(state: State, code: string): Product | undefined {
  const wanted = normalizeCode(code);
  return state.products.find((p) => p.code === wanted);
}

/** Precio por unidad: aplica el precio por mayor si la clienta es mayorista y llega al mínimo. */
export function unitPriceFor(product: Product, customer: string, qty: number, state: State): number {
  const wholesale = state.customers.find((c) => c.handle === customer)?.wholesale ?? false;
  const special = product.wholesalePrice;
  return wholesale && special !== null && qty >= product.wholesaleMin ? special : product.price;
}

export function placeOrder(
  state: State,
  input: OrderInput,
  id: string,
  now: string,
): Result<{ state: State; order: Order }> {
  if (!state.live || state.live.endedAt) {
    return { ok: false, error: "Inicia el live antes de registrar pedidos." };
  }

  const product = findProduct(state, input.code);
  if (!product) return { ok: false, error: `No existe la prenda ${normalizeCode(input.code)}.` };

  const customer = normalizeCustomer(input.customer);
  if (!customer) return { ok: false, error: "Falta el usuario de TikTok." };

  if (!Number.isInteger(input.qty) || input.qty < 1) {
    return { ok: false, error: "La cantidad debe ser 1 o más." };
  }

  const size = product.sizes.find((s) => s.size === input.size);
  if (!size) return { ok: false, error: `${product.code} no tiene talla ${input.size}.` };
  if (size.stock < input.qty) {
    return {
      ok: false,
      error: `Solo quedan ${size.stock} de ${product.code} talla ${size.size}.`,
    };
  }

  const order: Order = {
    id,
    number: state.nextOrderNumber,
    liveId: state.live.id,
    code: product.code,
    productName: product.name,
    size: size.size,
    customer,
    qty: input.qty,
    unitPrice: unitPriceFor(product, customer, input.qty, state),
    status: "pendiente",
    createdAt: now,
    paymentMethod: null,
    paidAt: null,
    courier: null,
    trackingCode: "",
    shippedAt: null,
  };

  const products = state.products.map((p) =>
    p.id !== product.id
      ? p
      : {
          ...p,
          sizes: p.sizes.map((s) =>
            s.size === size.size ? { ...s, stock: s.stock - input.qty } : s,
          ),
        },
  );

  return {
    ok: true,
    value: {
      order,
      state: {
        ...state,
        products,
        orders: [order, ...state.orders],
        nextOrderNumber: state.nextOrderNumber + 1,
      },
    },
  };
}

export function cancelOrder(state: State, orderId: string): Result<State> {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return { ok: false, error: "No existe ese pedido." };
  if (order.status === "cancelado") return { ok: false, error: "El pedido ya estaba cancelado." };
  if (order.status === "enviado" || order.status === "entregado") {
    return { ok: false, error: "No se puede cancelar un pedido que ya salió." };
  }

  const products = state.products.map((p) =>
    p.code !== order.code
      ? p
      : {
          ...p,
          sizes: p.sizes.map((s) =>
            s.size === order.size ? { ...s, stock: s.stock + order.qty } : s,
          ),
        },
  );

  return {
    ok: true,
    value: {
      ...state,
      products,
      orders: state.orders.map((o) =>
        o.id === orderId ? { ...o, status: "cancelado" as const } : o,
      ),
    },
  };
}

export function saveProduct(state: State, input: ProductInput, id: string): Result<State> {
  const code = normalizeCode(input.code);
  const name = input.name.trim();
  if (!code) return { ok: false, error: "Falta el código de la prenda." };
  if (!name) return { ok: false, error: "Falta el nombre de la prenda." };
  if (!(input.price >= 0)) return { ok: false, error: "El precio no es válido." };
  if (input.sizes.some((s) => !Number.isInteger(s.stock) || s.stock < 0)) {
    return { ok: false, error: "El stock debe ser un número entero de 0 o más." };
  }
  if (input.sizes.length === 0) return { ok: false, error: "Agrega al menos una talla." };
  if (input.wholesalePrice !== null && !(input.wholesalePrice >= 0 && input.wholesalePrice <= input.price)) {
    return { ok: false, error: "El precio por mayor debe ser menor o igual al precio normal." };
  }
  if (!Number.isInteger(input.wholesaleMin) || input.wholesaleMin < 2) {
    return { ok: false, error: "El mínimo por mayor debe ser 2 o más." };
  }

  const clash = state.products.find((p) => p.code === code && p.id !== input.id);
  if (clash) return { ok: false, error: `Ya existe una prenda con código ${code}.` };

  const product: Product = {
    id: input.id ?? id,
    code,
    name,
    price: input.price,
    sizes: input.sizes,
    image: input.image,
    published: input.published,
    wholesalePrice: input.wholesalePrice,
    wholesaleMin: input.wholesaleMin,
  };
  const exists = state.products.some((p) => p.id === product.id);
  return {
    ok: true,
    value: {
      ...state,
      products: exists
        ? state.products.map((p) => (p.id === product.id ? product : p))
        : [...state.products, product],
    },
  };
}

export function deleteProduct(state: State, productId: string): State {
  return { ...state, products: state.products.filter((p) => p.id !== productId) };
}

export function adjustStock(
  state: State,
  productId: string,
  size: string,
  delta: number,
): State {
  return {
    ...state,
    products: state.products.map((p) =>
      p.id !== productId
        ? p
        : {
            ...p,
            sizes: p.sizes.map((s) =>
              s.size === size ? { ...s, stock: Math.max(0, s.stock + delta) } : s,
            ),
          },
    ),
  };
}

export function lowStock(products: Product[], limit = LOW_STOCK_LIMIT) {
  return products.flatMap((p) =>
    p.sizes
      .filter((s) => s.stock <= limit)
      .map((s) => ({ code: p.code, name: p.name, size: s.size, stock: s.stock })),
  );
}

export function orderTotal(order: Order): number {
  return order.qty * order.unitPrice;
}

export function liveOrders(state: State): Order[] {
  if (!state.live) return [];
  return state.orders.filter((o) => o.liveId === state.live!.id && o.status !== "cancelado");
}

export function isLiveActive(state: State): boolean {
  return Boolean(state.live && !state.live.endedAt);
}

export function sumOrders(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + orderTotal(o), 0);
}

export function startLive(state: State, id: string, now: string): State {
  if (state.live && !state.live.endedAt) return state;
  const live = { id, startedAt: now, endedAt: null };
  return { ...state, live, lives: [live, ...state.lives] };
}

export function endLive(state: State, now: string): State {
  if (!state.live || state.live.endedAt) return state;
  const live = { ...state.live, endedAt: now };
  return { ...state, live, lives: state.lives.map((l) => (l.id === live.id ? live : l)) };
}

export function canCancel(order: Order): boolean {
  return order.status === "pendiente" || order.status === "pagado" || order.status === "empacado";
}
