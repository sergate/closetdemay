"use client";

import { useEffect, useState } from "react";
import { clock } from "@/lib/format";
import { isLiveActive, liveOrders } from "@/lib/orders";
import { useApp } from "./StoreProvider";

export function LiveHeader() {
  const { state, store, run } = useApp();
  const active = isLiveActive(state);
  const [tick, setTick] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const count = liveOrders(state).length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">Live de hoy</h1>
        <p className="text-xs text-mut">
          {state.live ? `${count} pedido${count === 1 ? "" : "s"} registrado${count === 1 ? "" : "s"}` : "Todavía no empieza"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {active && state.live && (
          <span className="pill bg-acc-soft text-acc" role="timer" aria-label="Tiempo en vivo">
            En vivo · {clock(state.live.startedAt, tick)}
          </span>
        )}
        {active ? (
          <button
            className="btn"
            onClick={async () => {
              if (window.confirm("¿Terminar el live?")) setError(await run(store.endLive()));
            }}
          >
            Terminar live
          </button>
        ) : (
          <button className="btn btn-p" onClick={async () => setError(await run(store.startLive()))}>
            {state.live ? "Iniciar otro live" : "Iniciar live"}
          </button>
        )}
      </div>
      {error && <p role="alert" className="w-full text-sm text-acc">{error}</p>}
    </div>
  );
}
