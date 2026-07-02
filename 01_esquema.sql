-- ============================================================================
-- Finance Tracker — Esquema (contabilidad de partida doble)
-- Postgres / Supabase. Idempotente: se puede re-ejecutar sin romper.
--
-- Convención de signos en `partidas.monto`:
--   +  = cargo / debe
--   -  = abono / haber
-- Cada asiento debe sumar 0 (validado por trigger diferido).
--
-- Saldo "natural" por tipo de cuenta:
--   activo, gasto        -> naturaleza deudora  (multiplicador +1)
--   pasivo, patrimonio,  -> naturaleza acreedora (multiplicador -1)
--   ingreso
-- ============================================================================

-- gen_random_uuid() es nativo en PG13+; en Supabase ya está disponible.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists cuentas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre     text not null,
  tipo       text not null check (tipo in ('activo','pasivo','patrimonio','ingreso','gasto')),
  subtipo    text,
  moneda     text not null default 'GTQ',
  archivada  boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, nombre)
);

create table if not exists asientos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  fecha       date not null default current_date,
  tipo        text not null check (tipo in ('gasto','ingreso','transferencia','apertura','ajuste')),
  descripcion text,
  created_at  timestamptz not null default now()
);

create table if not exists partidas (
  id         uuid primary key default gen_random_uuid(),
  asiento_id uuid not null references asientos (id) on delete cascade,
  cuenta_id  uuid not null references cuentas (id) on delete restrict,
  monto      numeric(18,2) not null check (monto <> 0)
);

create table if not exists presupuestos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cuenta_id uuid not null references cuentas (id) on delete cascade,
  anio      int not null,
  mes       int not null check (mes between 1 and 12),
  monto     numeric(18,2) not null,
  unique (user_id, cuenta_id, anio, mes)
);

-- Índices de apoyo
create index if not exists idx_partidas_asiento on partidas (asiento_id);
create index if not exists idx_partidas_cuenta  on partidas (cuenta_id);
create index if not exists idx_asientos_user_fecha on asientos (user_id, fecha);
create index if not exists idx_presupuestos_periodo on presupuestos (user_id, anio, mes);

-- ---------------------------------------------------------------------------
-- Trigger: cada asiento suma 0 (partida doble)
-- Diferido: valida al final de la transacción, para permitir insertar todas
-- las partidas de un asiento antes de comprobar el balance.
-- ---------------------------------------------------------------------------

create or replace function fn_asiento_balanceado()
returns trigger
language plpgsql
as $$
declare
  v_asiento uuid := coalesce(new.asiento_id, old.asiento_id);
  v_suma    numeric;
  v_existe  boolean;
begin
  -- Si el asiento ya no existe (borrado en cascada), no hay nada que validar.
  select exists(select 1 from asientos where id = v_asiento) into v_existe;
  if not v_existe then
    return null;
  end if;

  select coalesce(sum(monto), 0) into v_suma
  from partidas
  where asiento_id = v_asiento;

  if v_suma <> 0 then
    raise exception 'El asiento % no está balanceado: la suma de partidas es % (debe ser 0).', v_asiento, v_suma;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_asiento_balanceado on partidas;
create constraint trigger trg_asiento_balanceado
  after insert or update or delete on partidas
  deferrable initially deferred
  for each row execute function fn_asiento_balanceado();

-- ---------------------------------------------------------------------------
-- RLS: cada usuario sólo ve/gestiona lo suyo
-- ---------------------------------------------------------------------------

alter table cuentas      enable row level security;
alter table asientos     enable row level security;
alter table partidas     enable row level security;
alter table presupuestos enable row level security;

