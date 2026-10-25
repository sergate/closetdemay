"use client";

import { useState } from "react";
import { findCustomer } from "@/lib/fulfillment";
import { useApp } from "./StoreProvider";

export function CustomerForm({ handle, onDone }: { handle: string; onDone?: () => void }) {
  const { state, store, run } = useApp();
  const current = findCustomer(state, handle);
  const [name, setName] = useState(current?.name ?? "");
  const [phone, setPhone] = useState(current?.phone ?? "");
  const [city, setCity] = useState(current?.city ?? "");
  const [address, setAddress] = useState(current?.address ?? "");
  const [wholesale, setWholesale] = useState(current?.wholesale ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = await run(store.saveCustomer({ handle, name, phone, city, address, wholesale }));
    setError(err);
    setSaved(!err);
    if (!err) onDone?.();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" aria-label={`Datos de ${handle}`}>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
          Nombre
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
          WhatsApp
          <input className="field" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="099 123 4567" />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
          Ciudad
          <input className="field" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
          Dirección
          <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="size-5 accent-acc" checked={wholesale} onChange={(e) => setWholesale(e.target.checked)} />
        Compra por mayor (se le aplica el precio mayorista)
      </label>
      <div className="flex items-center gap-3">
        <button className="btn" type="submit">Guardar datos</button>
        {saved && <span role="status" className="text-sm text-ok">Guardado</span>}
        {error && <span role="alert" className="text-sm font-semibold text-acc">{error}</span>}
      </div>
    </form>
  );
}
