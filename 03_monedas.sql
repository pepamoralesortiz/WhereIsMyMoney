-- ============================================================================
-- Finance Tracker — Multimoneda (etapa: monedas + edición)
-- Idempotente. El cuadre de partida doble pasa a la MONEDA BASE (GTQ):
-- cada asiento debe sumar 0 en monto_base. Cada cuenta conserva su saldo
-- nativo (monto, en su propia moneda). Consolidado/informes usan monto_base.
-- ============================================================================

-- 1) Nuevas columnas en partidas: moneda de la línea y equivalente en GTQ.
alter table partidas add column if not exists moneda text;
alter table partidas add column if not exists monto_base numeric(18,2);

-- Backfill: moneda desde la cuenta; monto_base = monto * tasa histórica aprox.
-- (los asientos existentes son mono-moneda, así que el cuadre en base se mantiene)
update partidas p
  set moneda = c.moneda
  from cuentas c
  where p.cuenta_id = c.id and p.moneda is null;

update partidas
  set monto_base = round(
    monto * case moneda when 'USD' then 7.8 when 'EUR' then 8.5 else 1 end, 2)
  where monto_base is null;

-- Flush del trigger de partida doble (diferido) para poder alterar la tabla.
set constraints all immediate;

alter table partidas alter column moneda set not null;
alter table partidas alter column monto_base set not null;

-- 2) Trigger de partida doble ahora valida en moneda base (monto_base).
create or replace function fn_asiento_balanceado()
returns trigger
language plpgsql
as $$
declare
  v_asiento uuid := coalesce(new.asiento_id, old.asiento_id);
  v_suma    numeric;
  v_existe  boolean;
begin
  select exists(select 1 from asientos where id = v_asiento) into v_existe;
  if not v_existe then
    return null;
  end if;

  select coalesce(sum(monto_base), 0) into v_suma
  from partidas
  where asiento_id = v_asiento;

  if v_suma <> 0 then
    raise exception 'El asiento % no cuadra en moneda base: suma = % (debe ser 0).', v_asiento, v_suma;
  end if;

  return null;
end;
$$;

-- 3) Tasas de cambio configurables (GTQ por 1 unidad de la moneda). Una por usuario/moneda.
create table if not exists tasas_cambio (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  moneda     text not null,
  tasa       numeric(18,6) not null check (tasa > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, moneda)
);

alter table tasas_cambio enable row level security;
drop policy if exists tasas_propias on tasas_cambio;
create policy tasas_propias on tasas_cambio
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4) v_saldos: saldo nativo (en la moneda de la cuenta) + saldo_base (GTQ).
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
  coalesce(sum(p.monto), 0)      as saldo_contable,
  coalesce(sum(p.monto), 0)      * case when c.tipo in ('activo','gasto') then 1 else -1 end as saldo,
  coalesce(sum(p.monto_base), 0) * case when c.tipo in ('activo','gasto') then 1 else -1 end as saldo_base
from cuentas c
left join partidas p on p.cuenta_id = c.id
group by c.id;

-- 5) crear_movimiento con moneda + tipo de cambio (default GTQ, tc=1).
drop function if exists crear_movimiento(date, text, text, uuid, uuid, numeric);
create or replace function crear_movimiento(
  p_fecha        date,
  p_tipo         text,
  p_descripcion  text,
  p_cuenta_debe  uuid,
  p_cuenta_haber uuid,
  p_monto        numeric,
  p_moneda       text default 'GTQ',
  p_tc           numeric default 1
)
returns uuid
language plpgsql
as $$
declare
  v_asiento   uuid;
  v_base      numeric;
  v_md_debe   text;
  v_md_haber  text;
  v_nat_debe  numeric;
  v_nat_haber numeric;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor que 0.';
  end if;
  if p_cuenta_debe = p_cuenta_haber then
    raise exception 'La cuenta de origen y la de destino deben ser distintas.';
  end if;
  if p_tc is null or p_tc <= 0 then
    raise exception 'El tipo de cambio debe ser mayor que 0.';
  end if;

  select moneda into v_md_debe  from cuentas where id = p_cuenta_debe;
  select moneda into v_md_haber from cuentas where id = p_cuenta_haber;

  if v_md_debe not in ('GTQ', p_moneda) or v_md_haber not in ('GTQ', p_moneda) then
    raise exception 'Las cuentas deben estar en GTQ o en % (la moneda del movimiento).', p_moneda;
  end if;

  v_base      := round(p_monto * p_tc, 2);
  v_nat_debe  := case when v_md_debe  = 'GTQ' then v_base else p_monto end;
  v_nat_haber := case when v_md_haber = 'GTQ' then v_base else p_monto end;

  insert into asientos (fecha, tipo, descripcion)
  values (coalesce(p_fecha, current_date), p_tipo, nullif(trim(p_descripcion), ''))
  returning id into v_asiento;

  insert into partidas (asiento_id, cuenta_id, monto, moneda, monto_base) values
    (v_asiento, p_cuenta_debe,   v_nat_debe,  v_md_debe,  v_base),
    (v_asiento, p_cuenta_haber, -v_nat_haber, v_md_haber, -v_base);

  if p_moneda <> 'GTQ' then
    insert into tasas_cambio (moneda, tasa) values (p_moneda, p_tc)
    on conflict (user_id, moneda) do update set tasa = excluded.tasa, updated_at = now();
  end if;

  return v_asiento;
end;
$$;

