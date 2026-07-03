import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, ORDEN_TIPOS, TIPOS_CUENTA_LABEL, type TipoCuenta } from "@/lib/finance";

type SaldoRow = {
  cuenta_id: string;
  nombre: string;
  tipo: TipoCuenta;
  moneda: string;
  saldo: number;
  archivada: boolean;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_saldos")
    .select("cuenta_id, nombre, tipo, moneda, saldo, archivada")
    .eq("archivada", false)
    .order("tipo")
    .order("nombre");

  const rows = (data ?? []) as SaldoRow[];

  const grupos = new Map<TipoCuenta, SaldoRow[]>();
  for (const r of rows) {
    if (!grupos.has(r.tipo)) grupos.set(r.tipo, []);
    grupos.get(r.tipo)!.push(r);
  }
  const tipos = ORDEN_TIPOS.filter((t) => grupos.has(t));

  return (
    <main>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Inicio</h1>
        <Link
          href="/movimientos/nuevo"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition active:scale-[.99]"
        >
          + Movimiento
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Error al leer v_saldos: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Aún no tienes cuentas.</p>
          <Link
            href="/cuentas/nueva"
            className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
          >
            Crear tu primera cuenta
          </Link>
        </div>
      )}

      <div className="space-y-6">
        {tipos.map((tipo) => (
          <section key={tipo}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {TIPOS_CUENTA_LABEL[tipo]}
            </h2>
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {grupos.get(tipo)!.map((r) => (
                <li
                  key={r.cuenta_id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className="text-sm">{r.nombre}</span>
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      r.saldo < 0 ? "text-red-600 dark:text-red-400" : ""
                    }`}
                  >
                    {money(Number(r.saldo), r.moneda)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
