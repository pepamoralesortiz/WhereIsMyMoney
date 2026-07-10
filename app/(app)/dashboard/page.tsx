import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, type TipoCuenta } from "@/lib/finance";

type BgRow = { tipo: TipoCuenta; cuenta_id: string; nombre: string; saldo: number };
type PvrRow = { cuenta_id: string; nombre: string; presupuesto: number; monto_real: number };
type ErRow = { tipo: "ingreso" | "gasto"; nombre: string; monto: number };

function nombreMes(anio: number, mes: number) {
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(
    new Date(anio, mes - 1, 1),
  );
}
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const anioActual = now.getUTCFullYear();
  const mesActual = now.getUTCMonth() + 1;
  const anio = Number(sp.anio) || anioActual;
  const mes = Number(sp.mes) || mesActual;

  const esMesActual = anio === anioActual && mes === mesActual;
  const fechaCorte = esMesActual
    ? fmt(now)
    : fmt(new Date(Date.UTC(anio, mes, 0))); // último día del mes

  // Rango del mes seleccionado (para enlazar a los movimientos de una cuenta).
  const mesDesde = fmt(new Date(Date.UTC(anio, mes - 1, 1)));
  const mesHasta = fmt(new Date(Date.UTC(anio, mes, 0)));

  const prev = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const next = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };

  const supabase = await createClient();
  const [pvrRes, erRes, bgRes] = await Promise.all([
    supabase.rpc("presupuesto_vs_real", { p_anio: anio, p_mes: mes }),
    supabase.rpc("estado_resultados", { p_anio: anio, p_mes: mes }),
    supabase.rpc("balance_general", { p_fecha: fechaCorte }),
  ]);

  // Presupuesto
  const pvr = ((pvrRes.data ?? []) as PvrRow[])
    .map((r) => ({ ...r, presupuesto: Number(r.presupuesto), monto_real: Number(r.monto_real) }))
    .filter((r) => r.presupuesto > 0)
    .sort((a, b) => b.monto_real - a.monto_real);
  const totalPres = pvr.reduce((s, r) => s + r.presupuesto, 0);
  const totalReal = pvr.reduce((s, r) => s + r.monto_real, 0);
  const pctTotal = totalPres > 0 ? Math.round((totalReal / totalPres) * 100) : 0;

  // Estado de resultados
  const er = (erRes.data ?? []) as ErRow[];
  const ingresos = er.filter((r) => r.tipo === "ingreso").reduce((s, r) => s + Number(r.monto), 0);
  const gastos = er.filter((r) => r.tipo === "gasto").reduce((s, r) => s + Number(r.monto), 0);
  const resultado = ingresos - gastos;

  // Balance general (al corte)
  const bg = (bgRes.data ?? []) as BgRow[];
  const porTipo = (t: TipoCuenta) => bg.filter((r) => r.tipo === t);
  const totalBase = (t: TipoCuenta) => porTipo(t).reduce((s, r) => s + Number(r.saldo), 0);
  const totActivos = totalBase("activo");
  const totPasivos = totalBase("pasivo");
  const totPatrimonio = totalBase("patrimonio");
  const patrimonioNeto = totActivos - totPasivos;
  const secciones = (
    [
      { tipo: "activo", label: "Activos", total: totActivos },
      { tipo: "pasivo", label: "Pasivos", total: totPasivos },
      { tipo: "patrimonio", label: "Patrimonio", total: totPatrimonio },
    ] as { tipo: TipoCuenta; label: string; total: number }[]
  ).filter((s) => porTipo(s.tipo).length > 0);

  const hayCuentas = bg.length > 0;

  return (
    <main>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Inicio</h1>
        <Link
          href="/movimientos/nuevo"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition active:scale-[.99]"
        >
          + Movimiento
        </Link>
      </div>

      {/* Selector de mes */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href={`/dashboard?anio=${prev.anio}&mes=${prev.mes}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          ‹
        </Link>
        <span className="text-sm font-medium capitalize">{nombreMes(anio, mes)}</span>
        {esMesActual ? (
          <span className="px-3 py-1.5 text-sm text-neutral-300">›</span>
        ) : (
          <Link
            href={`/dashboard?anio=${next.anio}&mes=${next.mes}`}
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            ›
          </Link>
        )}
      </div>

      {/* Presupuesto del mes */}
      <section className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Presupuesto vs gasto</h2>
          <Link href="/presupuesto" className="text-xs text-teal-600 dark:text-teal-400">
            Editar
          </Link>
        </div>

        {totalPres === 0 ? (
          <p className="text-sm text-neutral-500">
            Sin presupuesto este mes.{" "}
            <Link href="/presupuesto" className="text-teal-600 underline dark:text-teal-400">
              Definir
            </Link>
          </p>
        ) : (
          <>
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-sm text-neutral-500">Gastado</span>
              <span className="text-sm font-medium tabular-nums">
                {money(totalReal)} <span className="text-neutral-400">/ {money(totalPres)}</span>
              </span>
            </div>
            <Barra pct={pctTotal} alto />
            <p className={`mb-4 mt-1 text-right text-xs ${textColor(pctTotal)}`}>
              {pctTotal}%{" "}
              {totalReal > totalPres
                ? `· te pasaste ${money(totalReal - totalPres)}`
                : `· queda ${money(totalPres - totalReal)}`}
            </p>
            <ul className="space-y-3">
              {pvr.map((r) => {
                const pct = r.presupuesto > 0 ? Math.round((r.monto_real / r.presupuesto) * 100) : 0;
                return (
                  <li key={r.cuenta_id}>
                    <Link
                      href={`/gastos/${r.cuenta_id}?anio=${anio}&mes=${mes}`}
                      className="-mx-1 block rounded-lg px-1 py-0.5 transition active:bg-neutral-50 dark:active:bg-neutral-900"
                    >
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm">{r.nombre}</span>
                        <span className="text-xs tabular-nums text-neutral-500">
                          {money(r.monto_real)} / {money(r.presupuesto)}{" "}
                          <span className={`font-medium ${textColor(pct)}`}>{pct}%</span>
                        </span>
                      </div>
                      <Barra pct={pct} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {/* Estado de resultados */}
      <section className="mb-6 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Estado de resultados</h2>
          <Link href="/informes" className="text-xs text-teal-600 dark:text-teal-400">
            Ver informes
          </Link>
        </div>
        <dl className="space-y-1.5 text-sm">
          <Fila label="Ingresos" valor={money(ingresos)} />
          <Fila label="Gastos" valor={`- ${money(gastos)}`} />
          <div className="mt-1 flex items-center justify-between border-t border-neutral-200 pt-2 font-semibold dark:border-neutral-800">
            <span>Resultado</span>
            <span
              className={`tabular-nums ${
                resultado < 0 ? "text-red-600 dark:text-red-400" : "text-teal-600 dark:text-teal-400"
              }`}
            >
              {money(resultado)}
            </span>
          </div>
        </dl>
      </section>

      {/* Balance general */}
      {bgRes.error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {bgRes.error.message}
        </p>
      ) : !hayCuentas ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">Aún no tienes cuentas.</p>
          <Link href="/cuentas/nueva" className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white">
            Crear tu primera cuenta
          </Link>
        </div>
      ) : (
        <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h2 className="mb-3 text-sm font-semibold">
            Balance general ·{" "}
            <span className="font-normal text-neutral-500">
              {esMesActual ? "hoy" : `al ${fechaCorte}`}
            </span>
          </h2>
          <div className="space-y-4">
            {secciones.map((sec) => (
              <div key={sec.tipo}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    {sec.label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{money(sec.total)}</span>
                </div>
                <dl className="space-y-1 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800">
                  {porTipo(sec.tipo).map((r) => (
                    <Link
                      key={r.cuenta_id}
                      href={`/movimientos?cuenta=${r.cuenta_id}&desde=${mesDesde}&hasta=${mesHasta}`}
                      className="-mx-1 flex items-center justify-between rounded px-1 text-sm text-neutral-600 transition active:bg-neutral-50 dark:text-neutral-300 dark:active:bg-neutral-900"
                    >
                      <span className="min-w-0 flex-1 truncate">{r.nombre}</span>
                      <span className="tabular-nums">{money(Number(r.saldo))}</span>
                    </Link>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <span className="text-sm font-semibold">Patrimonio neto</span>
            <span
              className={`text-base font-semibold tabular-nums ${
                patrimonioNeto < 0 ? "text-red-600 dark:text-red-400" : ""
              }`}
            >
              {money(patrimonioNeto)}
            </span>
          </div>
          <p className="mt-1 text-right text-[11px] text-neutral-400">Activos − Pasivos · GTQ</p>
        </section>
      )}
    </main>
  );
}

function Fila({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="tabular-nums">{valor}</span>
    </div>
  );
}

// Semáforo por % del presupuesto consumido.
function barColor(pct: number) {
  if (pct > 100) return "bg-red-500";
  if (pct >= 85) return "bg-amber-500";
  return "bg-teal-500";
}
function textColor(pct: number) {
  if (pct > 100) return "text-red-600 dark:text-red-400";
  if (pct >= 85) return "text-amber-600 dark:text-amber-400";
  return "text-teal-600 dark:text-teal-400";
}

function Barra({ pct, alto }: { pct: number; alto?: boolean }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 ${
        alto ? "h-2.5" : "h-2"
      }`}
    >
      <div
        className={`h-full rounded-full ${barColor(pct)}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
