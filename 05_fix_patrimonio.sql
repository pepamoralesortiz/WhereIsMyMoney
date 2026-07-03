-- ============================================================================
-- Fix: patrimonio_mensual sumaba los pasivos en vez de restarlos.
-- monto_base ya trae signo natural (activos +, pasivos -), así que el
-- patrimonio neto = suma de monto_base de activos y pasivos (sin invertir).
-- ============================================================================

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
    coalesce(sum(p.monto_base) filter (
      where c.tipo in ('activo', 'pasivo')
        and a.fecha < (m.mes + interval '1 month')
    ), 0) as patrimonio
  from meses m
  left join asientos a on true
  left join partidas p on p.asiento_id = a.id
  left join cuentas  c on c.id = p.cuenta_id
  group by m.mes
  order by m.mes;
$$;
