"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { ProductForm } from "./ProductForm";
import { useApp } from "./StoreProvider";

export function CatalogManager() {
  const { state, store, run } = useApp();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editingProduct = state.products.find((p) => p.id === editing);

  async function remove(id: string, code: string) {
    if (!window.confirm(`¿Borrar ${code} del catálogo? Los pedidos anteriores se conservan.`)) return;
    setError(await run(store.deleteProduct(id)));
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Catálogo</h1>
        {editing === null && (
          <button className="btn btn-p" onClick={() => setEditing("new")}>Nueva prenda</button>
        )}
      </div>

      {editing !== null && (
        <ProductForm
          key={editing}
          product={editing === "new" ? undefined : editingProduct}
          onDone={() => setEditing(null)}
        />
      )}
      {error && <p role="alert" className="text-sm text-acc">{error}</p>}

      {state.products.length === 0 ? (
        <p className="text-mut">Aún no hay prendas. Agrega la primera con su código y tallas.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {state.products.map((p) => (
            <li key={p.id} className="card">
              <div className="flex items-start gap-3">
                {p.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={`Foto de ${p.name}`} className="size-16 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <b className="block">{p.code}</b>
                  <span className="text-sm text-mut">{p.name}</span>
                </div>
                <b>{money(p.price)}</b>
              </div>
              <div className="flex flex-wrap gap-2">
                {!p.published && <span className="pill bg-[#ece6e9] text-mut">Oculta en la tienda</span>}
                {p.wholesalePrice !== null && (
                  <span className="pill bg-info-soft text-info">
                    Mayor: {money(p.wholesalePrice)} desde {p.wholesaleMin}
                  </span>
                )}
              </div>
              <p className="text-sm text-mut">
                {p.sizes.map((s) => `${s.size}: ${s.stock}`).join(" · ")}
              </p>
              <div className="flex gap-2">
                <button className="btn" onClick={() => setEditing(p.id)}>Editar</button>
                <button className="btn" onClick={() => remove(p.id, p.code)}>Borrar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
