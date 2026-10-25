# El Closet de May

Panel de ventas para los lives de TikTok de El Closet de May. Funciona en celular y en escritorio.

**Fase 1**: pedidos en vivo, catálogo e inventario.
**Fase 2** (esta versión): cobros por WhatsApp, estados del pedido (por cobrar, pagado, empacado, enviado, entregado), datos de clientas, despachos y etiquetas para imprimir.

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
2. En **SQL Editor**, ejecuta el contenido de `supabase/schema.sql` (esquema completo). Si ya habías instalado la Fase 1, ejecuta en cambio `supabase/migrations/fase-2.sql`.
3. En **Authentication > Providers > Email**, desactiva **Allow new users to sign up**. Así solo entran quienes tú invites.
4. En **Authentication > Users**, invita por correo a las personas que usarán el panel.
5. En **Authentication > URL Configuration**, agrega la URL de la app (y `http://localhost:3000` para pruebas) en las URLs de redirección.
6. Copia `.env.example` a `.env.local` y pega la URL y la `anon` key del proyecto (**Project Settings > API**). Nunca subas llaves `service_role` al repositorio.

El inicio de sesión es por enlace al correo, sin contraseña.

## Desplegar en Vercel

1. Importa este repositorio en [vercel.com/new](https://vercel.com/new).
2. En **Environment Variables**, agrega `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Cada push a `main` se publica solo. Después puedes conectar el dominio desde **Settings > Domains**.

## Estructura

- `src/lib/orders.ts`: reglas de pedidos, stock y live (puras y con pruebas).
- `src/lib/fulfillment.ts`: estados del pedido, clientas, cobros y enlaces de WhatsApp.
- `src/lib/store.ts`: almacenamiento local. `src/lib/supabaseStore.ts`: almacenamiento en Supabase.
- `src/components/`: pantallas del panel. `src/app/(panel)/`: rutas `/vivo`, `/pedidos`, `/cobros`, `/despachos`, `/catalogo`, `/inventario`.
- `supabase/schema.sql`: tablas, permisos y funciones.
