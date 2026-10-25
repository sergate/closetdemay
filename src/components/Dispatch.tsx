"use client";

import { useState } from "react";
import { findCustomer, groupByCustomer, type CustomerGroup } from "@/lib/fulfillment";
import { ShipForm } from "./ShipForm";
import { useApp } from "./StoreProvider";

export function Dispatch() {
  const { state, store, run } = useApp();
  const [error, setError] = useState<string | null>(null);

  const toPack = groupByCustomer(state.orders.filter((o) => o.status === "pagado"));
  const toShip = groupByCustomer(state.orders.filter((o) => o.status === "empacado"));

  const who = (g: CustomerGroup) => findCustomer(state, g.handle)?.name || g.handle;
  const items = (g: CustomerGroup) =>
    g.orders.map((o) => `${o.code} ${o.productName} · ${o.size} × ${o.qty}`);

  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col gap-5 print:hidden">
        <h1 className="text-2xl font-bold">Despachos</h1>
        {error && <p role="alert" className="text-sm font-semibold text-acc">{error}</p>}

        <section className="flex flex-col gap-3" aria-labelledby="empacar">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="empacar" className="text-lg font-bold">Para empacar ({toPack.length})</h2>
            {toPack.length > 0 && (
              <button
                className="btn"
                onClick={async () =>
                  setError(await run(store.advanceOrders(toPack.flatMap((g) => g.orders.map((o) => o.id)), { to: "empacado" })))
                }
              >
                Marcar todo empacado
              </button>
            )}
          </div>
          {toPack.length === 0 && <p className="text-sm text-mut">No hay pedidos pagados esperando empaque.</p>}
          {toPack.map((g) => (
            <article key={g.handle} className="card">
              <b>{who(g)} <span className="text-xs font-normal text-mut">{g.handle}</span></b>
              <ul className="text-sm">
                {items(g).map((line) => <li key={line}>{line}</li>)}
              </ul>
              <button
                className="btn"
                onClick={async () => setError(await run(store.advanceOrders(g.orders.map((o) => o.id), { to: "empacado" })))}
              >
                Marcar empacado
              </button>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="enviar">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="enviar" className="text-lg font-bold">Para enviar ({toShip.length})</h2>
            {toShip.length > 0 && (
              <button className="btn" onClick={() => window.print()}>Imprimir etiquetas</button>
            )}
          </div>
          {toShip.length === 0 && <p className="text-sm text-mut">No hay pedidos empacados esperando envío.</p>}
          {toShip.map((g) => {
            const c = findCustomer(state, g.handle);
            return (
              <article key={g.handle} className="card">
                <b>{who(g)} <span className="text-xs font-normal text-mut">{g.handle}</span></b>
                <p className="text-sm text-mut">
                  {c?.city || c?.address ? [c?.city, c?.address].filter(Boolean).join(" · ") : "Falta ciudad y dirección (complétalas en Cobros o en el pedido)."}
                </p>
                <ul className="text-sm">
                  {items(g).map((line) => <li key={line}>{line}</li>)}
                </ul>
                <ShipForm orderIds={g.orders.map((o) => o.id)} />
              </article>
            );
          })}
        </section>
      </div>

      <div className="hidden print:block" aria-hidden="true">
        {toShip.map((g) => {
          const c = findCustomer(state, g.handle);
          return (
            <div key={g.handle} className="mb-4 break-inside-avoid rounded border-2 border-black p-4 text-black">
              <p className="text-xs uppercase">El Closet de May · Pedido {g.orders.map((o) => `#${o.number}`).join(", ")}</p>
              <p className="text-xl font-bold">{c?.name || g.handle}</p>
              <p>{g.handle}{c?.phone && ` · Tel. ${c.phone}`}</p>
              <p>{[c?.city, c?.address].filter(Boolean).join(" · ") || "Falta dirección"}</p>
              <ul className="mt-2 border-t border-black pt-2 text-sm">
                {items(g).map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </>
  );
}
