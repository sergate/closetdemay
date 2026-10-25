import { STATUS_LABEL, type OrderStatus } from "@/lib/types";

const STYLE: Record<OrderStatus, string> = {
  pendiente: "bg-warn-soft text-warn",
  pagado: "bg-ok-soft text-ok",
  empacado: "bg-info-soft text-info",
  enviado: "bg-acc-soft text-acc",
  entregado: "bg-ok-soft text-ok",
  cancelado: "bg-[#ece6e9] text-mut",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`pill ${STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}
