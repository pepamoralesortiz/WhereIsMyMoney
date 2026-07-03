import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/finance";
import { BarrasResultados, LineaPatrimonio } from "@/components/Charts";

type ResRow = { mes: string; ingresos: number; gastos: number; resultado: number };
type PatRow = { mes: string; patrimonio: number };

const pad = (n: number) => String(n).padStart(2, "0");
const ultimoDia = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};
function nombreMesLargo(mesISO: string) {
  const [y, m] = mesISO.split("-").map(Number);
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(
    new Date(y, m - 1, 1),
  );
}

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const curY = now.getUTCFullYear();
  const curM = now.getUTCMonth(); // 0-based

  const hastaYM = sp.hasta || `${curY}-${pad(curM + 1)}`;
  const desdeDefault = new Date(Date.UTC(curY, curM - 5, 1));
  const desdeYM =
    sp.desde || `${desdeDefault.getUTCFullYear()}-${pad(desdeDefault.getUTCMonth() + 1)}`;

  const pDesde = `${desdeYM}-01`;
  const pHasta = ultimoDia(hastaYM);

  const supabase = await createClient();
  const [resRes, patRes] = await Promise.all([
    supabase.rpc("resultados_mensuales", { p_desde: pDesde, p_hasta: pHasta }),
    supabase.rpc("patrimonio_mensual", { p_desde: pDesde, p_hasta: pHasta }),
  ]);

  const resultados = ((resRes.data ?? []) as ResRow[]).map((r) => ({
    mes: r.mes,
    ingresos: Number(r.ingresos),
    gastos: Number(r.gastos),
    resultado: Number(r.resultado),
  }));
  const patrimonio = ((patRes.data ?? []) as PatRow[]).map((r) => ({
    mes: r.mes,
    patrimonio: Number(r.patrimonio),
  }));

  return (
    <main>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Informes</h1>

      {/* Filtro de periodo */}
      <form method="get" className="mb-6 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="desde" className="block text-xs text-neutral-500">Desde</label>
          <input
            id="desde"
            name="desde"
            type="month"
            defaultValue={desdeYM}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-teal-500 dark:border-neutral-700"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="hasta" className="block text-xs text-neutral-500">Hasta</label>
          <input
            id="hasta"
            name="hasta"
            type="month"
            defaultValue={hastaYM}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-teal-500 dark:border-neutral-700"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700"
        >
          Ver
        </button>
      </form>

      {/* Estado de resultados */}
      <section className="mb-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">Estado de resultados</h2>
        <BarrasResultados data={resultados} />
        <ul className="mt-4 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {resultados.map((r) => (
            <li key={r.mes} className="flex items-center justify-between gap-2 py-2">
              <span className="w-28 shrink-0 capitalize text-neutral-500">
                {nombreMesLargo(r.mes)}
              </span>
              <span className="flex-1 text-right text-xs tabular-nums text-neutral-400">
                {money(r.ingresos)} · {money(r.gastos)}
              </span>
              <span
                className={`w-24 text-right font-medium tabular-nums ${
                  r.resultado < 0 ? "text-red-600 dark:text-red-400" : "text-teal-600 dark:text-teal-400"
                }`}
              >
                {money(r.resultado)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Balance histórico (patrimonio) */}
      <section className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="mb-3 text-sm font-semibold">Patrimonio histórico</h2>
        <LineaPatrimonio data={patrimonio} />
        <ul className="mt-4 divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
          {patrimonio.map((r, i) => {
            const delta = i === 0 ? null : r.patrimonio - patrimonio[i - 1].patrimonio;
            return (
              <li key={r.mes} className="flex items-center justify-between gap-2 py-2">
                <span className="w-28 shrink-0 capitalize text-neutral-500">
                  {nombreMesLargo(r.mes)}
                </span>
                <span className="flex-1 text-right tabular-nums">
                  {money(r.patrimonio)}
                </span>
                <span
                  className={`w-28 text-right text-xs tabular-nums ${
                    delta === null
                      ? "text-neutral-300"
                      : delta < 0
                        ? "text-red-600 dark:text-red-400"
                        : delta > 0
                          ? "text-teal-600 dark:text-teal-400"
                          : "text-neutral-400"
                  }`}
                >
                  {delta === null
                    ? "—"
                    : `${delta > 0 ? "▲" : delta < 0 ? "▼" : ""} ${money(Math.abs(delta))}`}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
