import type {
  Order,
  OrderInput,
  Product,
  ProductInput,
  Result,
  State,
} from "./types";

export const LOW_STOCK_LIMIT = 3;

export function emptyState(): State {
  return { products: [], orders: [], live: null, nextOrderNumber: 1 };
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
    unitPrice: product.price,
    status: "pendiente",
    createdAt: now,
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

  const clash = state.products.find((p) => p.code === code && p.id !== input.id);
  if (clash) return { ok: false, error: `Ya existe una prenda con código ${code}.` };

  const product: Product = { id: input.id ?? id, code, name, price: input.price, sizes: input.sizes };
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
  return state.orders.filter((o) => o.liveId === state.live!.id && o.status === "pendiente");
}

export function isLiveActive(state: State): boolean {
  return Boolean(state.live && !state.live.endedAt);
}

export function sumOrders(orders: Order[]): number {
  return orders.reduce((sum, o) => sum + orderTotal(o), 0);
}

export function startLive(state: State, id: string, now: string): State {
  return state.live && !state.live.endedAt
    ? state
    : { ...state, live: { id, startedAt: now, endedAt: null } };
}

export function endLive(state: State, now: string): State {
  return state.live && !state.live.endedAt
    ? { ...state, live: { ...state.live, endedAt: now } }
    : state;
}
