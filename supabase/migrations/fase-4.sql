-- El Closet de May · Datos de pago (cuentas para recibir transferencias)
-- Se puede ejecutar más de una vez sin problema. Úsalo después de fase-3.sql.
-- Pégalo en Supabase > SQL Editor.

alter table settings add column if not exists payment_accounts jsonb not null default '[]'::jsonb;

-- Que la API vea de inmediato la columna nueva.
notify pgrst, 'reload schema';
