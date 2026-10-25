-- El Closet de May · Fase 3 (clientas, mayoristas, reportes y tienda pública)
-- Solo si ya ejecutaste schema.sql y fase-2.sql. Pégalo en Supabase > SQL Editor.
-- Si instalas desde cero, usa schema.sql, que ya incluye todo esto.

alter table products add column if not exists image_url text not null default '';
alter table products add column if not exists published boolean not null default true;
alter table products add column if not exists wholesale_price numeric(10,2) check (wholesale_price >= 0);
alter table products add column if not exists wholesale_min integer not null default 6 check (wholesale_min >= 2);

alter table customers add column if not exists wholesale boolean not null default false;

alter table settings add column if not exists whatsapp text not null default '';
alter table settings add column if not exists live_schedule text not null default '';
alter table settings add column if not exists live_notice text not null
  default 'Hola {nombre}, te aviso que nuestro próximo live en TikTok es {horario}. Habrá prendas nuevas de El Closet de May. ¡Te espero!';

-- Registrar un pedido: aplica el precio por mayor si la clienta es mayorista y llega al mínimo.
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
create policy "fotos: lectura publica" on storage.objects
  for select using (bucket_id = 'productos');
create policy "fotos: subir con sesion" on storage.objects
  for insert to authenticated with check (bucket_id = 'productos');
create policy "fotos: cambiar con sesion" on storage.objects
  for update to authenticated using (bucket_id = 'productos');
create policy "fotos: borrar con sesion" on storage.objects
  for delete to authenticated using (bucket_id = 'productos');
