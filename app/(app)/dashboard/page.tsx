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

type PvrRow = {
  cuenta_id: string;
  nombre: string;
  presupuesto: number;
  monto_real: number;
  diferencia: number;
};

function nombreMes(anio: number, mes: number) {
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(
    new Date(anio, mes - 1, 1),
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const anio = now.getUTCFullYear();
  const mes = now.getUTCMonth() + 1;

  const [saldosRes, pvrRes] = await Promise.all([
    supabase
      .from("v_saldos")
      .select("cuenta_id, nombre, tipo, moneda, saldo, archivada")
      .eq("archivada", false)
      .order("tipo")
      .order("nombre"),
    supabase.rpc("presupuesto_vs_real", { p_anio: anio, p_mes: mes }),
  ]);

  const rows = (saldosRes.data ?? []) as SaldoRow[];
  const pvr = ((pvrRes.data ?? []) as PvrRow[])
    .map((r) => ({
      ...r,
      presupuesto: Number(r.presupuesto),
      monto_real: Number(r.monto_real),
    }))
    .filter((r) => r.presupuesto > 0)
    .sort((a, b) => b.monto_real / (b.presupuesto || 1) - a.monto_real / (a.presupuesto || 1));

  const totalPres = pvr.reduce((s, r) => s + r.presupuesto, 0);
  const totalReal = pvr.reduce((s, r) => s + r.monto_real, 0);
  const pctTotal = totalPres > 0 ? Math.round((totalReal / totalPres) * 100) : 0;

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

      {/* Presupuesto del mes */}
      <section className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Presupuesto ·{" "}
            <span className="font-normal capitalize text-neutral-500">
              {nombreMes(anio, mes)}
            </span>
          </h2>
          <Link
            href="/presupuesto"
            className="text-xs text-teal-600 dark:text-teal-400"
          >
            Editar
          </Link>
        </div>

        {totalPres === 0 ? (
          <p className="text-sm text-neutral-500">
            Aún no defines presupuesto este mes.{" "}
            <Link href="/presupuesto" className="text-teal-600 underline dark:text-teal-400">
              Definir ahora
            </Link>
          </p>
        ) : (
          <>
            {/* Total */}
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm text-neutral-500">Gastado</span>
              <span className="text-sm font-medium tabular-nums">
                {money(totalReal)}{" "}
                <span className="text-neutral-400">/ {money(totalPres)}</span>
              </span>
            </div>
            <Barra pct={pctTotal} over={totalReal > totalPres} alto />
            <p
              className={`mb-4 mt-1 text-right text-xs ${
                totalReal > totalPres
                  ? "text-red-600 dark:text-red-400"
                  : "text-neutral-400"
              }`}
            >
              {pctTotal}% del presupuesto
              {totalReal > totalPres
                ? ` · te pasaste ${money(totalReal - totalPres)}`
                : ` · queda ${money(totalPres - totalReal)}`}
            </p>

            {/* Por rubro */}
            <ul className="space-y-3">
              {pvr.map((r) => {
                const pct =
                  r.presupuesto > 0
                    ? Math.round((r.monto_real / r.presupuesto) * 100)
                    : 0;
                const over = r.monto_real > r.presupuesto;
                return (
                  <li key={r.cuenta_id}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {r.nombre}
                      </span>
                      <span className="text-xs tabular-nums text-neutral-500">
                        {money(r.monto_real)} / {money(r.presupuesto)}
                      </span>
                    </div>
                    <Barra pct={pct} over={over} />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Saldos */}
      {saldosRes.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Error al leer v_saldos: {saldosRes.error.message}
        </p>
      )}

      {!saldosRes.error && rows.length === 0 && (
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

// Barra de progreso simple (gráfico) para el presupuesto.
function Barra({
  pct,
  over,
  alto,
}: {
  pct: number;
  over: boolean;
  alto?: boolean;
}) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 ${
        alto ? "h-2.5" : "h-2"
      }`}
    >
      <div
        className={`h-full rounded-full ${
          over ? "bg-red-500" : "bg-teal-500"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
