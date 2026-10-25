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
}

const STORAGE_KEY = "closetdemay:v1";
const ok: Result<void> = { ok: true, value: undefined };

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function read(): State {
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
      return read();
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
      commit(startLive(read(), uid(), now()));
      return ok;
    },
    async endLive() {
      commit(endLive(read(), now()));
      return ok;
    },
    async placeOrder(input) {
      const res = placeOrder(read(), input, uid(), now());
      if (!res.ok) return res;
      commit(res.value.state);
      return { ok: true, value: res.value.order };
    },
    async cancelOrder(orderId) {
      const res = cancelOrder(read(), orderId);
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async saveProduct(input) {
      const res = saveProduct(read(), input, uid());
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async deleteProduct(productId) {
      commit(deleteProduct(read(), productId));
      return ok;
    },
    async adjustStock(productId, size, delta) {
      commit(adjustStock(read(), productId, size, delta));
      return ok;
    },
    async advanceOrders(orderIds, transition) {
      const res = advanceOrders(read(), orderIds, transition, now());
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async saveCustomer(customer) {
      const res = saveCustomer(read(), customer);
      if (!res.ok) return res;
      commit(res.value);
      return ok;
    },
    async saveSettings(settings) {
      commit({ ...read(), settings });
      return ok;
    },
  };
}
