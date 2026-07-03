import Link from "next/link";
import { notFound } from "next/navigation";
import MovimientoForm, {
  type MovimientoInicial,
} from "@/components/MovimientoForm";
import { createClient } from "@/lib/supabase/server";
import {
  BASE_MONEDA,
  movimientoDesdePartidas,
  type Cuenta,
  type TipoMovimiento,
} from "@/lib/finance";
import { actualizarMovimiento } from "../../actions";

type Leg = {
  cuenta_id: string;
  monto: number;
  monto_base: number;
  moneda: string;
};

const TIPOS_EDITABLES = new Set(["gasto", "ingreso", "transferencia"]);

export default async function EditarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [asientoRes, cuentasRes, tasasRes] = await Promise.all([
    supabase
      .from("asientos")
      .select(
        "id, fecha, tipo, descripcion, partidas(cuenta_id, monto, monto_base, moneda)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("cuentas")
      .select("id, nombre, tipo, subtipo, moneda, archivada")
      .eq("archivada", false)
      .order("nombre"),
    supabase.from("tasas_cambio").select("moneda, tasa"),
  ]);

  const asiento = asientoRes.data as
    | { id: string; fecha: string; tipo: string; descripcion: string | null; partidas: Leg[] }
    | null;
  if (!asiento) notFound();

  if (!TIPOS_EDITABLES.has(asiento.tipo)) {
    return (
      <main>
        <h1 className="mb-3 text-xl font-semibold tracking-tight">
          Editar movimiento
        </h1>
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Este movimiento ({asiento.tipo}) no es editable desde aquí. Puedes
          eliminarlo y volver a crearlo.
        </p>
        <Link
          href="/movimientos"
          className="mt-4 inline-block text-sm text-teal-600 dark:text-teal-400"
        >
          ← Volver
        </Link>
      </main>
    );
  }

  const legs = asiento.partidas.map((p) => ({
    cuenta_id: p.cuenta_id,
    monto: Number(p.monto),
    monto_base: Number(p.monto_base),
    moneda: p.moneda,
  }));
  const debe = legs.find((l) => l.monto > 0)!;
  const haber = legs.find((l) => l.monto < 0)!;

  const tipo = asiento.tipo as TipoMovimiento;
  const { cuentaA, cuentaB } = movimientoDesdePartidas(
    tipo,
    debe.cuenta_id,
    haber.cuenta_id,
  );

  // Reconstruir moneda / monto de entrada / tipo de cambio.
  const foranea = legs.find((l) => l.moneda !== BASE_MONEDA);
  const base = Math.abs(debe.monto_base);
  const moneda = foranea ? foranea.moneda : BASE_MONEDA;
  const montoEntrada = foranea ? Math.abs(foranea.monto) : base;
  const tc = foranea && montoEntrada > 0 ? base / montoEntrada : 1;

  const initial: MovimientoInicial = {
    id: asiento.id,
    tipo,
    monto: montoEntrada,
    cuentaA,
    cuentaB,
    fecha: asiento.fecha,
    descripcion: asiento.descripcion ?? "",
    moneda,
    tc: Math.round(tc * 10000) / 10000,
  };

  const cuentas = (cuentasRes.data ?? []) as Cuenta[];
  const tasas = Object.fromEntries(
    (tasasRes.data ?? []).map((t) => [t.moneda as string, Number(t.tasa)]),
  );
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <main>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">
        Editar movimiento
      </h1>
      <MovimientoForm
        cuentas={cuentas}
        hoy={hoy}
        tasas={tasas}
        action={actualizarMovimiento}
        initial={initial}
        submitLabel="Guardar cambios"
      />
    </main>
  );
}
