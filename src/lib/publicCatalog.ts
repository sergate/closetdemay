import { readLocalState } from "./store";
import type { PublicCatalog } from "./storefront";
import { createSupabaseClient } from "./supabaseStore";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Catálogo de la tienda pública. No requiere sesión: en Supabase solo ve lo que expone `public_catalog()`. */
export async function loadPublicCatalog(): Promise<PublicCatalog> {
  if (SUPABASE_URL && SUPABASE_KEY) {
    const { data, error } = await createSupabaseClient(SUPABASE_URL, SUPABASE_KEY).rpc("public_catalog");
    if (error) throw new Error(error.message);
    const raw = data as PublicCatalog;
    return {
      whatsapp: raw.whatsapp ?? "",
      liveSchedule: raw.liveSchedule ?? "",
      products: (raw.products ?? []).map((p) => ({
        ...p,
        price: Number(p.price),
        wholesalePrice: p.wholesalePrice === null ? null : Number(p.wholesalePrice),
      })),
    };
  }
  const state = readLocalState();
  return {
    whatsapp: state.settings.whatsapp,
    liveSchedule: state.settings.liveSchedule,
    products: state.products
      .filter((p) => p.published)
      .map((p) => ({
        code: p.code,
        name: p.name,
        price: p.price,
        wholesalePrice: p.wholesalePrice,
        wholesaleMin: p.wholesaleMin,
        image: p.image,
        sizes: p.sizes,
      })),
  };
}
