import Link from "next/link";
import MovimientoForm from "@/components/MovimientoForm";
import { createClient } from "@/lib/supabase/server";
import type { Cuenta } from "@/lib/finance";

export default async function NuevoMovimientoPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cuentas")
    .select("id, nombre, tipo, subtipo, moneda, archivada")
    .eq("archivada", false)
    .order("nombre");

  const cuentas = (data ?? []) as Cuenta[];
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <main>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">
        Nuevo movimiento
      </h1>

      {cuentas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">
            Necesitas cuentas antes de registrar movimientos.
          </p>
          <Link
            href="/cuentas/nueva"
            className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
          >
            Crear una cuenta
          </Link>
        </div>
      ) : (
        <MovimientoForm cuentas={cuentas} hoy={hoy} />
      )}
    </main>
  );
}
