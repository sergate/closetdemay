import { advanceOrders, saveCustomer } from "./fulfillment";
import {
  adjustStock,
  cancelOrder,
  deleteProduct,
  emptyState,
  endLive,
  migrateState,
  placeOrder,
  saveProduct,
  startLive,
} from "./orders";
import type {
  Customer,
  Order,
  OrderInput,
  ProductInput,
  Result,
  Settings,
  State,
  Transition,
} from "./types";

export interface Store {
  /** "local" guarda en este navegador; "supabase" comparte entre dispositivos. */
  readonly kind: "local" | "supabase";
  load(): Promise<State>;
  subscribe(onChange: () => void): () => void;
  startLive(): Promise<Result<void>>;
  endLive(): Promise<Result<void>>;
  placeOrder(input: OrderInput): Promise<Result<Order>>;
  cancelOrder(orderId: string): Promise<Result<void>>;
  saveProduct(input: ProductInput): Promise<Result<void>>;
  deleteProduct(productId: string): Promise<Result<void>>;
  adjustStock(productId: string, size: string, delta: number): Promise<Result<void>>;
  advanceOrders(orderIds: string[], transition: Transition): Promise<Result<void>>;
  saveCustomer(customer: Customer): Promise<Result<void>>;
  saveSettings(settings: Settings): Promise<Result<void>>;
  /** Sube una foto y devuelve el valor para guardar en `Product.image`. */
  uploadImage(file: Blob): Promise<Result<string>>;
}

const STORAGE_KEY = "closetdemay:v1";
const ok: Result<void> = { ok: true, value: undefined };

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

export function readLocalState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? migrateState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

function write(state: State) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Guarda todo en localStorage: sirve para probar sin base de datos. */
export function createLocalStore(): Store {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((fn) => fn());

  const commit = (state: State) => {
    write(state);
    notify();
  };

  return {
    kind: "local",
    async load() {
      return readLocalState();
    },
    subscribe(onChange) {
      listeners.add(onChange);
      const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && onChange();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    async startLive() {
      commit(startLive(readLocalState(), uid(), now()));
      return ok;
    },
    async endLive() {
      commit(endLive(readLocalState(), now()));
      return ok;
    },
    async placeOrder(input) {
      const res = placeOrder(readLocalState(), input, uid(), now());
      if (!res.ok) return res;
      commit(res.value.state);
      return { ok: true, value: res.value.order };
    },
    async cancelOrder(orderId) {
      const res = cancelOrder(readLocalState(), orderId);
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async saveProduct(input) {
      const res = saveProduct(readLocalState(), input, uid());
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async deleteProduct(productId) {
      commit(deleteProduct(readLocalState(), productId));
      return ok;
    },
    async adjustStock(productId, size, delta) {
      commit(adjustStock(readLocalState(), productId, size, delta));
      return ok;
    },
    async advanceOrders(orderIds, transition) {
      const res = advanceOrders(readLocalState(), orderIds, transition, now());
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async saveCustomer(customer) {
      const res = saveCustomer(readLocalState(), customer);
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async saveSettings(settings) {
      commit({ ...readLocalState(), settings });
      return ok;
    },
    async uploadImage(file) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ ok: true, value: String(reader.result) });
        reader.onerror = () => resolve({ ok: false, error: "No se pudo leer la foto." });
        reader.readAsDataURL(file);
      });
    },
  };
}
