import { whatsappNumber } from "./fulfillment";
import type { Size } from "./types";

export type PublicProduct = {
  code: string;
  name: string;
  price: number;
  wholesalePrice: number | null;
  wholesaleMin: number;
  image: string;
  sizes: Size[];
};

export type PublicCatalog = {
  whatsapp: string;
  liveSchedule: string;
  products: PublicProduct[];
};

export const availableSizes = (p: PublicProduct): Size[] => p.sizes.filter((s) => s.stock > 0);

export function matchesSearch(p: PublicProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
}

/** Enlace para pedir una prenda por WhatsApp, o null si el negocio no configuró su número. */
export function orderLink(
  whatsapp: string,
  product: PublicProduct,
  size: string,
  wholesale: boolean,
): string | null {
  const number = whatsappNumber(whatsapp);
  if (!number) return null;
  const kind = wholesale ? " por mayor" : "";
  const text = `Hola, quiero pedir${kind} ${product.code} ${product.name} en talla ${size}. ¿Está disponible?`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
