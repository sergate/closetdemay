"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { emptyState } from "@/lib/orders";
import { createLocalStore, type Store } from "@/lib/store";
import { createSupabaseClient, createSupabaseStore } from "@/lib/supabaseStore";
import type { Result, State } from "@/lib/types";
import { Login } from "./Login";

type App = {
  state: State;
  store: Store;
  /** Ejecuta una acción y devuelve un mensaje de error si falló. */
  run: (action: Promise<Result<unknown>>) => Promise<string | null>;
  signOut: (() => Promise<void>) | null;
};

const AppContext = createContext<App | null>(null);

export function useApp(): App {
  const app = useContext(AppContext);
  if (!app) throw new Error("useApp debe usarse dentro de StoreProvider");
  return app;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SupabaseClient | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [state, setState] = useState<State>(emptyState());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (SUPABASE_URL && SUPABASE_KEY) {
      const client = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY);
      setDb(client);
      client.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
      const { data } = client.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
      return () => data.subscription.unsubscribe();
    }
    setStore(createLocalStore());
    setSignedIn(true);
  }, []);

  useEffect(() => {
    if (db && signedIn) setStore(createSupabaseStore(db));
    if (db && signedIn === false) setStore(null);
  }, [db, signedIn]);

  const refresh = useCallback(async (s: Store) => {
    try {
      setState(await s.load());
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
    }
  }, []);

  useEffect(() => {
    if (!store) return;
    void refresh(store);
    return store.subscribe(() => void refresh(store));
  }, [store, refresh]);

  const value = useMemo<App | null>(() => {
    if (!store) return null;
    return {
      state,
      store,
      run: async (action) => {
        const res = await action;
        if (!res.ok) return res.error;
        await refresh(store);
        return null;
      },
      signOut: db ? async () => void (await db.auth.signOut()) : null,
    };
  }, [store, state, db, refresh]);

  if (signedIn === null) return <p className="p-6 text-mut">Cargando…</p>;
  if (db && !signedIn) return <Login db={db} />;
  if (loadError) {
    return (
      <div className="p-6">
        <p className="font-semibold text-acc">No se pudieron cargar los datos.</p>
        <p className="text-mut">{loadError}</p>
      </div>
    );
  }
  if (!value) return <p className="p-6 text-mut">Cargando…</p>;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
