"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";
import { orderTotal } from "@/lib/orders";
import { STATUS_LABEL, type Order, type OrderStatus } from "@/lib/types";
import { StatusPill } from "./StatusPill";
import { useApp } from "./StoreProvider";

const COLUMNS: OrderStatus[] = ["pendiente", "pagado", "empacado", "enviado"];
const FILTERS: (OrderStatus | "todos")[] = ["todos", ...COLUMNS, "entregado"];

export function OrdersBoard() {
  const { state, store, run } = useApp();
  const [filter, setFilter] = useState<OrderStatus | "todos">("todos");
  const [error, setError] = useState<string | null>(null);

  const byStatus = (s: OrderStatus) => state.orders.filter((o) => o.status === s);
  const shown: OrderStatus[] = filter === "todos" ? COLUMNS : [filter];

  function action(o: Order) {
    switch (o.status) {
      case "pendiente":
        return <Link className="btn btn-p w-full" href="/cobros">Cobrar</Link>;
      case "pagado":
        return (
          <button className="btn w-full" onClick={async () => setError(await run(store.advanceOrders([o.id], { to: "empacado" })))}>
            Marcar empacado
          </button>
        );
      case "empacado":
        return <Link className="btn w-full" href="/despachos">Despachar</Link>;
      case "enviado":
        return (
          <button className="btn w-full" onClick={async () => setError(await run(store.advanceOrders([o.id], { to: "entregado" })))}>
            Marcar entregado
          </button>
        );
      default:
        return null;
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Pedidos</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {FILTERS.map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${filter === f ? "border-acc bg-acc text-white" : "border-line bg-white"}`}
          >
            {f === "todos" ? "Todos" : `${STATUS_LABEL[f]} (${byStatus(f).length})`}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-acc">{error}</p>}

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
        {shown.map((s) => (
          <section key={s} aria-label={STATUS_LABEL[s]} className="flex min-w-0 flex-col gap-2.5 rounded-[14px] bg-[#f3ebee] p-3">
            <h2 className="flex items-center justify-between text-sm font-bold">
              {STATUS_LABEL[s]} <StatusPill status={s} />
            </h2>
            {byStatus(s).length === 0 ? (
              <p className="text-sm text-mut">Sin pedidos.</p>
            ) : (
              byStatus(s)
                .sort((a, b) => b.number - a.number)
                .map((o) => (
                  <article key={o.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
                    <Link href={`/pedidos/${o.id}`} className="font-bold hover:underline">
                      #{String(o.number).padStart(3, "0")} · {o.customer}
                    </Link>
                    <p className="text-xs text-mut">{o.code} · {o.size} × {o.qty} · {money(orderTotal(o))}</p>
                    {action(o)}
                  </article>
                ))
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
