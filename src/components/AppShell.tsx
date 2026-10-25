"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "./StoreProvider";

const LINKS = [
  { href: "/vivo", label: "En vivo" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/cobros", label: "Cobros" },
  { href: "/despachos", label: "Despachos" },
  { href: "/catalogo", label: "Catálogo" },
  { href: "/inventario", label: "Inventario" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { store, signOut } = useApp();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col gap-5 border-r border-line bg-white p-4 md:flex print:hidden">
        <div className="text-lg font-bold leading-tight text-acc">
          El Closet de May
          <small className="block text-xs font-medium text-mut">Panel de ventas</small>
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {LINKS.map((l) => {
            const on = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? "page" : undefined}
                className={`rounded-[10px] px-3 py-2.5 font-medium hover:bg-[#f3ebee] ${on ? "bg-acc-soft font-bold text-acc" : ""}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 text-xs text-mut">
          {store.kind === "local" && (
            <p>Modo de prueba: los datos se guardan solo en este navegador.</p>
          )}
          {signOut && (
            <button className="btn" onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden print:hidden">
        <span className="font-bold text-acc">El Closet de May</span>
        {store.kind === "local" && <span className="pill bg-warn-soft text-warn">Prueba</span>}
      </header>

      <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 md:pb-6">{children}</main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 flex border-t border-line bg-white md:hidden print:hidden"
      >
        {LINKS.map((l) => {
          const on = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-14 flex-1 items-center justify-center px-0.5 text-[11px] font-semibold ${on ? "font-bold text-acc" : "text-mut"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
