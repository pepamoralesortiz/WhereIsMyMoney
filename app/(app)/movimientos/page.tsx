import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/finance";
import { eliminarMovimiento } from "./actions";

type Partida = {
  monto: number;
  cuenta: { nombre: string; moneda: string } | null;
};
type AsientoRow = {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string | null;
  partidas: Partida[];
};

export default async function MovimientosPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asientos")
    .select(
      "id, fecha, tipo, descripcion, partidas(monto, cuenta:cuentas(nombre, moneda))",
    )
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const asientos = (data ?? []) as unknown as AsientoRow[];

  return (
    <main>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Movimientos</h1>
        <Link
          href="/movimientos/nuevo"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition active:scale-[.99]"
        >
          + Nuevo
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error.message}
        </p>
      )}

      {!error && asientos.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Sin movimientos todavía.
        </p>
      )}

      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {asientos.map((a) => {
          const pos = a.partidas.find((p) => Number(p.monto) > 0);
          const neg = a.partidas.find((p) => Number(p.monto) < 0);
          const monto = Number(pos?.monto ?? 0);
          const moneda = pos?.cuenta?.moneda ?? "GTQ";
          return (
            <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {a.descripcion || a.tipo}
                </p>
                <p className="truncate text-xs text-neutral-400">
                  {a.fecha} · {neg?.cuenta?.nombre ?? "—"} →{" "}
                  {pos?.cuenta?.nombre ?? "—"}
                </p>
              </div>
              <span className="text-sm font-medium tabular-nums">
                {money(monto, moneda)}
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
    </main>
  );
}
