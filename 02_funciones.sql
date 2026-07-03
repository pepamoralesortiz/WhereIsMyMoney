-- ============================================================================
-- Finance Tracker — Funciones de captura (etapa 2)
-- Idempotente. Requiere 01_esquema.sql aplicado.
-- ============================================================================

-- Crea un movimiento de dos partidas (cargo/abono) en un solo asiento, de forma
-- atómica. SECURITY INVOKER (default): user_id = auth.uid() y aplica RLS.
--   p_cuenta_debe  -> recibe el cargo  (+monto)
--   p_cuenta_haber -> recibe el abono  (-monto)
-- El trigger de partida doble valida que el asiento sume 0.
create or replace function crear_movimiento(
  p_fecha        date,
  p_tipo         text,
  p_descripcion  text,
  p_cuenta_debe  uuid,
  p_cuenta_haber uuid,
  p_monto        numeric
)
returns uuid
language plpgsql
as $$
declare
  v_asiento uuid;
begin
  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor que 0.';
  end if;
  if p_cuenta_debe = p_cuenta_haber then
    raise exception 'La cuenta de origen y la de destino deben ser distintas.';
  end if;

  insert into asientos (fecha, tipo, descripcion)
  values (coalesce(p_fecha, current_date), p_tipo, nullif(trim(p_descripcion), ''))
  returning id into v_asiento;

  insert into partidas (asiento_id, cuenta_id, monto) values
    (v_asiento, p_cuenta_debe,  p_monto),
    (v_asiento, p_cuenta_haber, -p_monto);

  return v_asiento;
end;
$$;
