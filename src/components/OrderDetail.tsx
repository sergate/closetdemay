"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { chargeMessage, findCustomer, whatsappUrl } from "@/lib/fulfillment";
import { money } from "@/lib/format";
import { canCancel, orderTotal } from "@/lib/orders";
import { COURIER_LABEL, PAYMENT_LABEL, STATUS_LABEL, type OrderStatus } from "@/lib/types";
import { CustomerForm } from "./CustomerForm";
import { PayForm } from "./PayForm";
import { ShipForm } from "./ShipForm";
import { StatusPill } from "./StatusPill";
import { useApp } from "./StoreProvider";

const STEPS: OrderStatus[] = ["pendiente", "pagado", "empacado", "enviado", "entregado"];

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, store, run } = useApp();
  const [error, setError] = useState<string | null>(null);
  const order = state.orders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-mut">No encontramos ese pedido.</p>
        <Link className="font-semibold text-acc underline" href="/pedidos">Volver a pedidos</Link>
      </div>
    );
  }

  const customer = findCustomer(state, order.customer);
  const current = STEPS.indexOf(order.status);
  const message = chargeMessage(customer, order.customer, [order], state.settings);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <Link className="btn min-w-11 px-0" href="/pedidos" aria-label="Volver a pedidos">&lt;</Link>
        <h1 className="text-xl font-bold">Pedido #{String(order.number).padStart(3, "0")}</h1>
        <StatusPill status={order.status} />
      </div>

      {order.status !== "cancelado" && (
        <ol className="flex gap-1.5" aria-label="Avance del pedido">
          {STEPS.map((s, i) => (
            <li
              key={s}
              aria-current={i === current ? "step" : undefined}
              className={`flex-1 rounded-lg px-1 py-2 text-center text-[11px] font-bold ${i <= current ? "bg-acc-soft text-acc" : "bg-[#ede4e8] text-mut"}`}
            >
              {STATUS_LABEL[s]}
            </li>
          ))}
        </ol>
      )}

      <section className="card">
        <h2 className="text-base font-bold">{order.customer}</h2>
        <p className="text-sm">{order.code} {order.productName} · talla {order.size} × {order.qty}</p>
        <p className="text-sm font-bold">Total {money(orderTotal(order))}</p>
        {order.paymentMethod && <p className="text-sm text-mut">Pagó con {PAYMENT_LABEL[order.paymentMethod]}</p>}
        {order.courier && (
          <p className="text-sm text-mut">
            Envío: {COURIER_LABEL[order.courier]}
            {order.trackingCode && ` · guía ${order.trackingCode}`}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="text-base font-bold">Datos de la clienta</h2>
        <CustomerForm handle={order.customer} />
      </section>

      {order.status !== "cancelado" && (
        <section className="card">
          <h2 className="text-base font-bold">Siguiente paso</h2>
          {order.status === "pendiente" && (
            <>
              <p className="rounded-xl bg-ok-soft p-3 text-sm leading-relaxed whitespace-pre-line">{message}</p>
              <a className="btn btn-p min-h-[52px]" href={whatsappUrl(customer?.phone ?? "", message)} target="_blank" rel="noopener noreferrer">
                Enviar cobro por WhatsApp
              </a>
              <PayForm orderIds={[order.id]} />
            </>
          )}
          {order.status === "pagado" && (
            <button className="btn btn-p" onClick={async () => setError(await run(store.advanceOrders([order.id], { to: "empacado" })))}>
              Marcar empacado
            </button>
          )}
          {order.status === "empacado" && <ShipForm orderIds={[order.id]} />}
          {order.status === "enviado" && (
            <button className="btn btn-p" onClick={async () => setError(await run(store.advanceOrders([order.id], { to: "entregado" })))}>
              Marcar entregado
            </button>
          )}
          {order.status === "entregado" && <p className="text-sm text-ok">Este pedido ya fue entregado.</p>}
          {error && <p role="alert" className="text-sm font-semibold text-acc">{error}</p>}
        </section>
      )}

      {canCancel(order) && (
        <button
          className="btn"
          onClick={async () => {
            if (!window.confirm("¿Cancelar el pedido? El stock vuelve al inventario.")) return;
            const err = await run(store.cancelOrder(order.id));
            if (err) setError(err);
            else router.push("/pedidos");
          }}
        >
          Cancelar pedido
        </button>
      )}
    </div>
  );
}
