-- ============================================================================
-- Finance Tracker — Informes: serie mensual de resultados (ingresos/gastos)
-- patrimonio_mensual ya existe (01/03). Todo consolidado en moneda base (GTQ).
-- ============================================================================

create or replace function resultados_mensuales(p_desde date, p_hasta date)
returns table (mes date, ingresos numeric, gastos numeric, resultado numeric)
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
    coalesce(-sum(p.monto_base) filter (where c.tipo = 'ingreso'), 0) as ingresos,
    coalesce( sum(p.monto_base) filter (where c.tipo = 'gasto'), 0)   as gastos,
    coalesce(-sum(p.monto_base) filter (where c.tipo = 'ingreso'), 0)
      - coalesce(sum(p.monto_base) filter (where c.tipo = 'gasto'), 0) as resultado
  from meses m
  left join asientos a on date_trunc('month', a.fecha) = m.mes
  left join partidas p on p.asiento_id = a.id
  left join cuentas  c on c.id = p.cuenta_id and c.tipo in ('ingreso','gasto')
  group by m.mes
  order by m.mes;
$$;
