-- El Closet de May · Fase 2 (cobros, estados y despachos)
-- Se puede ejecutar más de una vez sin problema. Úsalo si tu base viene de la Fase 1.
-- Pégalo en Supabase > SQL Editor.
-- Si instalas desde cero, usa schema.sql, que ya incluye todo esto.

alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('pendiente', 'pagado', 'empacado', 'enviado', 'entregado', 'cancelado'));

alter table orders add column if not exists payment_method text;
alter table orders add column if not exists paid_at timestamptz;
alter table orders add column if not exists courier text;
alter table orders add column if not exists tracking_code text not null default '';
alter table orders add column if not exists shipped_at timestamptz;

create table if not exists customers (
  handle text primary key,
  name text not null default '',
  phone text not null default '',
  city text not null default '',
  address text not null default ''
);

create table if not exists settings (
  id integer primary key default 1 check (id = 1),
  payment_instructions text not null
);
insert into settings (id, payment_instructions)
  values (1, 'Puedes pagar por transferencia o Deuna. Cuando pagues, envíame el comprobante por aquí.')
  on conflict (id) do nothing;

alter table customers enable row level security;
alter table settings enable row level security;
drop policy if exists "solo autenticadas" on customers;
create policy "solo autenticadas" on customers for all to authenticated using (true) with check (true);
drop policy if exists "solo autenticadas" on settings;
create policy "solo autenticadas" on settings for all to authenticated using (true) with check (true);

create or replace function cancel_order(p_id uuid)
returns void
language plpgsql
as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_id for update;
  if not found then
    raise exception 'No existe ese pedido.';
  end if;
  if v_order.status = 'cancelado' then
    raise exception 'El pedido ya estaba cancelado.';
  end if;
  if v_order.status in ('enviado', 'entregado') then
    raise exception 'No se puede cancelar un pedido que ya salió.';
  end if;

  update orders set status = 'cancelado' where id = p_id;
  update product_sizes set stock = stock + v_order.qty
    where size = v_order.size
      and product_id = (select id from products where code = v_order.code);
end;
$$;

-- Mueve pedidos al siguiente estado. Todo o nada.
create or replace function advance_orders(
  p_ids uuid[],
  p_to text,
  p_payment text default null,
  p_courier text default null,
  p_tracking text default ''
)
returns void
language plpgsql
as $$
declare
  v_ids uuid[] := array(select distinct unnest(p_ids));
  v_from text;
  v_wrong orders;
begin
  if coalesce(cardinality(v_ids), 0) = 0 then
    raise exception 'No hay pedidos seleccionados.';
  end if;

  v_from := case p_to
    when 'pagado' then 'pendiente'
    when 'empacado' then 'pagado'
    when 'enviado' then 'empacado'
    when 'entregado' then 'enviado'
  end;
  if v_from is null then
    raise exception 'Estado no válido.';
  end if;
  if p_to = 'pagado' and coalesce(p_payment, '') = '' then
    raise exception 'Elige cómo pagó la clienta.';
  end if;
  if p_to = 'enviado' and coalesce(p_courier, '') = '' then
    raise exception 'Elige cómo se envía el pedido.';
  end if;

  perform 1 from orders where id = any(v_ids) for update;
  if (select count(*) from orders where id = any(v_ids)) <> cardinality(v_ids) then
    raise exception 'No existe alguno de los pedidos.';
  end if;

  select * into v_wrong from orders where id = any(v_ids) and status <> v_from limit 1;
  if found then
    raise exception 'El pedido #% no está en el estado correcto para este paso.', v_wrong.number;
  end if;

  update orders set
    status = p_to,
    payment_method = case when p_to = 'pagado' then p_payment else payment_method end,
    paid_at = case when p_to = 'pagado' then now() else paid_at end,
    courier = case when p_to = 'enviado' then p_courier else courier end,
    tracking_code = case when p_to = 'enviado' then trim(coalesce(p_tracking, '')) else tracking_code end,
    shipped_at = case when p_to = 'enviado' then now() else shipped_at end
  where id = any(v_ids);
end;
$$;

do $$
begin
  alter publication supabase_realtime add table customers;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table settings;
exception when duplicate_object then null;
end $$;
