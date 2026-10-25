"use client";

import { useState } from "react";
import { SIZE_OPTIONS, type Product } from "@/lib/types";
import { useApp } from "./StoreProvider";

type Props = { product?: Product; onDone: () => void };

export function ProductForm({ product, onDone }: Props) {
  const { store, run } = useApp();
  const [code, setCode] = useState(product?.code ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [stock, setStock] = useState<Record<string, string>>(
    Object.fromEntries((product?.sizes ?? []).map((s) => [s.size, String(s.stock)])),
  );
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sizes = SIZE_OPTIONS.filter((s) => stock[s]?.trim() !== undefined && stock[s].trim() !== "").map(
      (s) => ({ size: s as string, stock: Number(stock[s]) }),
    );
    const err = await run(
      store.saveProduct({ id: product?.id, code, name, price: Number(price), sizes }),
    );
    if (err) setError(err);
    else onDone();
  }

  return (
    <form onSubmit={submit} className="card" aria-label={product ? "Editar prenda" : "Nueva prenda"}>
      <h2 className="text-base font-bold">{product ? `Editar ${product.code}` : "Nueva prenda"}</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Código
          <input className="field" value={code} onChange={(e) => setCode(e.target.value)} placeholder="V-014" autoCapitalize="characters" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Precio (USD)
          <input className="field" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </label>
        <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold">
          Nombre
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vestido floral" required />
        </label>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">Stock por talla (deja vacío si no la manejas)</legend>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {SIZE_OPTIONS.map((s) => (
            <label key={s} className="flex flex-col gap-1 text-xs font-semibold">
              {s}
              <input
                className="field"
                inputMode="numeric"
                value={stock[s] ?? ""}
                onChange={(e) => setStock({ ...stock, [s]: e.target.value })}
              />
            </label>
          ))}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm font-semibold text-acc">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-p" type="submit">Guardar</button>
        <button className="btn" type="button" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}
