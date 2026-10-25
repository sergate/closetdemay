import { describe, expect, it } from "vitest";
import {
  advanceOrders,
  chargeMessage,
  groupByCustomer,
  saveCustomer,
  whatsappNumber,
  whatsappUrl,
} from "./fulfillment";
import { cancelOrder, emptyState, migrateState, placeOrder, saveProduct, startLive } from "./orders";
import type { State } from "./types";

const EXTRA = { image: "", published: true, wholesalePrice: null, wholesaleMin: 6 };
const NOW = "2026-10-25T20:00:00.000Z";

function withOrders(): State {
  let state = startLive(emptyState(), "l1", NOW);
  const saved = saveProduct(
    state,
    { code: "V-014", name: "Vestido floral", price: 18, sizes: [{ size: "M", stock: 10 }], ...EXTRA },
    "p1",
  );
  if (!saved.ok) throw new Error(saved.error);
  state = saved.value;
  for (const [id, customer] of [["o1", "@karla"], ["o2", "@karla"], ["o3", "@mari"]]) {
    const res = placeOrder(state, { code: "V-014", size: "M", customer, qty: 1 }, id, NOW);
    if (!res.ok) throw new Error(res.error);
    state = res.value.state;
  }
  return state;
}

describe("advanceOrders", () => {
  it("recorre pagado, empacado, enviado y entregado", () => {
    let state = withOrders();
    const steps = [
      { to: "pagado", paymentMethod: "deuna" },
      { to: "empacado" },
      { to: "enviado", courier: "servientrega", trackingCode: " SRV-1 " },
      { to: "entregado" },
    ] as const;
    for (const t of steps) {
      const res = advanceOrders(state, ["o1", "o2"], t, NOW);
      if (!res.ok) throw new Error(res.error);
      state = res.value;
    }
    const o1 = state.orders.find((o) => o.id === "o1")!;
    expect(o1.status).toBe("entregado");
    expect(o1.paymentMethod).toBe("deuna");
    expect(o1.courier).toBe("servientrega");
    expect(o1.trackingCode).toBe("SRV-1");
    expect(state.orders.find((o) => o.id === "o3")!.status).toBe("pendiente");
  });

  it("no permite saltarse pasos y no cambia nada si uno falla", () => {
    const state = withOrders();
    const paid = advanceOrders(state, ["o1"], { to: "pagado", paymentMethod: "efectivo" }, NOW);
    if (!paid.ok) throw new Error(paid.error);
    const res = advanceOrders(paid.value, ["o1", "o3"], { to: "empacado" }, NOW);
    expect(res.ok).toBe(false);
    expect(paid.value.orders.find((o) => o.id === "o1")!.status).toBe("pagado");
    expect(advanceOrders(state, ["o1"], { to: "enviado", courier: "tramaco", trackingCode: "" }, NOW).ok).toBe(false);
  });

  it("exige elegir el courier al enviar", () => {
    const state = withOrders();
    const res = advanceOrders(state, ["o1"], { to: "enviado", courier: "" as never, trackingCode: "" }, NOW);
    expect(res).toEqual({ ok: false, error: "Elige cómo se envía el pedido." });
  });
});

describe("cancelOrder con estados nuevos", () => {
  it("cancela un pedido pagado pero no uno enviado", () => {
    let state = withOrders();
    const paid = advanceOrders(state, ["o1"], { to: "pagado", paymentMethod: "otro" }, NOW);
    if (!paid.ok) throw new Error(paid.error);
    expect(cancelOrder(paid.value, "o1").ok).toBe(true);
    for (const t of [
      { to: "empacado" },
      { to: "enviado", courier: "motorizado", trackingCode: "" },
    ] as const) {
      const r = advanceOrders(paid.value, ["o1"], t, NOW);
      if (r.ok) paid.value = r.value;
    }
    state = paid.value;
    expect(cancelOrder(state, "o1")).toEqual({ ok: false, error: "No se puede cancelar un pedido que ya salió." });
  });
});

describe("clientas y WhatsApp", () => {
  it("normaliza teléfonos de Ecuador", () => {
    expect(whatsappNumber("099 123 4567")).toBe("593991234567");
    expect(whatsappNumber("+593 99 123 4567")).toBe("593991234567");
    expect(whatsappNumber("991234567")).toBe("593991234567");
    expect(whatsappNumber("12345")).toBeNull();
    // Otros países: con "+" o "00" se respeta el código de país.
    expect(whatsappNumber("+54 9 11 1234-5678")).toBe("5491112345678");
    expect(whatsappNumber("0054 9 11 1234 5678")).toBe("5491112345678");
    expect(whatsappNumber("+593 99 123 4567")).toBe("593991234567");
    expect(whatsappNumber("+54")).toBeNull();
    expect(whatsappNumber("+0 11 1234 5678")).toBeNull();
    expect(whatsappNumber("")).toBeNull();
  });

  it("arma el enlace con el mensaje codificado", () => {
    expect(whatsappUrl("0991234567", "Hola & gracias")).toBe(
      "https://wa.me/593991234567?text=Hola%20%26%20gracias",
    );
    expect(whatsappUrl("", "x")).toBe("https://wa.me/?text=x");
  });

  it("agrupa pedidos por clienta y arma un solo cobro", () => {
    const state = withOrders();
    const groups = groupByCustomer(state.orders);
    const karla = groups.find((g) => g.handle === "@karla")!;
    expect(karla.orders.map((o) => o.number)).toEqual([1, 2]);
    expect(karla.total).toBe(36);
    const msg = chargeMessage(undefined, "@karla", karla.orders, "Paga por Deuna.");
    expect(msg).toContain("Hola @karla");
    expect(msg).toContain("Total: $36.00");
    expect(msg.endsWith("Paga por Deuna.")).toBe(true);
  });

  it("guarda y actualiza clientas por usuario", () => {
    const first = saveCustomer(emptyState(), { handle: "karla", name: " Karla ", phone: "0991234567", city: "Guayaquil", address: "", wholesale: false });
    if (!first.ok) throw new Error(first.error);
    expect(first.value.customers[0]).toMatchObject({ handle: "@karla", name: "Karla" });
    const second = saveCustomer(first.value, { handle: "@karla", name: "Karla P.", phone: "", city: "", address: "", wholesale: false });
    if (!second.ok) throw new Error(second.error);
    expect(second.value.customers).toHaveLength(1);
    expect(second.value.customers[0].name).toBe("Karla P.");
    expect(saveCustomer(emptyState(), { handle: " ", name: "", phone: "", city: "", address: "", wholesale: false }).ok).toBe(false);
  });
});

describe("migrateState", () => {
  it("completa datos guardados por la Fase 1", () => {
    const old = {
      products: [],
      live: null,
      nextOrderNumber: 2,
      orders: [{ id: "o1", number: 1, liveId: null, code: "V", productName: "V", size: "M", customer: "@a", qty: 1, unitPrice: 5, status: "pendiente", createdAt: NOW }],
    } as never;
    const state = migrateState(old);
    expect(state.customers).toEqual([]);
    expect(state.settings.paymentInstructions).not.toBe("");
    expect(state.orders[0]).toMatchObject({ paymentMethod: null, courier: null, trackingCode: "" });
  });
});
