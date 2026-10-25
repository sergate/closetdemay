"use client";

import { useRef, useState } from "react";
import { findProduct, isLiveActive } from "@/lib/orders";
import { useApp } from "./StoreProvider";

export function OrderForm() {
  const { state, store, run } = useApp();
  const [code, setCode] = useState("");
  const [size, setSize] = useState("");
  const [customer, setCustomer] = useState("");
  const [qty, setQty] = useState("1");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const customerRef = useRef<HTMLInputElement>(null);

  const active = isLiveActive(state);
  const product = findProduct(state, code);

  function pick(nextCode: string) {
    setCode(nextCode);
    const p = findProduct(state, nextCode);
    setSize(p?.sizes.find((s) => s.size === size)?.size ?? p?.sizes[0]?.size ?? "");
    setMessage(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await store.placeOrder({
      code,
      size,
      customer,
      qty: Number.parseInt(qty, 10),
    });
    if (!res.ok) {
      setMessage({ text: res.error, error: true });
      return;
    }
    await run(Promise.resolve(res));
    setMessage({
      text: `Pedido #${res.value.number} registrado para ${res.value.customer}.`,
      error: false,
    });
    setCustomer("");
    setQty("1");
    customerRef.current?.focus();
  }

  return (
    <section className="card" aria-labelledby="registrar">
      <h2 id="registrar" className="text-base font-bold">Registrar pedido</h2>

      {state.products.length === 0 ? (
        <p className="text-sm text-mut">
          Primero agrega prendas en el <a className="font-semibold text-acc underline" href="/catalogo">catálogo</a>.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Prendas del catálogo">
          {state.products.map((p) => {
            const total = p.sizes.reduce((n, s) => n + s.stock, 0);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => pick(p.code)}
                aria-pressed={product?.id === p.id}
                className={`min-h-11 rounded-[10px] border px-3.5 text-left ${product?.id === p.id ? "border-acc bg-acc-soft" : "border-line bg-white"}`}
              >
                <b className="block text-sm">{p.code}</b>
                <span className="text-xs text-mut">{p.name} · {total} en stock</span>
              </button>
            );
          })}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Código
            <input className="field" value={code} onChange={(e) => pick(e.target.value)} autoCapitalize="characters" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Talla
            <select className="field" value={size} onChange={(e) => setSize(e.target.value)} disabled={!product}>
              {product?.sizes.map((s) => (
                <option key={s.size} value={s.size}>
                  {s.size} ({s.stock})
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
            Usuario de TikTok
            <input
              ref={customerRef}
              className="field"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="@usuario"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>
          <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
            Cantidad
            <input className="field" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
        </div>
        <button className="btn btn-p min-h-[52px] text-base" type="submit" disabled={!active}>
          Agregar pedido
        </button>
        {!active && <p className="text-xs text-mut">Inicia el live para registrar pedidos.</p>}
        <p role="status" className={`min-h-5 text-sm ${message?.error ? "font-semibold text-acc" : "text-ok"}`}>
          {message?.text}
        </p>
      </form>
    </section>
  );
}
