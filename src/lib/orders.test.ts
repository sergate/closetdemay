import { describe, expect, it } from "vitest";
import {
  adjustStock,
  cancelOrder,
  emptyState,
  endLive,
  liveOrders,
  lowStock,
  normalizeCustomer,
  placeOrder,
  saveProduct,
  startLive,
  sumOrders,
} from "./orders";
import type { State } from "./types";

const EXTRA = { image: "", published: true, wholesalePrice: null, wholesaleMin: 6 };
const NOW = "2026-10-25T20:00:00.000Z";

function withProduct(): State {
  const saved = saveProduct(
    emptyState(),
    { code: "v-014", name: "Vestido floral", price: 18, sizes: [{ size: "M", stock: 2 }, { size: "S", stock: 5 }], ...EXTRA },
    "p1",
  );
  if (!saved.ok) throw new Error(saved.error);
  return startLive(saved.value, "l1", NOW);
}

describe("normalizeCustomer", () => {
  it("agrega @ y quita espacios", () => {
    expect(normalizeCustomer(" karla gye ")).toBe("@karlagye");
    expect(normalizeCustomer("@karla_gye")).toBe("@karla_gye");
    expect(normalizeCustomer("  ")).toBe("");
  });
});

describe("placeOrder", () => {
  it("descuenta stock, numera y guarda el precio", () => {
    const res = placeOrder(withProduct(), { code: "V-014", size: "M", customer: "karla_gye", qty: 1 }, "o1", NOW);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.order.number).toBe(1);
    expect(res.value.order.customer).toBe("@karla_gye");
    expect(res.value.order.unitPrice).toBe(18);
    expect(res.value.state.products[0].sizes.find((s) => s.size === "M")?.stock).toBe(1);
    expect(res.value.state.nextOrderNumber).toBe(2);
  });

  it("rechaza si no hay stock suficiente", () => {
    const res = placeOrder(withProduct(), { code: "V-014", size: "M", customer: "@a", qty: 3 }, "o1", NOW);
    expect(res).toEqual({ ok: false, error: "Solo quedan 2 de V-014 talla M." });
  });

  it("rechaza prenda o talla inexistente y usuario vacío", () => {
    const base = withProduct();
    expect(placeOrder(base, { code: "X-1", size: "M", customer: "@a", qty: 1 }, "o", NOW).ok).toBe(false);
    expect(placeOrder(base, { code: "V-014", size: "XL", customer: "@a", qty: 1 }, "o", NOW).ok).toBe(false);
    expect(placeOrder(base, { code: "V-014", size: "M", customer: " ", qty: 1 }, "o", NOW).ok).toBe(false);
    expect(placeOrder(base, { code: "V-014", size: "M", customer: "@a", qty: 0 }, "o", NOW).ok).toBe(false);
  });

  it("exige un live activo", () => {
    const res = placeOrder(endLive(withProduct(), NOW), { code: "V-014", size: "M", customer: "@a", qty: 1 }, "o", NOW);
    expect(res).toEqual({ ok: false, error: "Inicia el live antes de registrar pedidos." });
  });
});

describe("cancelOrder", () => {
  it("devuelve el stock y marca el pedido como cancelado", () => {
    const placed = placeOrder(withProduct(), { code: "V-014", size: "M", customer: "@a", qty: 2 }, "o1", NOW);
    if (!placed.ok) throw new Error(placed.error);
    const res = cancelOrder(placed.value.state, "o1");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.products[0].sizes.find((s) => s.size === "M")?.stock).toBe(2);
    expect(res.value.orders[0].status).toBe("cancelado");
    expect(cancelOrder(res.value, "o1").ok).toBe(false);
  });
});

describe("saveProduct", () => {
  it("no permite códigos repetidos", () => {
    const res = saveProduct(withProduct(), { code: "V-014", name: "Otro", price: 5, sizes: [{ size: "S", stock: 1 }], ...EXTRA }, "p2");
    expect(res.ok).toBe(false);
  });
});

describe("resúmenes", () => {
  it("suma solo los pedidos activos del live", () => {
    let state = withProduct();
    const a = placeOrder(state, { code: "V-014", size: "S", customer: "@a", qty: 2 }, "o1", NOW);
    if (!a.ok) throw new Error(a.error);
    const b = placeOrder(a.value.state, { code: "V-014", size: "S", customer: "@b", qty: 1 }, "o2", NOW);
    if (!b.ok) throw new Error(b.error);
    const c = cancelOrder(b.value.state, "o2");
    if (!c.ok) throw new Error(c.error);
    state = c.value;
    expect(liveOrders(state)).toHaveLength(1);
    expect(sumOrders(liveOrders(state))).toBe(36);
  });

  it("detecta poco stock y ajusta sin bajar de cero", () => {
    const state = adjustStock(withProduct(), "p1", "M", -10);
    expect(state.products[0].sizes.find((s) => s.size === "M")?.stock).toBe(0);
    expect(lowStock(state.products)).toEqual([{ code: "V-014", name: "Vestido floral", size: "M", stock: 0 }]);
  });
});
