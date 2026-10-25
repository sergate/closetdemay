"use client";

import { LOW_STOCK_LIMIT, lowStock } from "@/lib/orders";
import { useApp } from "./StoreProvider";

export function LowStock() {
  const { state } = useApp();
  const items = lowStock(state.products);

  return (
    <section className="card" aria-labelledby="poco-stock">
      <h2 id="poco-stock" className="text-base font-bold">Poco stock</h2>
      {items.length === 0 ? (
        <p className="text-sm text-mut">Sin alertas: todas las tallas tienen más de {LOW_STOCK_LIMIT} unidades.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((i) => (
            <li key={`${i.code}-${i.size}`} className="pill bg-warn-soft text-warn">
              {i.code} talla {i.size} · {i.stock === 0 ? "agotado" : `quedan ${i.stock}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
