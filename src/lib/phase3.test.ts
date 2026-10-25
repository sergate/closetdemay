import { describe, expect, it } from "vitest";
import { saveCustomer } from "./fulfillment";
import { cancelOrder, emptyState, endLive, migrateState, placeOrder, saveProduct, startLive, unitPriceFor } from "./orders";
import { customerStats, liveNoticeMessage, salesByLive, soldOrders, topProducts, topSize, totals } from "./reports";
import type { State } from "./types";

const NOW = "2026-10-25T20:00:00.000Z";
const product = { code: "V-014", name: "Vestido", price: 18, sizes: [{ size: "M", stock: 50 }, { size: "S", stock: 50 }], image: "", published: true, wholesalePrice: 12, wholesaleMin: 6 };

function setup(): State {
  const saved = saveProduct(emptyState(), product, "p1");
  if (!saved.ok) throw new Error(saved.error);
  const other = saveProduct(saved.value, { ...product, code: "B-022", name: "Blusa", price: 10, wholesalePrice: null }, "p2");
  if (!other.ok) throw new Error(other.error);
  return other.value;
}

function order(state: State, code: string, size: string, customer: string, qty: number, id: string): State {
  const res = placeOrder(state, { code, size, customer, qty }, id, NOW);
  if (!res.ok) throw new Error(res.error);
  return res.value.state;
}

describe("precio por mayor", () => {
  it("lo aplica solo a mayoristas que llegan al mínimo", () => {
    let state = startLive(setup(), "l1", NOW);
    const withCustomer = saveCustomer(state, { handle: "@mari", name: "", phone: "", city: "", address: "", wholesale: true });
    if (!withCustomer.ok) throw new Error(withCustomer.error);
    state = withCustomer.value;

    state = order(state, "V-014", "M", "@mari", 6, "o1");
    state = order(state, "V-014", "M", "@mari", 5, "o2");
    state = order(state, "V-014", "M", "@karla", 6, "o3");
    state = order(state, "B-022", "M", "@mari", 6, "o4");
    const price = (id: string) => state.orders.find((o) => o.id === id)!.unitPrice;
    expect(price("o1")).toBe(12);
    expect(price("o2")).toBe(18);
    expect(price("o3")).toBe(18);
    expect(price("o4")).toBe(10);
    expect(unitPriceFor(state.products[0], "@mari", 6, state)).toBe(12);
  });

  it("valida el precio y el mínimo por mayor", () => {
    expect(saveProduct(emptyState(), { ...product, wholesalePrice: 30 }, "p").ok).toBe(false);
    expect(saveProduct(emptyState(), { ...product, wholesaleMin: 1 }, "p").ok).toBe(false);
    expect(saveProduct(emptyState(), { ...product, wholesalePrice: null }, "p").ok).toBe(true);
  });
});

describe("historial de lives", () => {
  it("guarda cada live y cierra el correcto", () => {
    let state = startLive(emptyState(), "l1", "2026-10-20T20:00:00Z");
    state = endLive(state, "2026-10-20T22:00:00Z");
    state = startLive(state, "l2", NOW);
    expect(state.lives.map((l) => l.id)).toEqual(["l2", "l1"]);
    expect(state.lives[1].endedAt).toBe("2026-10-20T22:00:00Z");
    state = endLive(state, NOW);
    expect(state.lives[0].endedAt).toBe(NOW);
  });

  it("migra datos anteriores con su live y productos sin los campos nuevos", () => {
    const state = migrateState({
      live: { id: "l0", startedAt: NOW, endedAt: null },
      products: [{ id: "p", code: "A", name: "A", price: 5, sizes: [] }],
      customers: [{ handle: "@a", name: "A", phone: "", city: "", address: "" }],
    });
    expect(state.lives).toHaveLength(1);
    expect(state.products[0]).toMatchObject({ image: "", published: true, wholesalePrice: null, wholesaleMin: 6 });
    expect(state.customers[0].wholesale).toBe(false);
    expect(state.settings.whatsapp).toBe("");
  });
});

describe("reportes", () => {
  function sales(): State {
    let state = startLive(setup(), "l1", "2026-10-20T20:00:00Z");
    state = order(state, "V-014", "M", "@karla", 2, "o1");
    state = order(state, "B-022", "S", "@karla", 1, "o2");
    state = order(state, "V-014", "M", "@mari", 1, "o3");
    state = endLive(state, "2026-10-20T22:00:00Z");
    state = startLive(state, "l2", NOW);
    state = order(state, "V-014", "M", "@karla", 1, "o4");
    state = order(state, "B-022", "M", "@lucia", 4, "o5");
    const cancelled = cancelOrder(state, "o5");
    if (!cancelled.ok) throw new Error(cancelled.error);
    return cancelled.value;
  }

  it("ignora pedidos cancelados y calcula totales", () => {
    const state = sales();
    expect(soldOrders(state)).toHaveLength(4);
    const t = totals(soldOrders(state));
    expect(t.sales).toBe(2 * 18 + 10 + 18 + 18);
    expect(t.orders).toBe(4);
    expect(t.average).toBeCloseTo(82 / 4);
    expect(t.repeatRate).toBeCloseTo(1 / 2);
    expect(totals([])).toEqual({ sales: 0, orders: 0, average: 0, repeatRate: 0 });
  });

  it("agrupa ventas por live en orden cronológico", () => {
    const rows = salesByLive(sales());
    expect(rows.map((r) => r.liveId)).toEqual(["l1", "l2"]);
    expect(rows.map((r) => r.total)).toEqual([64, 18]);
  });

  it("ordena prendas, tallas y clientas", () => {
    const state = sales();
    const orders = soldOrders(state);
    expect(topProducts(orders)[0]).toMatchObject({ code: "V-014", units: 4, total: 72 });
    expect(topSize(orders)).toBe("M");
    expect(topSize([])).toBeNull();
    const stats = customerStats(state);
    expect(stats[0]).toMatchObject({ handle: "@karla", orders: 3, kind: "frecuente" });
    expect(stats.find((s) => s.handle === "@mari")!.kind).toBe("nueva");
    // Quien solo tiene pedidos cancelados y no tiene ficha guardada no aparece.
    expect(stats.some((s) => s.handle === "@lucia")).toBe(false);
  });

  it("marca como mayorista a quien tenga el indicador", () => {
    const saved = saveCustomer(sales(), { handle: "@mari", name: "Mari", phone: "", city: "", address: "", wholesale: true });
    if (!saved.ok) throw new Error(saved.error);
    expect(customerStats(saved.value).find((s) => s.handle === "@mari")!.kind).toBe("mayorista");
  });
});

describe("aviso del live", () => {
  it("reemplaza nombre y horario", () => {
    const customer = { handle: "@k", name: "Karla Pérez", phone: "", city: "", address: "", wholesale: false };
    expect(liveNoticeMessage("Hola {nombre}, live {horario}.", customer, "@k", "Jueves 8 pm")).toBe("Hola Karla, live Jueves 8 pm.");
    expect(liveNoticeMessage("Hola {nombre}, live {horario}.", undefined, "@k", " ")).toBe("Hola @k, live pronto.");
  });
});
