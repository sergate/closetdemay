"use client";

import { useState } from "react";
import { PAYMENT_LABEL, type PaymentMethod } from "@/lib/types";
import { useApp } from "./StoreProvider";

export function PayForm({ orderIds, label = "Marcar pagado" }: { orderIds: string[]; label?: string }) {
  const { store, run } = useApp();
  const [method, setMethod] = useState<PaymentMethod>("transferencia");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Forma de pago
          <select className="field" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_LABEL).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <button
          className="btn"
          onClick={async () => setError(await run(store.advanceOrders(orderIds, { to: "pagado", paymentMethod: method })))}
        >
          {label}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-acc">{error}</p>}
    </div>
  );
}