-- 6) actualizar_movimiento: edición en sitio (mismo asiento).
create or replace function actualizar_movimiento(
  p_asiento      uuid,
  p_fecha        date,
  p_tipo         text,
  p_descripcion  text,
  p_cuenta_debe  uuid,
  p_cuenta_haber uuid,
  p_monto        numeric,
  p_moneda       text default 'GTQ',
  p_tc           numeric default 1
)
returns uuid
language plpgsql
as $$
declare
  v_base      numeric;
  v_md_debe   text;
  v_md_haber  text;
  v_nat_debe  numeric;
  v_nat_haber numeric;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor que 0.';
  end if;
  if p_cuenta_debe = p_cuenta_haber then
    raise exception 'La cuenta de origen y la de destino deben ser distintas.';
  end if;
  if p_tc is null or p_tc <= 0 then
    raise exception 'El tipo de cambio debe ser mayor que 0.';
  end if;

  update asientos
    set fecha = coalesce(p_fecha, current_date),
        tipo = p_tipo,
        descripcion = nullif(trim(p_descripcion), '')
    where id = p_asiento;
  if not found then
    raise exception 'Movimiento no encontrado.';
  end if;

  select moneda into v_md_debe  from cuentas where id = p_cuenta_debe;
  select moneda into v_md_haber from cuentas where id = p_cuenta_haber;
  if v_md_debe not in ('GTQ', p_moneda) or v_md_haber not in ('GTQ', p_moneda) then
    raise exception 'Las cuentas deben estar en GTQ o en % (la moneda del movimiento).', p_moneda;
  end if;

  v_base      := round(p_monto * p_tc, 2);
  v_nat_debe  := case when v_md_debe  = 'GTQ' then v_base else p_monto end;
  v_nat_haber := case when v_md_haber = 'GTQ' then v_base else p_monto end;

  delete from partidas where asiento_id = p_asiento;
  insert into partidas (asiento_id, cuenta_id, monto, moneda, monto_base) values
    (p_asiento, p_cuenta_debe,   v_nat_debe,  v_md_debe,  v_base),
    (p_asiento, p_cuenta_haber, -v_nat_haber, v_md_haber, -v_base);

  if p_moneda <> 'GTQ' then
    insert into tasas_cambio (moneda, tasa) values (p_moneda, p_tc)
    on conflict (user_id, moneda) do update set tasa = excluded.tasa, updated_at = now();
  end if;

  return p_asiento;
end;
$$;

-- 7) Informes consolidados en moneda base (monto_base).
create or replace function balance_general(p_fecha date)
returns table (tipo text, cuenta_id uuid, nombre text, saldo numeric)
language sql stable as $$
  select c.tipo, c.id, c.nombre,
    coalesce(sum(p.monto_base) filter (where a.fecha <= p_fecha), 0)
      * case when c.tipo = 'activo' then 1 else -1 end as saldo
  from cuentas c
  left join partidas p on p.cuenta_id = c.id
  left join asientos a on a.id = p.asiento_id
  where c.tipo in ('activo','pasivo','patrimonio')
  group by c.tipo, c.id, c.nombre
  order by c.tipo, c.nombre;
$$;

create or replace function estado_resultados(p_anio int, p_mes int)
returns table (tipo text, cuenta_id uuid, nombre text, monto numeric)
language sql stable as $$
  select c.tipo, c.id, c.nombre,
    coalesce(sum(p.monto_base) filter (
      where extract(year from a.fecha) = p_anio and extract(month from a.fecha) = p_mes
    ), 0) * case when c.tipo = 'ingreso' then -1 else 1 end as monto
  from cuentas c
  left join partidas p on p.cuenta_id = c.id
  left join asientos a on a.id = p.asiento_id
  where c.tipo in ('ingreso','gasto')
  group by c.tipo, c.id, c.nombre
  order by c.tipo, c.nombre;
$$;

create or replace function presupuesto_vs_real(p_anio int, p_mes int)
returns table (cuenta_id uuid, nombre text, presupuesto numeric, monto_real numeric, diferencia numeric)
language sql stable as $$
  select c.id, c.nombre,
    coalesce(b.monto, 0) as presupuesto,
    coalesce(sum(p.monto_base) filter (
      where extract(year from a.fecha) = p_anio and extract(month from a.fecha) = p_mes
    ), 0) as monto_real,
    coalesce(sum(p.monto_base) filter (
      where extract(year from a.fecha) = p_anio and extract(month from a.fecha) = p_mes
    ), 0) - coalesce(b.monto, 0) as diferencia
  from cuentas c
  left join presupuestos b on b.cuenta_id = c.id and b.anio = p_anio and b.mes = p_mes
  left join partidas p on p.cuenta_id = c.id
  left join asientos a on a.id = p.asiento_id
  where c.tipo = 'gasto'
  group by c.id, c.nombre, b.monto
  order by c.nombre;
$$;

create or replace function patrimonio_mensual(p_desde date, p_hasta date)
returns table (mes date, patrimonio numeric)
language sql stable as $$
  with meses as (
    select generate_series(date_trunc('month', p_desde), date_trunc('month', p_hasta), interval '1 month')::date as mes
  )
  select m.mes,
    coalesce(sum(
      p.monto_base * case when c.tipo = 'activo' then 1 when c.tipo = 'pasivo' then -1 else 0 end
    ) filter (where a.fecha < (m.mes + interval '1 month')), 0) as patrimonio
  from meses m
  left join asientos a on true
  left join partidas p on p.asiento_id = a.id
  left join cuentas  c on c.id = p.cuenta_id
  group by m.mes
  order by m.mes;
$$;
