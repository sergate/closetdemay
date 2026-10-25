import Link from "next/link";
import { MoreSignOut } from "@/components/MoreSignOut";

const ITEMS = [
  { href: "/clientas", label: "Clientas", hint: "Datos, mayoristas y aviso del live" },
  { href: "/reportes", label: "Reportes", hint: "Ventas, prendas y mejores clientas" },
  { href: "/catalogo", label: "Catálogo", hint: "Prendas, fotos y precios" },
  { href: "/inventario", label: "Inventario", hint: "Stock por talla" },
  { href: "/ajustes", label: "Ajustes", hint: "Datos de pago, WhatsApp del negocio y tienda pública" },
];

export default function MasPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <h1 className="text-2xl font-bold">Más</h1>
      <ul className="flex flex-col gap-2">
        {ITEMS.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="card min-h-14 hover:bg-acc-soft">
              <b>{i.label}</b>
              <span className="text-sm text-mut">{i.hint}</span>
            </Link>
          </li>
        ))}
        <li>
          <a href="/tienda" target="_blank" rel="noopener noreferrer" className="card min-h-14 hover:bg-acc-soft">
            <b>Ver la tienda</b>
            <span className="text-sm text-mut">Lo que ven tus clientas</span>
          </a>
        </li>
      </ul>
      <MoreSignOut />
    </div>
  );
}
