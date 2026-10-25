# El Closet de May

Panel de ventas para los lives de TikTok de El Closet de May. Funciona en celular y en escritorio.

**Fase 1**: pedidos en vivo, catálogo e inventario.
**Fase 2**: cobros por WhatsApp, estados del pedido (por cobrar, pagado, empacado, enviado, entregado), datos de clientas, despachos y etiquetas para imprimir.
**Fase 3** (esta versión): clientas y mayoristas (precio por volumen), aviso del próximo live, reportes de ventas, fotos de las prendas y una **tienda pública** en `/tienda` para pedir por WhatsApp.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (PostgreSQL, Auth) · Vercel

## Probar en local

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # pruebas de la lógica de pedidos y stock
npm run typecheck
```

Sin variables de entorno la app corre en **modo de prueba**: los datos se guardan solo en el navegador.

## Conectar Supabase (datos compartidos entre celular y escritorio)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta el contenido de `supabase/schema.sql` (esquema completo). Si ya habías instalado una fase anterior, ejecuta en cambio, en orden, solo las migraciones que te falten: `supabase/migrations/fase-2.sql` y `supabase/migrations/fase-3.sql`.
3. En **Authentication > Providers > Email**, desactiva **Allow new users to sign up**. Así solo entran quienes tú invites.
4. En **Authentication > Users**, invita por correo a las personas que usarán el panel.
5. En **Authentication > URL Configuration**, agrega la URL de la app (y `http://localhost:3000` para pruebas) en las URLs de redirección.
6. Copia `.env.example` a `.env.local` y pega la URL y la `anon` key del proyecto (**Project Settings > API**). Nunca subas llaves `service_role` al repositorio.

El inicio de sesión es por enlace al correo, sin contraseña.

## Tienda pública y fotos

- La tienda está en `/tienda` (la raíz `/` redirige ahí). Muestra solo las prendas marcadas como visibles, sus tallas con stock, el horario del próximo live y el botón **Pedir por WhatsApp** al número que configures en **Ajustes**.
- Con Supabase, la tienda lee el catálogo mediante la función `public_catalog()`, que se puede llamar sin iniciar sesión y devuelve únicamente prendas publicadas, tallas, WhatsApp y horario del live. Las tablas siguen protegidas: pedidos, clientas y datos de pago no son públicos.
- Las fotos se suben al bucket público `productos` de Supabase Storage (lo crea `schema.sql`; solo quien inicia sesión puede subir o borrar). Se reducen a 800 px antes de subirlas.
- Los precios por mayor se muestran en la tienda cuando la persona marca "Ver precios por mayor". Si no quieres que sean públicos, no cargues precio por mayor en esas prendas.

## Desplegar en Vercel

1. Importa este repositorio en [vercel.com/new](https://vercel.com/new).
2. En **Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Cada push a `main` se publica solo. Después puedes conectar el dominio desde **Settings > Domains**.

## Estructura

- `src/lib/orders.ts`: reglas de pedidos, stock y live (puras y con pruebas).
- `src/lib/fulfillment.ts`: estados del pedido, clientas, cobros y enlaces de WhatsApp.
- `src/lib/reports.ts`: ventas por live, prendas y clientas. `src/lib/storefront.ts`: tienda pública.
- `src/lib/store.ts`: almacenamiento local. `src/lib/supabaseStore.ts`: almacenamiento en Supabase.
- `src/components/`: pantallas del panel. `src/app/(panel)/`: rutas `/vivo`, `/pedidos`, `/cobros`, `/despachos`, `/clientas`, `/reportes`, `/catalogo`, `/inventario`, `/ajustes`. `src/app/tienda/`: tienda pública.
- `supabase/schema.sql`: tablas, permisos y funciones.
