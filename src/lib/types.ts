export type Size = { size: string; stock: number };

export type Product = {
  id: string;
  code: string;
  name: string;
  price: number;
  sizes: Size[];
};

export type OrderStatus =
  | "pendiente"
  | "pagado"
  | "empacado"
  | "enviado"
  | "entregado"
  | "cancelado";

export type PaymentMethod = "transferencia" | "deuna" | "efectivo" | "otro";

export type Courier = "motorizado" | "servientrega" | "tramaco" | "retiro" | "otro";

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
  paymentMethod: PaymentMethod | null;
  paidAt: string | null;
  courier: Courier | null;
  trackingCode: string;
  shippedAt: string | null;
};

export type Customer = {
  /** Usuario de TikTok normalizado, por ejemplo "@karla_gye". */
  handle: string;
  name: string;
  phone: string;
  city: string;
  address: string;
};

export type Settings = {
  /** Texto que se agrega al final del mensaje de cobro. */
  paymentInstructions: string;
};

export type Transition =
  | { to: "pagado"; paymentMethod: PaymentMethod }
  | { to: "empacado" }
  | { to: "enviado"; courier: Courier; trackingCode: string }
  | { to: "entregado" };

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
  customers: Customer[];
  settings: Settings;
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

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pendiente: "Por cobrar",
  pagado: "Pagado",
  empacado: "Empacado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  transferencia: "Transferencia",
  deuna: "Deuna",
  efectivo: "Efectivo",
  otro: "Otro",
};

export const COURIER_LABEL: Record<Courier, string> = {
  motorizado: "Motorizado (Guayaquil)",
  servientrega: "Servientrega",
  tramaco: "Tramaco",
  retiro: "Retiro en persona",
  otro: "Otro",
};

export const DEFAULT_PAYMENT_INSTRUCTIONS =
  "Puedes pagar por transferencia o Deuna. Cuando pagues, envíame el comprobante por aquí.";
