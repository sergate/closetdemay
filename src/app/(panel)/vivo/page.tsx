import { LiveHeader } from "@/components/LiveHeader";
import { LowStock } from "@/components/LowStock";
import { OrderForm } from "@/components/OrderForm";
import { OrderList } from "@/components/OrderList";

export default function VivoPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <LiveHeader />
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5">
          <OrderForm />
          <LowStock />
        </div>
        <div className="min-w-0 flex-[1.6_1_440px]">
          <OrderList />
        </div>
      </div>
    </div>
  );
}
