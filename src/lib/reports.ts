import { orderTotal } from "./orders";
import type { Customer, Order, State } from "./types";

const FREQUENT_AT = 3;

/** Pedidos que cuentan para las ventas: todos menos los cancelados. */
export function soldOrders(state: State): Order[] {
  return state.orders.filter((o) => o.status !== "cancelado");
}

export type LiveSales = { liveId: string; startedAt: string; orders: number; total: number };

/** Ventas de los últimos `count` lives, del más antiguo al más reciente. */
export function salesByLive(state: State, count = 7): LiveSales[] {
  const sold = soldOrders(state);
  return state.lives
    .slice(0, count)
    .map((live) => {
      const orders = sold.filter((o) => o.liveId === live.id);
      return {
        liveId: live.id,
        startedAt: live.startedAt,
        orders: orders.length,
        total: orders.reduce((sum, o) => sum + orderTotal(o), 0),
      };
    })
    .reverse();
}

export type Totals = { sales: number; orders: number; average: number; repeatRate: number };

export function totals(orders: Order[]): Totals {
  const sales = orders.reduce((sum, o) => sum + orderTotal(o), 0);
  const perCustomer = new Map<string, number>();
  for (const o of orders) perCustomer.set(o.customer, (perCustomer.get(o.customer) ?? 0) + 1);
  const buyers = perCustomer.size;
  const repeaters = [...perCustomer.values()].filter((n) => n >= 2).length;
  return {
    sales,
    orders: orders.length,
    average: orders.length ? sales / orders.length : 0,
    repeatRate: buyers ? repeaters / buyers : 0,
  };
}

export type TopProduct = { code: string; name: string; units: number; total: number };

export function topProducts(orders: Order[], limit = 5): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const o of orders) {
    const row = map.get(o.code) ?? { code: o.code, name: o.productName, units: 0, total: 0 };
    row.units += o.qty;
    row.total += orderTotal(o);
    map.set(o.code, row);
  }
  return [...map.values()].sort((a, b) => b.units - a.units || b.total - a.total).slice(0, limit);
}

/** Talla que más se pidió (por unidades), o null si no hay pedidos. */
export function topSize(orders: Order[]): string | null {
  const map = new Map<string, number>();
  for (const o of orders) map.set(o.size, (map.get(o.size) ?? 0) + o.qty);
  const best = [...map.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : null;
}

export type CustomerKind = "nueva" | "frecuente" | "mayorista";

export type CustomerStats = {
  handle: string;
  customer: Customer | undefined;
  orders: number;
  total: number;
  lastOrderAt: string | null;
  kind: CustomerKind;
};

/** Una fila por clienta: las guardadas y también quienes solo aparecen en pedidos. */
export function customerStats(state: State): CustomerStats[] {
  const sold = soldOrders(state);
  const handles = new Set([...state.customers.map((c) => c.handle), ...sold.map((o) => o.customer)]);
  return [...handles]
    .map((handle) => {
      const customer = state.customers.find((c) => c.handle === handle);
      const mine = sold.filter((o) => o.customer === handle);
      const kind: CustomerKind = customer?.wholesale
        ? "mayorista"
        : mine.length >= FREQUENT_AT
          ? "frecuente"
          : "nueva";
      return {
        handle,
        customer,
        orders: mine.length,
        total: mine.reduce((sum, o) => sum + orderTotal(o), 0),
        lastOrderAt: mine.map((o) => o.createdAt).sort().at(-1) ?? null,
        kind,
      };
    })
    .sort((a, b) => b.total - a.total || a.handle.localeCompare(b.handle));
}

/** Mensaje para avisar del próximo live. */
export function liveNoticeMessage(template: string, customer: Customer | undefined, handle: string, schedule: string): string {
  const first = customer?.name.split(/\s+/)[0] || handle;
  return template
    .replaceAll("{nombre}", first)
    .replaceAll("{horario}", schedule.trim() || "pronto");
}
