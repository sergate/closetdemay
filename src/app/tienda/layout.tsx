import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "El Closet de May · Tienda",
  description: "Ropa para mujer en Guayaquil. Mira las prendas disponibles y pídelas por WhatsApp.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-bg">{children}</div>;
}
