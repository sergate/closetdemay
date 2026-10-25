"use client";

import { money } from "@/lib/format";
import { customerStats, salesByLive, soldOrders, topProducts, topSize, totals } from "@/lib/reports";
import { useApp } from "./StoreProvider";

export function Reports() {
  const { state } = useApp();
  const sold = soldOrders(state);
  const t = totals(sold);
  const lives = salesByLive(state, 7);
  const best = Math.max(1, ...lives.map((l) => l.total));
  const products = topProducts(sold);
  const size = topSize(sold);
  const clients = customerStats(state).filter((c) => c.orders > 0).slice(0, 5);

  if (sold.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="mt-3 text-mut">Todavía no hay ventas. Los reportes aparecen cuando registres pedidos en un live.</p>
      </div>
    );
  }

  const kpis = [
    { label: "Ventas", value: money(t.sales) },
    { label: "Pedidos", value: String(t.orders) },
    { label: "Ticket promedio", value: money(t.average) },
    { label: "Clientas que repiten", value: `${Math.round(t.repeatRate * 100)}%` },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Reportes</h1>
        <p className="text-xs text-mut">Todos los pedidos no cancelados.</p>
      </div>

      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[14px] border border-line bg-white p-4">
            <span className="block text-xs font-semibold text-mut">{k.label}</span>
            <b className="text-2xl">{k.value}</b>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="card min-w-0 flex-[1.4_1_360px]" aria-labelledby="por-live">
          <h2 id="por-live" className="text-base font-bold">Ventas por live</h2>
          {lives.length === 0 ? (
            <p className="text-sm text-mut">Sin lives todavía.</p>
          ) : (
            <ul className="flex h-48 items-end gap-2.5 border-b border-line">
              {lives.map((l) => (
                <li key={l.liveId} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1 text-center">
                  <span className="text-[11px] font-semibold">{money(l.total)}</span>
                  <div
                    className="mx-auto w-full max-w-20 rounded-t-md bg-acc"
                    style={{ height: `${Math.max(2, (l.total / best) * 75)}%` }}
                    role="img"
                    aria-label={`Live del ${new Date(l.startedAt).toLocaleDateString("es-EC")}: ${money(l.total)} en ${l.orders} pedidos`}
                  />
                </li>
              ))}
            </ul>
          )}
          <ul className="flex gap-2.5 text-center text-[11px] text-mut">
            {lives.map((l) => (
              <li key={l.liveId} className="flex-1">{new Date(l.startedAt).toLocaleDateString("es-EC", { day: "numeric", month: "short" })}</li>
            ))}
          </ul>
        </section>

        <section className="card min-w-0 flex-[1_1_260px]" aria-labelledby="top-prendas">
          <h2 id="top-prendas" className="text-base font-bold">Prendas que más venden</h2>
          <ol>
            {products.map((p) => (
              <li key={p.code} className="flex justify-between gap-2 border-b border-line py-2">
                <span className="min-w-0 truncate">{p.code} {p.name}</span>
                <b>{p.units}</b>
              </li>
            ))}
            {size && (
              <li className="flex justify-between gap-2 py-2">
                <span>Talla más pedida</span>
                <b>{size}</b>
              </li>
            )}
          </ol>
        </section>
      </div>

      <section className="card" aria-labelledby="mejores">
        <h2 id="mejores" className="text-base font-bold">Mejores clientas</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="text-left text-xs font-semibold text-mut">
                <th className="border-b border-line p-2">Clienta</th>
                <th className="border-b border-line p-2">Pedidos</th>
                <th className="border-b border-line p-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.handle}>
                  <td className="border-b border-line p-2">{c.customer?.name || c.handle}</td>
                  <td className="border-b border-line p-2">{c.orders}</td>
                  <td className="border-b border-line p-2">{money(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
