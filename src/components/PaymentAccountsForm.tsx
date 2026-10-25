"use client";

import { useState } from "react";
import { paymentBlock, validateAccount } from "@/lib/fulfillment";
import { ACCOUNT_TYPE_LABEL, type AccountType, type PaymentAccount } from "@/lib/types";
import { useApp } from "./StoreProvider";

const BANKS = [
  "Banco Pichincha",
  "Banco del Pacífico",
  "Banco de Guayaquil",
  "Produbanco",
  "Banco Bolivariano",
  "Banco Internacional",
  "Banco del Austro",
  "Cooperativa JEP",
  "Deuna",
];

const blank = (): PaymentAccount => ({
  id: crypto.randomUUID(),
  bank: "",
  type: "ahorros",
  number: "",
  holder: "",
  idNumber: "",
});

export function PaymentAccountsForm() {
  const { state, store, run } = useApp();
  const [accounts, setAccounts] = useState<PaymentAccount[]>(state.settings.paymentAccounts);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, patch: Partial<PaymentAccount>) => {
    setAccounts(accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    setSaved(false);
  };
  const ready = accounts.filter((a) => validateAccount(a) === null);

  async function save() {
    const problem = accounts.map(validateAccount).find(Boolean);
    if (problem) {
      setError(problem);
      setSaved(false);
      return;
    }
    const clean = accounts.map((a) => ({
      ...a,
      bank: a.bank.trim(),
      number: a.number.trim(),
      holder: a.holder.trim(),
      idNumber: a.idNumber.trim(),
    }));
    const err = await run(store.saveSettings({ ...state.settings, paymentAccounts: clean }));
    setError(err);
    setSaved(!err);
  }

  return (
    <section className="card" aria-labelledby="datos-pago">
      <h2 id="datos-pago" className="text-base font-bold">Datos para recibir pagos</h2>
      <p className="text-sm text-mut">
        Aquí cargas las cuentas donde quieres que llegue el dinero. Salen solas en cada mensaje de cobro por WhatsApp.
        Solo las ves tú y quienes tengan acceso al panel: no aparecen en la tienda.
      </p>

      <datalist id="bancos">
        {BANKS.map((b) => <option key={b} value={b} />)}
      </datalist>

      {accounts.length === 0 && (
        <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">
          Todavía no hay cuentas. Sin ellas, tus mensajes de cobro no dicen dónde pagar.
        </p>
      )}

      {accounts.map((a, i) => (
        <fieldset key={a.id} className="flex flex-col gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-sm font-bold">Cuenta {i + 1}</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
              Banco o app
              <input className="field" list="bancos" value={a.bank} onChange={(e) => update(a.id, { bank: e.target.value })} placeholder="Banco Pichincha" autoComplete="off" />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
              Tipo
              <select className="field" value={a.type} onChange={(e) => update(a.id, { type: e.target.value as AccountType })}>
                {Object.entries(ACCOUNT_TYPE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
              {a.type === "celular" ? "Número de celular" : "Número de cuenta"}
              <input className="field" inputMode="numeric" value={a.number} onChange={(e) => update(a.id, { number: e.target.value })} autoComplete="off" />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold sm:col-span-1">
              Nombre del titular
              <input className="field" value={a.holder} onChange={(e) => update(a.id, { holder: e.target.value })} autoComplete="off" />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 text-sm font-semibold">
              Cédula o RUC (opcional)
              <input className="field" inputMode="numeric" value={a.idNumber} onChange={(e) => update(a.id, { idNumber: e.target.value })} autoComplete="off" />
            </label>
          </div>
          <button type="button" className="btn self-start" onClick={() => { setAccounts(accounts.filter((x) => x.id !== a.id)); setSaved(false); }}>
            Quitar cuenta {i + 1}
          </button>
        </fieldset>
      ))}

      <button type="button" className="btn self-start" onClick={() => { setAccounts([...accounts, blank()]); setSaved(false); }}>
        {accounts.length === 0 ? "Agregar cuenta" : "Agregar otra cuenta"}
      </button>

      {ready.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold">Así lo verá tu clienta en WhatsApp</p>
          <pre className="whitespace-pre-wrap rounded-xl bg-ok-soft p-3 text-sm leading-relaxed font-sans">{paymentBlock(ready)}</pre>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-p" onClick={save}>Guardar datos de pago</button>
        {saved && <span role="status" className="text-sm text-ok">Guardado</span>}
        {error && <span role="alert" className="text-sm font-semibold text-acc">{error}</span>}
      </div>
    </section>
  );
}
