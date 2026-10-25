"use client";

import { useState } from "react";
import { chargeMessage, findCustomer, groupByCustomer, whatsappNumber, whatsappUrl } from "@/lib/fulfillment";
import { money } from "@/lib/format";
import { CustomerForm } from "./CustomerForm";
import { PayForm } from "./PayForm";
import { useApp } from "./StoreProvider";

export function Collections() {
  const { state, store, run } = useApp();
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState(state.settings.paymentInstructions);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = groupByCustomer(state.orders.filter((o) => o.status === "pendiente"));
  const pendingTotal = groups.reduce((sum, g) => sum + g.total, 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-bold">Cobros</h1>
        <p className="text-sm text-mut">Por cobrar: <b className="text-ink">{money(pendingTotal)}</b></p>
      </div>

      <section className="card">
        <h2 className="text-base font-bold">Mensaje de cobro</h2>
        <p className="text-sm text-mut">Este texto se agrega al final de cada mensaje. Puedes poner tus datos de pago.</p>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Instrucciones de pago
          <textarea
            className="field min-h-24 py-2"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            className="btn"
            onClick={async () => {
              const err = await run(store.saveSettings({ ...state.settings, paymentInstructions: text }));
              setError(err);
              setSaved(!err);
            }}
          >
            Guardar mensaje
          </button>
          {saved && <span role="status" className="text-sm text-ok">Guardado</span>}
          {error && <span role="alert" className="text-sm font-semibold text-acc">{error}</span>}
        </div>
      </section>

      {groups.length === 0 ? (
        <p className="text-mut">No hay pedidos por cobrar. Los pedidos nuevos del live aparecen aquí.</p>
      ) : (
        groups.map((g) => {
          const customer = findCustomer(state, g.handle);
          const message = chargeMessage(customer, g.handle, g.orders, state.settings.paymentInstructions);
          const hasPhone = Boolean(customer && whatsappNumber(customer.phone));
          return (
            <section key={g.handle} className="card" aria-label={`Cobro de ${g.handle}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold">{customer?.name || g.handle}</h2>
                  <p className="text-xs text-mut">{g.handle}{customer?.phone && ` · ${customer.phone}`}</p>
                </div>
                <b>{money(g.total)}</b>
              </div>
              <ul className="text-sm">
                {g.orders.map((o) => (
                  <li key={o.id} className="flex justify-between gap-2 border-b border-line py-1.5 last:border-0">
                    <span>#{o.number} · {o.code} {o.productName} · {o.size} × {o.qty}</span>
                    <span>{money(o.qty * o.unitPrice)}</span>
                  </li>
                ))}
              </ul>
              <p className="rounded-xl bg-ok-soft p-3 text-sm leading-relaxed whitespace-pre-line">{message}</p>
              {!hasPhone && (
                <p className="text-xs text-warn">
                  Falta un teléfono válido. WhatsApp se abrirá para que elijas el contacto.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-p" href={whatsappUrl(customer?.phone ?? "", message)} target="_blank" rel="noopener noreferrer">
                  Enviar cobro por WhatsApp
                </a>
                <button className="btn" onClick={() => setEditing(editing === g.handle ? null : g.handle)} aria-expanded={editing === g.handle}>
                  {editing === g.handle ? "Cerrar datos" : "Datos de la clienta"}
                </button>
              </div>
              {editing === g.handle && <CustomerForm handle={g.handle} onDone={() => setEditing(null)} />}
              <PayForm orderIds={g.orders.map((o) => o.id)} label="Marcar todo pagado" />
            </section>
          );
        })
      )}
    </div>
  );
}
