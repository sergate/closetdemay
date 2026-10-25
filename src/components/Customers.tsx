"use client";

import { useState } from "react";
import { whatsappNumber, whatsappUrl } from "@/lib/fulfillment";
import { money } from "@/lib/format";
import { customerStats, liveNoticeMessage, type CustomerKind } from "@/lib/reports";
import { CustomerForm } from "./CustomerForm";
import { useApp } from "./StoreProvider";

const KIND_LABEL: Record<CustomerKind, string> = { nueva: "Nueva", frecuente: "Frecuente", mayorista: "Mayorista" };
const KIND_STYLE: Record<CustomerKind, string> = {
  nueva: "bg-acc-soft text-acc",
  frecuente: "bg-ok-soft text-ok",
  mayorista: "bg-info-soft text-info",
};
const FILTERS: (CustomerKind | "todas")[] = ["todas", "frecuente", "nueva", "mayorista"];

export function Customers() {
  const { state, store, run } = useApp();
  const [filter, setFilter] = useState<CustomerKind | "todas">("todas");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [schedule, setSchedule] = useState(state.settings.liveSchedule);
  const [notice, setNotice] = useState(state.settings.liveNotice);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notified, setNotified] = useState<Set<string>>(new Set());

  const all = customerStats(state);
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (c) =>
      (filter === "todas" || c.kind === filter) &&
      (!q || c.handle.toLowerCase().includes(q) || c.customer?.name.toLowerCase().includes(q)),
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <h1 className="text-2xl font-bold">Clientas</h1>

      <section className="card" aria-labelledby="aviso">
        <h2 id="aviso" className="text-base font-bold">Avisar del próximo live</h2>
        <p className="text-sm text-mut">
          WhatsApp no permite enviar a todas a la vez: cada clienta tiene su botón con el mensaje listo.
          Usa <code>{"{nombre}"}</code> y <code>{"{horario}"}</code> en el texto.
        </p>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Próximo live
          <input className="field" value={schedule} onChange={(e) => { setSchedule(e.target.value); setSaved(false); }} placeholder="Jueves 8:00 pm" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Mensaje
          <textarea className="field min-h-24 py-2" value={notice} onChange={(e) => { setNotice(e.target.value); setSaved(false); }} />
        </label>
        <div className="flex items-center gap-3">
          <button
            className="btn"
            onClick={async () => {
              const err = await run(store.saveSettings({ ...state.settings, liveSchedule: schedule, liveNotice: notice }));
              setError(err);
              setSaved(!err);
            }}
          >
            Guardar aviso
          </button>
          {saved && <span role="status" className="text-sm text-ok">Guardado</span>}
          {error && <span role="alert" className="text-sm font-semibold text-acc">{error}</span>}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar clientas">
        {FILTERS.map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${filter === f ? "border-acc bg-acc text-white" : "border-line bg-white"}`}
          >
            {f === "todas" ? `Todas (${all.length})` : `${KIND_LABEL[f]}s (${all.filter((c) => c.kind === f).length})`}
          </button>
        ))}
        <label className="ml-auto flex min-w-48 flex-1 sm:flex-none">
          <span className="sr-only">Buscar clienta</span>
          <input className="field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre o usuario" />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="text-mut">
          {all.length === 0 ? "Aún no hay clientas. Aparecen aquí cuando registres pedidos." : "Ninguna clienta coincide con el filtro."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((c) => {
            const phone = c.customer?.phone ?? "";
            const valid = Boolean(whatsappNumber(phone));
            const message = liveNoticeMessage(notice, c.customer, c.handle, schedule);
            return (
              <li key={c.handle} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <b className="block truncate">{c.customer?.name || c.handle}</b>
                    <span className="text-xs text-mut">{c.handle}{phone && ` · ${phone}`}</span>
                  </div>
                  <span className={`pill ${KIND_STYLE[c.kind]}`}>{KIND_LABEL[c.kind]}</span>
                </div>
                <p className="text-sm text-mut">
                  {c.orders} pedido{c.orders === 1 ? "" : "s"} · {money(c.total)}
                  {c.lastOrderAt && ` · último ${new Date(c.lastOrderAt).toLocaleDateString("es-EC")}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {valid ? (
                    <a
                      className={`btn ${notified.has(c.handle) ? "" : "btn-p"}`}
                      href={whatsappUrl(phone, message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setNotified(new Set(notified).add(c.handle))}
                    >
                      {notified.has(c.handle) ? "Avisada ✓" : "Avisar del live"}
                    </a>
                  ) : (
                    <span className="self-center text-xs text-warn">Falta WhatsApp para avisarle</span>
                  )}
                  <button className="btn" aria-expanded={editing === c.handle} onClick={() => setEditing(editing === c.handle ? null : c.handle)}>
                    {editing === c.handle ? "Cerrar" : "Editar datos"}
                  </button>
                </div>
                {editing === c.handle && <CustomerForm handle={c.handle} onDone={() => setEditing(null)} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
