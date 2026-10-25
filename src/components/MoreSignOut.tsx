"use client";

import { useApp } from "./StoreProvider";

export function MoreSignOut() {
  const { signOut, store } = useApp();
  return (
    <div className="flex flex-col gap-2">
      {store.kind === "local" && (
        <p className="text-xs text-mut">Modo de prueba: los datos se guardan solo en este navegador.</p>
      )}
      {signOut && <button className="btn" onClick={() => void signOut()}>Cerrar sesión</button>}
    </div>
  );
}
