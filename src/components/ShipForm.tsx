"use client";

import { useState } from "react";
import { COURIER_LABEL, type Courier } from "@/lib/types";
import { useApp } from "./StoreProvider";

export function ShipForm({ orderIds, label = "Marcar enviado" }: { orderIds: string[]; label?: string }) {
  const { store, run } = useApp();
  const [courier, setCourier] = useState<Courier>("motorizado");
  const [tracking, setTracking] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Envío
          <select className="field" value={courier} onChange={(e) => setCourier(e.target.value as Courier)}>
            {Object.entries(COURIER_LABEL).map(([value, text]) => (
              <option key={value} value={value}>{text}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold">
          Guía (opcional)
          <input className="field" value={tracking} onChange={(e) => setTracking(e.target.value)} />
        </label>
        <button
          className="btn btn-p"
          onClick={async () =>
            setError(await run(store.advanceOrders(orderIds, { to: "enviado", courier, trackingCode: tracking })))
          }
        >
          {label}
        </button>
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-acc">{error}</p>}
    </div>
  );
}
