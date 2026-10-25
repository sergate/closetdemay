"use client";

import { useState } from "react";
import { LOW_STOCK_LIMIT } from "@/lib/orders";
import { useApp } from "./StoreProvider";

export function StockTable() {
  const { state, store, run } = useApp();
  const [error, setError] = useState<string | null>(null);

  async function adjust(id: string, size: string, delta: number) {
    setError(await run(store.adjustStock(id, size, delta)));
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Inventario</h1>
      {error && <p role="alert" className="text-sm text-acc">{error}</p>}
      {state.products.length === 0 ? (
        <p className="text-mut">No hay prendas todavía. Agrégalas en el catálogo.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {state.products.map((p) => (
            <li key={p.id} className="card">
              <div>
                <b>{p.code}</b> <span className="text-sm text-mut">{p.name}</span>
              </div>
              <ul className="flex flex-wrap gap-3">
                {p.sizes.map((s) => {
                  const low = s.stock <= LOW_STOCK_LIMIT;
                  return (
                    <li
                      key={s.size}
                      className={`flex items-center gap-2 rounded-xl border p-2 ${low ? "border-warn bg-warn-soft" : "border-line"}`}
                    >
                      <span className="w-10 text-sm font-semibold">{s.size}</span>
                      <button className="btn min-w-11 px-0" aria-label={`Quitar una unidad de ${p.code} talla ${s.size}`} onClick={() => adjust(p.id, s.size, -1)}>−</button>
                      <span className="w-8 text-center font-bold" aria-label={`Stock de ${p.code} talla ${s.size}`}>{s.stock}</span>
                      <button className="btn min-w-11 px-0" aria-label={`Agregar una unidad de ${p.code} talla ${s.size}`} onClick={() => adjust(p.id, s.size, 1)}>+</button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
