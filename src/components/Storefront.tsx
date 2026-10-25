"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { Logo } from "./Logo";
import { loadPublicCatalog } from "@/lib/publicCatalog";
import { availableSizes, matchesSearch, orderLink, type PublicCatalog, type PublicProduct } from "@/lib/storefront";

export function Storefront() {
  const [catalog, setCatalog] = useState<PublicCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [wholesale, setWholesale] = useState(false);

  useEffect(() => {
    loadPublicCatalog().then(setCatalog, (e: unknown) =>
      setError(e instanceof Error ? e.message : "No se pudo cargar la tienda."),
    );
  }, []);

  const products = (catalog?.products ?? []).filter((p) => matchesSearch(p, query));
  const hasWholesale = (catalog?.products ?? []).some((p) => p.wholesalePrice !== null);

  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4">
          <h1 className="flex items-center gap-3 text-xl font-bold text-acc">
            <Logo size={48} />
            El Closet de May
          </h1>
          {catalog?.liveSchedule && (
            <p className="rounded-xl bg-acc-soft px-3 py-2 text-sm">
              <b className="text-acc">Próximo live:</b> {catalog.liveSchedule}
            </p>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-48 flex-1">
            <span className="sr-only">Buscar prenda</span>
            <input className="field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar prenda" />
          </label>
          {hasWholesale && (
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-5 accent-acc" checked={wholesale} onChange={(e) => setWholesale(e.target.checked)} />
              Ver precios por mayor
            </label>
          )}
        </div>

        {error && <p role="alert" className="font-semibold text-acc">{error}</p>}
        {!catalog && !error && <p className="text-mut">Cargando prendas…</p>}
        {catalog && products.length === 0 && (
          <p className="text-mut">{query ? "No encontramos prendas con esa búsqueda." : "Pronto subiremos prendas nuevas. Síguenos en TikTok."}</p>
        )}

        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.code} product={p} whatsapp={catalog?.whatsapp ?? ""} wholesale={wholesale} />
          ))}
        </ul>
      </main>
    </>
  );
}

function ProductCard({ product: p, whatsapp, wholesale }: { product: PublicProduct; whatsapp: string; wholesale: boolean }) {
  const sizes = availableSizes(p);
  const [size, setSize] = useState(sizes[0]?.size ?? "");
  const link = size ? orderLink(whatsapp, p, size, wholesale && p.wholesalePrice !== null) : null;
  const showWholesale = wholesale && p.wholesalePrice !== null;

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line bg-white p-2">
      {p.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.image} alt={p.name} className="aspect-square w-full rounded-lg object-cover" />
      ) : (
        <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-[#edd9e0] text-xs font-semibold text-[#6b3a50]">Sin foto</div>
      )}
      <div className="flex flex-col gap-0.5 px-1">
        <b className="text-sm">{p.name}</b>
        <span className="text-xs text-mut">{p.code}</span>
        {showWholesale ? (
          <span className="font-bold">
            {money(p.wholesalePrice!)} <span className="text-xs font-normal text-mut">c/u desde {p.wholesaleMin}</span>
          </span>
        ) : (
          <span className="font-bold">{money(p.price)}</span>
        )}
      </div>
      {sizes.length === 0 ? (
        <p className="px-1 text-sm font-semibold text-warn">Agotado</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 px-1" role="group" aria-label={`Tallas de ${p.name}`}>
            {sizes.map((s) => (
              <button
                key={s.size}
                type="button"
                aria-pressed={size === s.size}
                onClick={() => setSize(s.size)}
                className={`min-h-11 min-w-11 rounded-lg border px-2 text-sm font-semibold ${size === s.size ? "border-acc bg-acc-soft text-acc" : "border-line bg-white"}`}
              >
                {s.size}
              </button>
            ))}
          </div>
          {link ? (
            <a className="btn btn-ok text-sm" href={link} target="_blank" rel="noopener noreferrer">
              Pedir por WhatsApp
            </a>
          ) : (
            <p className="px-1 text-xs text-mut">Escríbenos por TikTok para pedir esta prenda.</p>
          )}
        </>
      )}
    </li>
  );
}
