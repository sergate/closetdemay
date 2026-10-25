"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Logo } from "./Logo";

export function Login({ db }: { db: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await db.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <Logo size={96} />
      <h1 className="text-2xl font-bold text-acc">El Closet de May</h1>
      {sent ? (
        <p>Te enviamos un enlace a <b>{email}</b>. Ábrelo desde este mismo dispositivo para entrar.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Correo
            <input
              className="field"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button className="btn btn-p" type="submit">Enviarme el enlace</button>
          {error && <p role="alert" className="text-sm text-acc">{error}</p>}
        </form>
      )}
    </main>
  );
}
