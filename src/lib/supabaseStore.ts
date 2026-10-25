import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { emptyState, normalizeCode, normalizeCustomer, saveProduct } from "./orders";
import type { Store } from "./store";
import { saveCustomer } from "./fulfillment";
import type {
  Courier,
  Customer,
  Live,
  Order,
  OrderInput,
  PaymentAccount,
  PaymentMethod,
  Product,
  Result,
  Settings,
  State,
  Transition,
} from "./types";

type OrderRow = {
  id: string;
  number: number;
  live_id: string | null;
  code: string;
  product_name: string;
  size: string;
  customer: string;
  qty: number;
  unit_price: number | string;
  status: Order["status"];
  created_at: string;
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  courier: Courier | null;
  tracking_code: string;
  shipped_at: string | null;
};

type CustomerRow = {
  handle: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  wholesale: boolean;
};

type SettingsRow = {
  payment_accounts: PaymentAccount[] | null;
  payment_instructions: string;
  whatsapp: string;
  live_schedule: string;
  live_notice: string;
};

type ProductRow = {
  id: string;
  code: string;
  name: string;
  price: number | string;
  image_url: string;
  published: boolean;
  wholesale_price: number | string | null;
  wholesale_min: number;
  product_sizes: { size: string; stock: number }[];
};

type LiveRow = { id: string; started_at: string; ended_at: string | null };

const BUCKET = "productos";
const ok: Result<void> = { ok: true, value: undefined };
const fail = (error: string): Result<never> => ({ ok: false, error });

const toOrder = (r: OrderRow): Order => ({
  id: r.id,
  number: r.number,
  liveId: r.live_id,
  code: r.code,
  productName: r.product_name,
  size: r.size,
  customer: r.customer,
  qty: r.qty,
  unitPrice: Number(r.unit_price),
  status: r.status,
  createdAt: r.created_at,
  paymentMethod: r.payment_method,
  paidAt: r.paid_at,
  courier: r.courier,
  trackingCode: r.tracking_code,
  shippedAt: r.shipped_at,
});

const toProduct = (r: ProductRow): Product => ({
  id: r.id,
  code: r.code,
  name: r.name,
  price: Number(r.price),
  sizes: [...r.product_sizes].sort((a, b) => a.size.localeCompare(b.size)),
  image: r.image_url,
  published: r.published,
  wholesalePrice: r.wholesale_price === null ? null : Number(r.wholesale_price),
  wholesaleMin: r.wholesale_min,
});

const toLive = (r: LiveRow): Live => ({ id: r.id, startedAt: r.started_at, endedAt: r.ended_at });

const settingsFrom = (row: SettingsRow | null, fallback: Settings): Settings => ({
  paymentAccounts: row?.payment_accounts ?? fallback.paymentAccounts,
  paymentInstructions: row?.payment_instructions ?? fallback.paymentInstructions,
  whatsapp: row?.whatsapp ?? fallback.whatsapp,
  liveSchedule: row?.live_schedule ?? fallback.liveSchedule,
  liveNotice: row?.live_notice ?? fallback.liveNotice,
});

export function createSupabaseClient(url: string, anonKey: string): SupabaseClient {
  return createClient(url, anonKey);
}

