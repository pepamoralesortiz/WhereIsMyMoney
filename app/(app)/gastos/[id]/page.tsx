import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/finance";

type MovRow = {
  monto_base: number;
  asiento: { id: string; fecha: string; descripcion: string | null; tipo: string } | null;
};

const fmt = (d: Date) => d.toISOString().slice(0, 10);
function nombreMes(anio: number, mes: number) {
  return new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(
    new Date(anio, mes - 1, 1),
  );
}

export default async function DetalleGastoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const now = new Date();
  const anio = Number(sp.anio) || now.getUTCFullYear();
  const mes = Number(sp.mes) || now.getUTCMonth() + 1;
  const desde = fmt(new Date(Date.UTC(anio, mes - 1, 1)));
  const hasta = fmt(new Date(Date.UTC(anio, mes, 0)));

  const supabase = await createClient();
  const [cuentaRes, movRes] = await Promise.all([
    supabase.from("cuentas").select("nombre, tipo").eq("id", id).single(),
    supabase
      .from("partidas")
      .select("monto_base, asiento:asientos!inner(id, fecha, descripcion, tipo)")
      .eq("cuenta_id", id)
      .gte("asiento.fecha", desde)
      .lte("asiento.fecha", hasta)
      .order("fecha", { referencedTable: "asiento", ascending: false }),
  ]);

  if (!cuentaRes.data) notFound();
  const cuenta = cuentaRes.data as { nombre: string; tipo: string };
  const movs = ((movRes.data ?? []) as unknown as MovRow[]).filter((m) => m.asiento);
  const total = movs.reduce((s, m) => s + Number(m.monto_base), 0);

  return (
    <main>
      <Link
        href={`/dashboard?anio=${anio}&mes=${mes}`}
        className="mb-3 inline-block text-sm text-teal-600 dark:text-teal-400"
      >
        ← Inicio
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">{cuenta.nombre}</h1>
      <p className="mb-4 text-xs capitalize text-neutral-500">{nombreMes(anio, mes)}</p>

      <div className="mb-4 flex items-baseline justify-between rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <span className="text-sm text-neutral-500">Total del mes</span>
        <span className="text-lg font-semibold tabular-nums">{money(total)}</span>
      </div>

      {movs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Sin movimientos en este rubro para el mes.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {movs.map((m, i) => (
            <li key={i}>
              <Link
                href={`/movimientos/${m.asiento!.id}/editar`}
                className="flex items-center justify-between gap-2 px-4 py-3 transition active:bg-neutral-50 dark:active:bg-neutral-900"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    {m.asiento!.descripcion || m.asiento!.tipo}
                  </span>
                  <span className="block text-xs text-neutral-400">
                    {m.asiento!.fecha}
                  </span>
                </span>
                <span className="text-sm font-medium tabular-nums">
                  {money(Number(m.monto_base))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
