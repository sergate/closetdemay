-- El Closet de May · Fase 1
-- Pega este archivo completo en Supabase > SQL Editor y ejecútalo una vez.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  price numeric(10,2) not null check (price >= 0)
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
  status text not null default 'pendiente' check (status in ('pendiente', 'cancelado')),
  created_at timestamptz not null default now()
);

-- Solo usuarios con sesión iniciada pueden leer y escribir.
alter table products enable row level security;
alter table product_sizes enable row level security;
alter table lives enable row level security;
alter table orders enable row level security;

create policy "solo autenticadas" on products for all to authenticated using (true) with check (true);
create policy "solo autenticadas" on product_sizes for all to authenticated using (true) with check (true);
create policy "solo autenticadas" on lives for all to authenticated using (true) with check (true);
create policy "solo autenticadas" on orders for all to authenticated using (true) with check (true);

-- Registrar un pedido descuenta el stock de forma atómica.
create or replace function place_order(p_code text, p_size text, p_customer text, p_qty integer)
returns orders
language plpgsql
as $$
declare
  v_live lives;
  v_product products;
  v_stock integer;
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

  update product_sizes set stock = stock - p_qty
    where product_id = v_product.id and size = p_size;

  insert into orders (live_id, code, product_name, size, customer, qty, unit_price)
    values (v_live.id, v_product.code, v_product.name, p_size, p_customer, p_qty, v_product.price)
    returning * into v_order;
  return v_order;
end;
$$;

-- Cancelar un pedido devuelve el stock.
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

  update orders set status = 'cancelado' where id = p_id;
  update product_sizes set stock = stock + v_order.qty
    where size = v_order.size
      and product_id = (select id from products where code = v_order.code);
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
alter publication supabase_realtime add table products, product_sizes, lives, orders;
