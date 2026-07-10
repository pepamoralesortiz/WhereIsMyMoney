import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { money, BASE_MONEDA } from "@/lib/finance";
import { eliminarMovimiento } from "./actions";

type Partida = {
  cuenta_id: string;
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

const SELECT =
  "id, fecha, tipo, descripcion, partidas(cuenta_id, monto, monto_base, moneda, cuenta:cuentas(nombre))";
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; cuenta?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const desde = sp.desde || fmt(new Date(Date.UTC(y, m, 1)));
  const hasta = sp.hasta || fmt(new Date(Date.UTC(y, m + 1, 0)));
  const cuentaId = sp.cuenta || "";

  const supabase = await createClient();

  // Cuentas para el selector de filtro.
  const { data: cuentasData } = await supabase
    .from("cuentas")
    .select("id, nombre, tipo")
    .order("tipo")
    .order("nombre");
  const cuentas = cuentasData ?? [];
  const cuentaSel = cuentas.find((c) => c.id === cuentaId);

  // Si se filtra por cuenta, primero obtenemos los asientos que la tocan.
  let asientos: AsientoRow[] = [];
  let queryError: string | null = null;

  if (cuentaId) {
    const { data: legs } = await supabase
      .from("partidas")
      .select("asiento:asientos!inner(id)")
      .eq("cuenta_id", cuentaId)
      .gte("asiento.fecha", desde)
      .lte("asiento.fecha", hasta);
    const ids = [
      ...new Set(
        ((legs ?? []) as unknown as { asiento: { id: string } | null }[])
          .map((l) => l.asiento?.id)
          .filter(Boolean) as string[],
      ),
    ];
    if (ids.length) {
      const { data, error } = await supabase
        .from("asientos")
        .select(SELECT)
        .in("id", ids)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false });
      asientos = (data ?? []) as unknown as AsientoRow[];
      queryError = error?.message ?? null;
    }
  } else {
    const { data, error } = await supabase
      .from("asientos")
      .select(SELECT)
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    asientos = (data ?? []) as unknown as AsientoRow[];
    queryError = error?.message ?? null;
  }

  // Total: variación de la cuenta si hay filtro; si no, total movido.
  const total = cuentaId
    ? asientos.reduce((s, a) => {
        const leg = a.partidas.find((p) => p.cuenta_id === cuentaId);
        return s + Number(leg?.monto_base ?? 0);
      }, 0)
    : asientos.reduce((s, a) => {
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

      {/* Filtros (GET) */}
      <form method="get" className="mb-4 space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="desde" className="block text-xs text-neutral-500">Desde</label>
            <input id="desde" name="desde" type="date" defaultValue={desde}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-teal-500 dark:border-neutral-700" />
          </div>
          <div className="flex-1">
            <label htmlFor="hasta" className="block text-xs text-neutral-500">Hasta</label>
            <input id="hasta" name="hasta" type="date" defaultValue={hasta}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-teal-500 dark:border-neutral-700" />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="cuenta" className="block text-xs text-neutral-500">Cuenta</label>
            <select id="cuenta" name="cuenta" defaultValue={cuentaId}
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-teal-500 dark:border-neutral-700">
              <option value="">Todas</option>
              {cuentas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <button type="submit"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium dark:border-neutral-700">
            Filtrar
          </button>
        </div>
      </form>

      {queryError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {queryError}
        </p>
      )}

      {asientos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {cuentaSel ? `Sin movimientos de ${cuentaSel.nombre} en este rango.` : "Sin movimientos en este rango."}
        </p>
      ) : (
        <>
          <p className="mb-2 flex items-center justify-between text-xs text-neutral-500">
            <span>
              {asientos.length} movimiento(s)
              {cuentaSel ? ` · ${cuentaSel.nombre}` : ""}
            </span>
            <span className="tabular-nums">
              {cuentaId ? "Variación: " : "Total: "}
              {money(total)}
            </span>
          </p>
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {asientos.map((a) => {
              // Vista "estado de cuenta" cuando hay filtro por cuenta.
              if (cuentaId) {
                const leg = a.partidas.find((p) => p.cuenta_id === cuentaId);
                const otro = a.partidas.find((p) => p.cuenta_id !== cuentaId);
                const val = Number(leg?.monto_base ?? 0);
                return (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3">
                    <Link href={`/movimientos/${a.id}/editar`} className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.descripcion || a.tipo}</p>
                      <p className="truncate text-xs text-neutral-400">
                        {a.fecha} · {otro?.cuenta?.nombre ?? "—"}
                      </p>
                    </Link>
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        val < 0 ? "text-red-600 dark:text-red-400" : "text-teal-600 dark:text-teal-400"
                      }`}
                    >
                      {val > 0 ? "+" : ""}
                      {money(val)}
                    </span>
                  </li>
                );
              }
              // Vista general (de → a).
              const pos = a.partidas.find((p) => Number(p.monto) > 0);
              const neg = a.partidas.find((p) => Number(p.monto) < 0);
              const base = Math.abs(Number(pos?.monto_base ?? 0));
              const foranea = a.partidas.find((p) => p.moneda !== BASE_MONEDA);
              return (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <Link href={`/movimientos/${a.id}/editar`} className="min-w-0 flex-1">
                    <p className="truncate text-sm">{a.descripcion || a.tipo}</p>
                    <p className="truncate text-xs text-neutral-400">
                      {a.fecha} · {neg?.cuenta?.nombre ?? "—"} → {pos?.cuenta?.nombre ?? "—"}
                      {foranea ? ` · ${money(Math.abs(Number(foranea.monto)), foranea.moneda)}` : ""}
                    </p>
                  </Link>
                  <span className="text-sm font-medium tabular-nums">{money(base)}</span>
                  <form action={eliminarMovimiento}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="rounded-md px-2 py-1 text-xs text-red-600 dark:text-red-400" title="Eliminar">
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
