"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { liveOrders, orderTotal, sumOrders } from "@/lib/orders";
import { useApp } from "./StoreProvider";

export function OrderList() {
  const { state, store, run } = useApp();
  const [error, setError] = useState<string | null>(null);
  const orders = liveOrders(state);

  async function cancel(id: string, label: string) {
    if (!window.confirm(`¿Cancelar el pedido ${label}? El stock vuelve al inventario.`)) return;
    setError(await run(store.cancelOrder(id)));
  }

  return (
    <section className="card" aria-labelledby="pedidos">
      <h2 id="pedidos" className="text-base font-bold">Pedidos del live</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-mut">Todavía no hay pedidos en este live.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[460px] border-collapse">
              <thead>
                <tr className="text-left text-xs font-semibold text-mut">
                  <th className="border-b border-line p-2">#</th>
                  <th className="border-b border-line p-2">Clienta</th>
                  <th className="border-b border-line p-2">Prenda</th>
                  <th className="border-b border-line p-2">Total</th>
                  <th className="border-b border-line p-2"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="border-b border-line p-2">{String(o.number).padStart(3, "0")}</td>
                    <td className="border-b border-line p-2">{o.customer}</td>
                    <td className="border-b border-line p-2">{o.code} · {o.size} × {o.qty}</td>
                    <td className="border-b border-line p-2">{money(orderTotal(o))}</td>
                    <td className="border-b border-line p-2 text-right">
                      <button className="btn" onClick={() => cancel(o.id, `#${o.number}`)}>Cancelar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 sm:hidden">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3">
                <div className="min-w-0">
                  <b className="block truncate">#{String(o.number).padStart(3, "0")} · {o.customer}</b>
                  <small className="text-xs text-mut">{o.code} · {o.size} × {o.qty} · {money(orderTotal(o))}</small>
                </div>
                <button className="btn shrink-0" onClick={() => cancel(o.id, `#${o.number}`)}>Cancelar</button>
              </li>
            ))}
          </ul>
          <p className="text-right font-bold">Total del live: {money(sumOrders(orders))}</p>
        </>
      )}
      {error && <p role="alert" className="text-sm text-acc">{error}</p>}
    </section>
  );
}
