export type Size = { size: string; stock: number };

export type Product = {
  id: string;
  code: string;
  name: string;
  price: number;
  sizes: Size[];
};

export type OrderStatus = "pendiente" | "cancelado";

export type Order = {
  id: string;
  number: number;
  liveId: string | null;
  code: string;
  productName: string;
  size: string;
  customer: string;
  qty: number;
  unitPrice: number;
  status: OrderStatus;
  createdAt: string;
};

export type Live = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

export type State = {
  products: Product[];
  orders: Order[];
  live: Live | null;
  nextOrderNumber: number;
};

export type OrderInput = {
  code: string;
  size: string;
  customer: string;
  qty: number;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export type ProductInput = Omit<Product, "id"> & { id?: string };

export const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "Única"] as const;
