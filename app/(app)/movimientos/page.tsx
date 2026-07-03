import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, BASE_MONEDA } from "@/lib/finance";
import { eliminarMovimiento } from "./actions";

type Partida = {
  monto: number;
  monto_base: number;
  moneda: string;
  cuenta: { nombre: string } | null;
};
type AsientoRow = {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string | null;
  partidas: Partida[];
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  // Default: mes en curso.
  const desde = sp.desde || fmt(new Date(Date.UTC(y, m, 1)));
  const hasta = sp.hasta || fmt(new Date(Date.UTC(y, m + 1, 0)));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asientos")
    .select(
      "id, fecha, tipo, descripcion, partidas(monto, monto_base, moneda, cuenta:cuentas(nombre))",
    )
    .gte("fecha", desde)
    .lte("fecha", hasta)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const asientos = (data ?? []) as unknown as AsientoRow[];
  const totalBase = asientos.reduce((s, a) => {
    const pos = a.partidas.find((p) => Number(p.monto) > 0);
    return s + Math.abs(Number(pos?.monto_base ?? 0));
  }, 0);

  return (
    <main>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Movimientos</h1>
        <Link
          href="/movimientos/nuevo"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition active:scale-[.99]"
        >
          + Nuevo
        </Link>
      </div>

      {/* Filtro por rango de fechas (GET) */}
      <form method="get" className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="desde" className="block text-xs text-neutral-500">
            Desde
          </label>
          <input
            id="desde"
            name="desde"
            type="date"
            defaultValue={desde}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-teal-500 dark:border-neutral-700"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="hasta" className="block text-xs text-neutral-500">
            Hasta
          </label>
          <input
            id="hasta"
            name="hasta"
            type="date"
            defaultValue={hasta}
            className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-teal-500 dark:border-neutral-700"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700"
        >
          Filtrar
        </button>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error.message}
        </p>
      )}

      {!error && asientos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Sin movimientos en este rango.
        </p>
      ) : (
        <>
          <p className="mb-2 flex items-center justify-between text-xs text-neutral-500">
            <span>{asientos.length} movimiento(s)</span>
            <span className="tabular-nums">Total: {money(totalBase)}</span>
          </p>
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {asientos.map((a) => {
              const pos = a.partidas.find((p) => Number(p.monto) > 0);
              const neg = a.partidas.find((p) => Number(p.monto) < 0);
              const base = Math.abs(Number(pos?.monto_base ?? 0));
              const foranea = a.partidas.find((p) => p.moneda !== BASE_MONEDA);
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 px-4 py-3"
                >
                  <Link
                    href={`/movimientos/${a.id}/editar`}
                    className="min-w-0 flex-1"
                  >
                    <p className="truncate text-sm">{a.descripcion || a.tipo}</p>
                    <p className="truncate text-xs text-neutral-400">
                      {a.fecha} · {neg?.cuenta?.nombre ?? "—"} →{" "}
                      {pos?.cuenta?.nombre ?? "—"}
                      {foranea
                        ? ` · ${money(Math.abs(Number(foranea.monto)), foranea.moneda)}`
                        : ""}
                    </p>
                  </Link>
                  <span className="text-sm font-medium tabular-nums">
                    {money(base)}
                  </span>
                  <form action={eliminarMovimiento}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-md px-2 py-1 text-xs text-red-600 dark:text-red-400"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
