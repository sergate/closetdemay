import { describe, expect, it } from "vitest";
import { chargeMessage, paymentBlock, validateAccount } from "./fulfillment";
import { emptyState, migrateState, placeOrder, saveProduct, startLive } from "./orders";
import type { Order, PaymentAccount } from "./types";

const pichincha: PaymentAccount = {
  id: "a1",
  bank: "Banco Pichincha",
  type: "ahorros",
  number: "2200123456",
  holder: "May Pérez",
  idNumber: "0912345678",
};
const deuna: PaymentAccount = { id: "a2", bank: "Deuna", type: "celular", number: "099 123 4567", holder: "May Pérez", idNumber: "" };

function order(): Order {
  const NOW = "2026-10-25T20:00:00.000Z";
  const saved = saveProduct(
    startLive(emptyState(), "l1", NOW),
    { code: "V-014", name: "Vestido floral", price: 18, sizes: [{ size: "M", stock: 5 }], image: "", published: true, wholesalePrice: null, wholesaleMin: 6 },
    "p1",
  );
  if (!saved.ok) throw new Error(saved.error);
  const res = placeOrder(saved.value, { code: "V-014", size: "M", customer: "@karla", qty: 1 }, "o1", NOW);
  if (!res.ok) throw new Error(res.error);
  return res.value.order;
}

describe("datos de pago", () => {
  it("arma el bloque con una cuenta", () => {
    expect(paymentBlock([pichincha])).toBe(
      "*Datos para transferir:*\n*Banco Pichincha* · cuenta de ahorros\nN°: 2200123456\nTitular: May Pérez\nC.I./RUC: 0912345678",
    );
  });

  it("con varias cuentas pide elegir una y distingue el celular", () => {
    const text = paymentBlock([pichincha, deuna]);
    expect(text.startsWith("*Datos para transferir (elige una cuenta):*")).toBe(true);
    expect(text).toContain("*Deuna* · celular\nCelular: 099 123 4567\nTitular: May Pérez");
    expect(text).not.toContain("C.I./RUC: \n");
  });

  it("no agrega bloque si no hay cuentas", () => {
    expect(paymentBlock([])).toBe("");
  });

  it("incluye cuenta e instrucciones en el mensaje de cobro, en ese orden", () => {
    const msg = chargeMessage(undefined, "@karla", [order()], {
      paymentAccounts: [pichincha],
      paymentInstructions: "Envíame el comprobante.",
    });
    const total = msg.indexOf("Total: $18.00");
    const bank = msg.indexOf("*Banco Pichincha*");
    const note = msg.indexOf("Envíame el comprobante.");
    expect(total).toBeGreaterThan(-1);
    expect(bank).toBeGreaterThan(total);
    expect(note).toBeGreaterThan(bank);
  });

  it("sin cuentas ni instrucciones el mensaje no termina con líneas vacías", () => {
    const msg = chargeMessage(undefined, "@karla", [order()], { paymentAccounts: [], paymentInstructions: "  " });
    expect(msg.endsWith("Total: $18.00")).toBe(true);
  });

  it("valida cuentas incompletas", () => {
    expect(validateAccount(pichincha)).toBeNull();
    expect(validateAccount({ ...pichincha, bank: " " })).toBe("Falta el banco o la app en una de las cuentas.");
    expect(validateAccount({ ...pichincha, number: "" })).toBe("Falta el número en Banco Pichincha.");
    expect(validateAccount({ ...pichincha, holder: "" })).toBe("Falta el nombre del titular en Banco Pichincha.");
    expect(validateAccount({ ...deuna, number: "abc" })).toBe("El celular de Deuna solo puede tener números.");
    expect(validateAccount(deuna)).toBeNull();
  });

  it("datos guardados antes de esta función quedan sin cuentas", () => {
    expect(migrateState({ settings: { paymentInstructions: "x", whatsapp: "", liveSchedule: "", liveNotice: "" } as never }).settings.paymentAccounts).toEqual([]);
  });
});