drop policy if exists cuentas_propias on cuentas;
create policy cuentas_propias on cuentas
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists asientos_propios on asientos;
create policy asientos_propios on asientos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists presupuestos_propios on presupuestos;
create policy presupuestos_propios on presupuestos
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- partidas no tiene user_id: se hereda del asiento (y la cuenta debe ser tuya).
drop policy if exists partidas_propias on partidas;
create policy partidas_propias on partidas
  for all to authenticated
  using (
    exists (select 1 from asientos a where a.id = partidas.asiento_id and a.user_id = auth.uid())
  )
  with check (
    exists (select 1 from asientos a where a.id = partidas.asiento_id and a.user_id = auth.uid())
    and exists (select 1 from cuentas c where c.id = partidas.cuenta_id and c.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- Vista de saldos (security_invoker => respeta la RLS del usuario que consulta)
-- ---------------------------------------------------------------------------

create or replace view v_saldos
with (security_invoker = true) as
select
  c.id        as cuenta_id,
  c.user_id,
  c.nombre,
  c.tipo,
  c.subtipo,
  c.moneda,
  c.archivada,
  coalesce(sum(p.monto), 0) as saldo_contable,   -- suma cruda (signo debe/haber)
  coalesce(sum(p.monto), 0) *
    case when c.tipo in ('activo','gasto') then 1 else -1 end as saldo  -- saldo natural
from cuentas c
left join partidas p on p.cuenta_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- RPC de informes (SECURITY INVOKER por defecto => aplican RLS)
-- ---------------------------------------------------------------------------

-- Balance general a una fecha: activo / pasivo / patrimonio con saldo natural.
create or replace function balance_general(p_fecha date)
returns table (tipo text, cuenta_id uuid, nombre text, saldo numeric)
language sql
stable
as $$
  select
    c.tipo,
    c.id,
    c.nombre,
    coalesce(sum(p.monto) filter (where a.fecha <= p_fecha), 0)
      * case when c.tipo = 'activo' then 1 else -1 end as saldo
  from cuentas c
  left join partidas p on p.cuenta_id = c.id
  left join asientos a on a.id = p.asiento_id
  where c.tipo in ('activo','pasivo','patrimonio')
  group by c.tipo, c.id, c.nombre
  order by c.tipo, c.nombre;
$$;

-- Estado de resultados de un mes: ingresos y gastos (montos positivos).
create or replace function estado_resultados(p_anio int, p_mes int)
returns table (tipo text, cuenta_id uuid, nombre text, monto numeric)
language sql
stable
as $$
  select
    c.tipo,
    c.id,
    c.nombre,
    coalesce(sum(p.monto) filter (
      where extract(year from a.fecha) = p_anio
        and extract(month from a.fecha) = p_mes
    ), 0) * case when c.tipo = 'ingreso' then -1 else 1 end as monto
  from cuentas c
  left join partidas p on p.cuenta_id = c.id
  left join asientos a on a.id = p.asiento_id
  where c.tipo in ('ingreso','gasto')
  group by c.tipo, c.id, c.nombre
  order by c.tipo, c.nombre;
$$;

-- Presupuesto vs real (gastos) de un mes.
create or replace function presupuesto_vs_real(p_anio int, p_mes int)
returns table (
  cuenta_id   uuid,
  nombre      text,
  presupuesto numeric,
  monto_real  numeric,
  diferencia  numeric
)
language sql
stable
as $$
  select
    c.id,
    c.nombre,
    coalesce(b.monto, 0) as presupuesto,
    coalesce(sum(p.monto) filter (
      where extract(year from a.fecha) = p_anio
        and extract(month from a.fecha) = p_mes
    ), 0) as monto_real,
    coalesce(sum(p.monto) filter (
      where extract(year from a.fecha) = p_anio
        and extract(month from a.fecha) = p_mes
    ), 0) - coalesce(b.monto, 0) as diferencia
  from cuentas c
  left join presupuestos b
    on b.cuenta_id = c.id and b.anio = p_anio and b.mes = p_mes
  left join partidas p on p.cuenta_id = c.id
  left join asientos a on a.id = p.asiento_id
  where c.tipo = 'gasto'
  group by c.id, c.nombre, b.monto
  order by c.nombre;
$$;

-- Patrimonio (activos - pasivos) acumulado al cierre de cada mes del rango.
create or replace function patrimonio_mensual(p_desde date, p_hasta date)
returns table (mes date, patrimonio numeric)
language sql
stable
as $$
  with meses as (
    select generate_series(
      date_trunc('month', p_desde),
      date_trunc('month', p_hasta),
      interval '1 month'
    )::date as mes
  )
  select
    m.mes,
    coalesce(sum(
      p.monto * case when c.tipo = 'activo' then 1
                     when c.tipo = 'pasivo' then -1
                     else 0 end
    ) filter (where a.fecha < (m.mes + interval '1 month')), 0) as patrimonio
  from meses m
  left join asientos a on true
  left join partidas p on p.asiento_id = a.id
  left join cuentas  c on c.id = p.cuenta_id
  group by m.mes
  order by m.mes;
$$;