/** Datos compartidos entre dispositivos. Requiere haber ejecutado supabase/schema.sql. */
export function createSupabaseStore(db: SupabaseClient): Store {
  async function load(): Promise<State> {
    const [products, orders, lives, customers, settings] = await Promise.all([
      db.from("products").select("id, code, name, price, image_url, published, wholesale_price, wholesale_min, product_sizes(size, stock)").order("code"),
      db.from("orders").select("*").order("number", { ascending: false }).limit(500),
      db.from("lives").select("*").order("started_at", { ascending: false }).limit(30),
      db.from("customers").select("*").order("handle"),
      db.from("settings").select("payment_accounts, payment_instructions, whatsapp, live_schedule, live_notice").eq("id", 1).maybeSingle(),
    ]);
    const error = products.error ?? orders.error ?? lives.error ?? customers.error ?? settings.error;
    if (error) throw new Error(error.message);

    const orderRows = (orders.data ?? []) as OrderRow[];
    const base = emptyState();
    return {
      ...base,
      customers: ((customers.data ?? []) as CustomerRow[]).map((c): Customer => ({ ...c })),
      settings: settingsFrom(settings.data as SettingsRow | null, base.settings),
      products: ((products.data ?? []) as ProductRow[]).map(toProduct),
      orders: orderRows.map(toOrder),
      lives: ((lives.data ?? []) as LiveRow[]).map(toLive),
      live: lives.data?.[0] ? toLive(lives.data[0] as LiveRow) : null,
      nextOrderNumber: (orderRows[0]?.number ?? 0) + 1,
    };
  }

  const run = async (op: PromiseLike<{ error: { message: string } | null }>): Promise<Result<void>> => {
    const { error } = await op;
    return error ? fail(error.message) : ok;
  };

  return {
    kind: "supabase",
    load,
    subscribe(onChange) {
      const channel = db.channel("closetdemay-cambios");
      for (const table of ["products", "product_sizes", "lives", "orders", "customers", "settings"]) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
      }
      channel.subscribe();
      return () => {
        void db.removeChannel(channel);
      };
    },
    async startLive() {
      const open = await db.from("lives").select("id").is("ended_at", null).limit(1);
      if (open.error) return fail(open.error.message);
      if (open.data.length > 0) return ok;
      return run(db.from("lives").insert({}));
    },
    async endLive() {
      return run(db.from("lives").update({ ended_at: new Date().toISOString() }).is("ended_at", null));
    },
    async placeOrder(input: OrderInput) {
      const customer = normalizeCustomer(input.customer);
      if (!customer) return fail("Falta el usuario de TikTok.");
      if (!Number.isInteger(input.qty) || input.qty < 1) return fail("La cantidad debe ser 1 o más.");
      const { data, error } = await db.rpc("place_order", {
        p_code: normalizeCode(input.code),
        p_size: input.size,
        p_customer: customer,
        p_qty: input.qty,
      });
      if (error) return fail(error.message);
      return { ok: true, value: toOrder(data as OrderRow) };
    },
    async cancelOrder(orderId) {
      return run(db.rpc("cancel_order", { p_id: orderId }));
    },
    async saveProduct(input) {
      // Reusa las mismas validaciones que el modo local.
      const checked = saveProduct(await load(), input, crypto.randomUUID());
      if (!checked.ok) return checked;
      const saved = checked.value.products.find((p) => p.code === normalizeCode(input.code))!;

      const up = await db
        .from("products")
        .upsert({
          id: saved.id,
          code: saved.code,
          name: saved.name,
          price: saved.price,
          image_url: saved.image,
          published: saved.published,
          wholesale_price: saved.wholesalePrice,
          wholesale_min: saved.wholesaleMin,
        });
      if (up.error) return fail(up.error.message);

      const keep = saved.sizes.map((s) => s.size);
      const drop = await db
        .from("product_sizes")
        .delete()
        .eq("product_id", saved.id)
        .not("size", "in", `(${keep.map((s) => `"${s}"`).join(",")})`);
      if (drop.error) return fail(drop.error.message);

      return run(
        db.from("product_sizes").upsert(saved.sizes.map((s) => ({ product_id: saved.id, ...s }))),
      );
    },
    async deleteProduct(productId) {
      return run(db.from("products").delete().eq("id", productId));
    },
    async adjustStock(productId, size, delta) {
      return run(db.rpc("adjust_stock", { p_product: productId, p_size: size, p_delta: delta }));
    },
    async advanceOrders(orderIds, t: Transition) {
      return run(
        db.rpc("advance_orders", {
          p_ids: orderIds,
          p_to: t.to,
          p_payment: t.to === "pagado" ? t.paymentMethod : null,
          p_courier: t.to === "enviado" ? t.courier : null,
          p_tracking: t.to === "enviado" ? t.trackingCode : "",
        }),
      );
    },
    async saveCustomer(customer) {
      const checked = saveCustomer(emptyState(), customer);
      if (!checked.ok) return checked;
      return run(db.from("customers").upsert(checked.value.customers[0]));
    },
    async saveSettings(settings) {
      return run(
        db.from("settings").upsert({
          id: 1,
          payment_accounts: settings.paymentAccounts,
          payment_instructions: settings.paymentInstructions,
          whatsapp: settings.whatsapp,
          live_schedule: settings.liveSchedule,
          live_notice: settings.liveNotice,
        }),
      );
    },
    async uploadImage(file) {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (error) return fail(error.message);
      return { ok: true, value: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
    },
  };
}
