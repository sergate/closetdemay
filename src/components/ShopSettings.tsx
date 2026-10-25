"use client";

import { useState } from "react";
import { whatsappNumber } from "@/lib/fulfillment";
import { useApp } from "./StoreProvider";

export function ShopSettings() {
  const { state, store, run } = useApp();
  const [whatsapp, setWhatsapp] = useState(state.settings.whatsapp);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Ajustes de la tienda</h1>
      <section className="card">
        <h2 className="text-base font-bold">WhatsApp del negocio</h2>
        <p className="text-sm text-mut">
          A este número llegan los pedidos que tus clientas hacen desde la tienda pública.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Número
          <input
            className="field"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => { setWhatsapp(e.target.value); setSaved(false); }}
            placeholder="099 123 4567 o +54 9 11 1234 5678"
          />
        </label>
        {whatsapp.trim() !== "" && !whatsappNumber(whatsapp) && (
          <p className="text-sm text-warn">Ese número no parece válido. Para Ecuador escribe 099 123 4567. Para otro país escríbelo con + y el código de país, por ejemplo +54 9 11 1234 5678.</p>
        )}
        <div className="flex items-center gap-3">
          <button
            className="btn btn-p"
            onClick={async () => {
              const err = await run(store.saveSettings({ ...state.settings, whatsapp: whatsapp.trim() }));
              setError(err);
              setSaved(!err);
            }}
          >
            Guardar
          </button>
          {saved && <span role="status" className="text-sm text-ok">Guardado</span>}
          {error && <span role="alert" className="text-sm font-semibold text-acc">{error}</span>}
        </div>
      </section>
      <section className="card">
        <h2 className="text-base font-bold">Tienda pública</h2>
        <p className="text-sm text-mut">Esta es la página que ven tus clientas. Solo muestra las prendas marcadas como visibles.</p>
        <a className="btn btn-p" href="/tienda" target="_blank" rel="noopener noreferrer">Abrir la tienda</a>
      </section>
    </div>
  );
}
