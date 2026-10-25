import { normalizeCustomer, orderTotal } from "./orders";
import type { Customer, Order, OrderStatus, PaymentAccount, Result, Settings, State, Transition } from "./types";

const FROM: Record<Transition["to"], OrderStatus> = {
  pagado: "pendiente",
  empacado: "pagado",
  enviado: "empacado",
  entregado: "enviado",
};

/** Mueve pedidos al siguiente estado. Todo o nada: si uno no puede avanzar, no cambia ninguno. */
export function advanceOrders(
  state: State,
  ids: string[],
  transition: Transition,
  now: string,
): Result<State> {
  if (ids.length === 0) return { ok: false, error: "No hay pedidos seleccionados." };
  if (transition.to === "enviado" && !transition.courier) {
    return { ok: false, error: "Elige cómo se envía el pedido." };
  }

  const selected = state.orders.filter((o) => ids.includes(o.id));
  if (selected.length !== ids.length) return { ok: false, error: "No existe alguno de los pedidos." };

  const wrong = selected.find((o) => o.status !== FROM[transition.to]);
  if (wrong) {
    return {
      ok: false,
      error: `El pedido #${wrong.number} no está en el estado correcto para este paso.`,
    };
  }

  const apply = (o: Order): Order => {
    switch (transition.to) {
      case "pagado":
        return { ...o, status: "pagado", paymentMethod: transition.paymentMethod, paidAt: now };
      case "empacado":
        return { ...o, status: "empacado" };
      case "enviado":
        return {
          ...o,
          status: "enviado",
          courier: transition.courier,
          trackingCode: transition.trackingCode.trim(),
          shippedAt: now,
        };
      case "entregado":
        return { ...o, status: "entregado" };
    }
  };

  return {
    ok: true,
    value: { ...state, orders: state.orders.map((o) => (ids.includes(o.id) ? apply(o) : o)) },
  };
}

export function findCustomer(state: State, handle: string): Customer | undefined {
  const wanted = normalizeCustomer(handle);
  return state.customers.find((c) => c.handle === wanted);
}

export function saveCustomer(state: State, input: Customer): Result<State> {
  const handle = normalizeCustomer(input.handle);
  if (!handle) return { ok: false, error: "Falta el usuario de TikTok." };
  const customer: Customer = {
    handle,
    name: input.name.trim(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    address: input.address.trim(),
    wholesale: input.wholesale,
  };
  const exists = state.customers.some((c) => c.handle === handle);
  return {
    ok: true,
    value: {
      ...state,
      customers: exists
        ? state.customers.map((c) => (c.handle === handle ? customer : c))
        : [...state.customers, customer],
    },
  };
}

export function customerLabel(state: State, handle: string): string {
  const name = findCustomer(state, handle)?.name;
  return name ? `${name} (${handle})` : handle;
}

export type CustomerGroup = { handle: string; orders: Order[]; total: number };

export function groupByCustomer(orders: Order[]): CustomerGroup[] {
  const groups = new Map<string, Order[]>();
  for (const o of orders) groups.set(o.customer, [...(groups.get(o.customer) ?? []), o]);
  return [...groups.entries()].map(([handle, list]) => ({
    handle,
    orders: [...list].sort((a, b) => a.number - b.number),
    total: list.reduce((sum, o) => sum + orderTotal(o), 0),
  }));
}

/**
 * Número para wa.me, o null si no es válido.
 * Sin prefijo se asume Ecuador (593 + 9 dígitos). Con "+" o "00" se acepta cualquier país
 * (por ejemplo +54 9 11 1234 5678 para Argentina), de 8 a 15 dígitos.
 */
export function whatsappNumber(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") || trimmed.startsWith("00")) {
    const international = trimmed.startsWith("+") ? digits : digits.slice(2);
    return /^[1-9]\d{7,14}$/.test(international) ? international : null;
  }
  let full: string;
  if (digits.startsWith("593")) full = digits;
  else if (digits.startsWith("0")) full = `593${digits.slice(1)}`;
  else full = `593${digits}`;
  return /^593\d{9}$/.test(full) ? full : null;
}

const ACCOUNT_KIND: Record<PaymentAccount["type"], string> = {
  ahorros: "cuenta de ahorros",
  corriente: "cuenta corriente",
  celular: "celular",
};

/** Mensaje de error si la cuenta está incompleta; null si se puede guardar. */
export function validateAccount(a: PaymentAccount): string | null {
  const label = a.bank.trim() || "una de las cuentas";
  if (!a.bank.trim()) return "Falta el banco o la app en una de las cuentas.";
  if (!a.number.trim()) return `Falta el número en ${label}.`;
  if (!a.holder.trim()) return `Falta el nombre del titular en ${label}.`;
  if (a.type === "celular" && !/^[+\d][\d\s-]{6,}$/.test(a.number.trim())) {
    return `El celular de ${label} solo puede tener números.`;
  }
  return null;
}

/** Bloque de texto con los datos para transferir; vacío si no hay cuentas. */
export function paymentBlock(accounts: PaymentAccount[]): string {
  if (accounts.length === 0) return "";
  const blocks = accounts.map((a) =>
    [
      `*${a.bank.trim()}* · ${ACCOUNT_KIND[a.type]}`,
      `${a.type === "celular" ? "Celular" : "N°"}: ${a.number.trim()}`,
      `Titular: ${a.holder.trim()}`,
      a.idNumber.trim() ? `C.I./RUC: ${a.idNumber.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const title = accounts.length === 1 ? "*Datos para transferir:*" : "*Datos para transferir (elige una cuenta):*";
  return [title, blocks.join("\n\n")].join("\n");
}

export function chargeMessage(
  customer: Customer | undefined,
  handle: string,
  orders: Order[],
  settings: Pick<Settings, "paymentAccounts" | "paymentInstructions">,
): string {
  const first = customer?.name.split(/\s+/)[0] || handle;
  const lines = orders.map(
    (o) => `- ${o.code} ${o.productName} · talla ${o.size} × ${o.qty}: $${orderTotal(o).toFixed(2)}`,
  );
  const total = orders.reduce((sum, o) => sum + orderTotal(o), 0);
  const parts = [
    [
      `Hola ${first}, gracias por tu compra en El Closet de May. Esto es lo que separamos para ti:`,
      ...lines,
      `Total: $${total.toFixed(2)}`,
    ].join("\n"),
    paymentBlock(settings.paymentAccounts),
    settings.paymentInstructions.trim(),
  ];
  return parts.filter(Boolean).join("\n\n");
}

/** Enlace de WhatsApp con el mensaje armado; sin teléfono válido abre el chat para elegir contacto. */
export function whatsappUrl(phone: string, text: string): string {
  const number = whatsappNumber(phone);
  const query = `text=${encodeURIComponent(text)}`;
  return number ? `https://wa.me/${number}?${query}` : `https://wa.me/?${query}`;
}
