export type Size = { size: string; stock: number };

export type Product = {
  id: string;
  code: string;
  name: string;
  price: number;
  sizes: Size[];
  /** Foto de la prenda: enlace o imagen incrustada. Vacío si no tiene. */
  image: string;
  /** Si aparece en la tienda pública. */
  published: boolean;
  /** Precio por mayor; null si no vende por mayor esta prenda. */
  wholesalePrice: number | null;
  /** Unidades mínimas para aplicar el precio por mayor. */
  wholesaleMin: number;
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
  /** Compra por mayor: se le aplica el precio mayorista. */
  wholesale: boolean;
};

export type AccountType = "ahorros" | "corriente" | "celular";

/** Cuenta donde la dueña quiere recibir el dinero; sale en el mensaje de cobro. */
export type PaymentAccount = {
  id: string;
  /** Banco, cooperativa o app, por ejemplo "Banco Pichincha" o "Deuna". */
  bank: string;
  type: AccountType;
  /** Número de cuenta, o de celular si el tipo es "celular". */
  number: string;
  holder: string;
  /** Cédula o RUC del titular; opcional. */
  idNumber: string;
};

export type Settings = {
  /** Cuentas para recibir pagos; se muestran en cada mensaje de cobro. */
  paymentAccounts: PaymentAccount[];
  /** Texto que se agrega al final del mensaje de cobro. */
  paymentInstructions: string;
  /** WhatsApp del negocio, al que escriben desde la tienda pública. */
  whatsapp: string;
  /** Próximo live, por ejemplo "Jueves 8:00 pm". */
  liveSchedule: string;
  /** Mensaje para avisar del live; {nombre} se reemplaza por la clienta. */
  liveNotice: string;
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
  /** Historial de lives, del más reciente al más antiguo. */
  lives: Live[];
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

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  ahorros: "Cuenta de ahorros",
  corriente: "Cuenta corriente",
  celular: "Celular (Deuna, Jep u otra app)",
};

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

export const DEFAULT_LIVE_NOTICE =
  "Hola {nombre}, te aviso que nuestro próximo live en TikTok es {horario}. Habrá prendas nuevas de El Closet de May. ¡Te espero!";
