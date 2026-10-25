-- El Closet de May · esquema completo (Fases 1, 2 y 3)
-- Pega este archivo completo en Supabase > SQL Editor y ejecútalo una vez.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  image_url text not null default '',
  published boolean not null default true,
  wholesale_price numeric(10,2) check (wholesale_price >= 0),
  wholesale_min integer not null default 6 check (wholesale_min >= 2)
);

create table if not exists product_sizes (
  product_id uuid not null references products(id) on delete cascade,
  size text not null,
  stock integer not null check (stock >= 0),
  primary key (product_id, size)
);

create table if not exists lives (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  live_id uuid references lives(id),
  code text not null,
  product_name text not null,
  size text not null,
  customer text not null,
  qty integer not null check (qty > 0),
  unit_price numeric(10,2) not null,
  status text not null default 'pendiente'
    check (status in ('pendiente', 'pagado', 'empacado', 'enviado', 'entregado', 'cancelado')),
  created_at timestamptz not null default now(),
  payment_method text,
  paid_at timestamptz,
  courier text,
  tracking_code text not null default '',
  shipped_at timestamptz
);

create table if not exists customers (
  handle text primary key,
  name text not null default '',
  phone text not null default '',
  city text not null default '',
  address text not null default '',
  wholesale boolean not null default false
);

create table if not exists settings (
  id integer primary key default 1 check (id = 1),
  payment_instructions text not null,
  whatsapp text not null default '',
  live_schedule text not null default '',
  live_notice text not null
    default 'Hola {nombre}, te aviso que nuestro próximo live en TikTok es {horario}. Habrá prendas nuevas de El Closet de May. ¡Te espero!'
);
insert into settings (id, payment_instructions)
  values (1, 'Puedes pagar por transferencia o Deuna. Cuando pagues, envíame el comprobante por aquí.')
  on conflict (id) do nothing;

-- Solo usuarios con sesión iniciada pueden leer y escribir.
alter table products enable row level security;
alter table product_sizes enable row level security;
alter table lives enable row level security;
alter table orders enable row level security;
alter table customers enable row level security;
alter table settings enable row level security;

drop policy if exists "solo autenticadas" on products;
create policy "solo autenticadas" on products for all to authenticated using (true) with check (true);
drop policy if exists "solo autenticadas" on product_sizes;
create policy "solo autenticadas" on product_sizes for all to authenticated using (true) with check (true);
drop policy if exists "solo autenticadas" on lives;
create policy "solo autenticadas" on lives for all to authenticated using (true) with check (true);
drop policy if exists "solo autenticadas" on orders;
create policy "solo autenticadas" on orders for all to authenticated using (true) with check (true);
drop policy if exists "solo autenticadas" on customers;
create policy "solo autenticadas" on customers for all to authenticated using (true) with check (true);
drop policy if exists "solo autenticadas" on settings;
create policy "solo autenticadas" on settings for all to authenticated using (true) with check (true);

-- Registrar un pedido descuenta el stock de forma atómica y aplica el precio por mayor.
create or replace function place_order(p_code text, p_size text, p_customer text, p_qty integer)
returns orders
language plpgsql
as $$
declare
  v_live lives;
  v_product products;
  v_stock integer;
  v_wholesale boolean;
  v_price numeric;
  v_order orders;
begin
  select * into v_live from lives where ended_at is null order by started_at desc limit 1;
  if not found then
    raise exception 'Inicia el live antes de registrar pedidos.';
  end if;

  select * into v_product from products where code = upper(trim(p_code));
  if not found then
    raise exception 'No existe la prenda %.', upper(trim(p_code));
  end if;

  select stock into v_stock from product_sizes
    where product_id = v_product.id and size = p_size for update;
  if not found then
    raise exception '% no tiene talla %.', v_product.code, p_size;
  end if;
  if v_stock < p_qty then
    raise exception 'Solo quedan % de % talla %.', v_stock, v_product.code, p_size;
  end if;

  select wholesale into v_wholesale from customers where handle = p_customer;
  v_price := case
    when coalesce(v_wholesale, false)
      and v_product.wholesale_price is not null
      and p_qty >= v_product.wholesale_min
    then v_product.wholesale_price
    else v_product.price
  end;

  update product_sizes set stock = stock - p_qty
    where product_id = v_product.id and size = p_size;

  insert into orders (live_id, code, product_name, size, customer, qty, unit_price)
    values (v_live.id, v_product.code, v_product.name, p_size, p_customer, p_qty, v_price)
    returning * into v_order;
  return v_order;
end;
$$;

-- Cancelar un pedido devuelve el stock (no aplica si ya salió).
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

create or replace function adjust_stock(p_product uuid, p_size text, p_delta integer)
returns void
language sql
as $$
  update product_sizes set stock = greatest(0, stock + p_delta)
    where product_id = p_product and size = p_size;
$$;

-- Actualizaciones casi en tiempo real entre celular y escritorio.
-- Catálogo para la tienda pública. Lo puede llamar cualquier persona sin iniciar sesión,
-- pero solo devuelve prendas publicadas, sus tallas, el WhatsApp y el horario del live.
create or replace function public_catalog()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'whatsapp', coalesce((select whatsapp from settings where id = 1), ''),
    'liveSchedule', coalesce((select live_schedule from settings where id = 1), ''),
    'products', coalesce((
      select json_agg(
        json_build_object(
          'code', p.code,
          'name', p.name,
          'price', p.price,
          'wholesalePrice', p.wholesale_price,
          'wholesaleMin', p.wholesale_min,
          'image', p.image_url,
          'sizes', (
            select coalesce(json_agg(json_build_object('size', s.size, 'stock', s.stock) order by s.size), '[]'::json)
            from product_sizes s where s.product_id = p.id
          )
        ) order by p.code
      )
      from products p where p.published
    ), '[]'::json)
  );
$$;
revoke all on function public_catalog() from public;
grant execute on function public_catalog() to anon, authenticated;

-- Fotos de las prendas: bucket público; solo personas con sesión pueden subir o borrar.
insert into storage.buckets (id, name, public) values ('productos', 'productos', true)
  on conflict (id) do nothing;
drop policy if exists "fotos: lectura publica" on storage.objects;
create policy "fotos: lectura publica" on storage.objects
  for select using (bucket_id = 'productos');
drop policy if exists "fotos: subir con sesion" on storage.objects;
create policy "fotos: subir con sesion" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos');
drop policy if exists "fotos: cambiar con sesion" on storage.objects;
create policy "fotos: cambiar con sesion" on storage.objects
  for update to authenticated using (bucket_id = 'productos');
drop policy if exists "fotos: borrar con sesion" on storage.objects;
create policy "fotos: borrar con sesion" on storage.objects
  for delete to authenticated using (bucket_id = 'productos');

do $$
begin
  alter publication supabase_realtime add table products;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table product_sizes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table lives;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table orders;
exception when duplicate_object then null;
end $$;
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

-- Que la API vea de inmediato las funciones y columnas nuevas.
notify pgrst, 'reload schema';
