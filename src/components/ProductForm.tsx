"use client";

import { useState } from "react";
import { resizeImage } from "@/lib/image";
import { SIZE_OPTIONS, type Product } from "@/lib/types";
import { useApp } from "./StoreProvider";

type Props = { product?: Product; onDone: () => void };

export function ProductForm({ product, onDone }: Props) {
  const { store, run } = useApp();
  const [code, setCode] = useState(product?.code ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [wholesalePrice, setWholesalePrice] = useState(
    product?.wholesalePrice != null ? String(product.wholesalePrice) : "",
  );
  const [wholesaleMin, setWholesaleMin] = useState(String(product?.wholesaleMin ?? 6));
  const [published, setPublished] = useState(product?.published ?? true);
  const [image, setImage] = useState(product?.image ?? "");
  const [uploading, setUploading] = useState(false);
  const [stock, setStock] = useState<Record<string, string>>(
    Object.fromEntries((product?.sizes ?? []).map((s) => [s.size, String(s.stock)])),
  );
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await store.uploadImage(await resizeImage(file));
      if (res.ok) setImage(res.value);
      else setError(res.error);
    } catch {
      setError("No se pudo procesar la foto. Prueba con otra imagen.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const sizes = SIZE_OPTIONS.filter((s) => stock[s]?.trim() !== undefined && stock[s].trim() !== "").map(
      (s) => ({ size: s as string, stock: Number(stock[s]) }),
    );
    const err = await run(
      store.saveProduct({
        id: product?.id,
        code,
        name,
        price: Number(price),
        sizes,
        image,
        published,
        wholesalePrice: wholesalePrice.trim() === "" ? null : Number(wholesalePrice),
        wholesaleMin: Number(wholesaleMin),
      }),
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
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Precio por mayor (opcional)
          <input className="field" inputMode="decimal" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Desde cuántas unidades
          <input className="field" inputMode="numeric" value={wholesaleMin} onChange={(e) => setWholesaleMin(e.target.value)} />
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

      <div className="flex flex-wrap items-center gap-4">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={`Foto de ${name || "la prenda"}`} className="size-24 rounded-xl border border-line object-cover" />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-xl border border-dashed border-[#cdbfc5] text-xs text-mut">Sin foto</div>
        )}
        <div className="flex flex-col gap-2">
          <label className="btn cursor-pointer">
            {uploading ? "Subiendo…" : image ? "Cambiar foto" : "Subir foto"}
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => void pickPhoto(e.target.files?.[0])}
            />
          </label>
          {image && (
            <button type="button" className="btn" onClick={() => setImage("")}>Quitar foto</button>
          )}
        </div>
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="size-5 accent-acc" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Mostrar en la tienda pública
      </label>

      {error && <p role="alert" className="text-sm font-semibold text-acc">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-p" type="submit" disabled={uploading}>Guardar</button>
        <button className="btn" type="button" onClick={onDone}>Cancelar</button>
      </div>
    </form>
  );
}
