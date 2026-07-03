import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PresupuestoForm from "@/components/PresupuestoForm";

function nombreMes(anio: number, mes: number) {
  return new Intl.DateTimeFormat("es", {
    month: "long",
    year: "numeric",
  }).format(new Date(anio, mes - 1, 1));
}

export default async function PresupuestoPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const anio = Number(sp.anio) || now.getUTCFullYear();
  const mes = Number(sp.mes) || now.getUTCMonth() + 1;

  const prev = mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
  const next = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };

  const supabase = await createClient();
  const [cats, pres] = await Promise.all([
    supabase
      .from("cuentas")
      .select("id, nombre")
      .eq("tipo", "gasto")
      .eq("archivada", false)
      .order("nombre"),
    supabase
      .from("presupuestos")
      .select("cuenta_id, monto")
      .eq("anio", anio)
      .eq("mes", mes),
  ]);

  const montoPorCuenta = new Map<string, number>(
    (pres.data ?? []).map((p) => [p.cuenta_id as string, Number(p.monto)]),
  );
  const items = (cats.data ?? []).map((c) => ({
    cuenta_id: c.id as string,
    nombre: c.nombre as string,
    monto: montoPorCuenta.get(c.id as string) ?? 0,
  }));

  return (
    <main>
      <h1 className="mb-3 text-xl font-semibold tracking-tight">Presupuesto</h1>

      {/* Navegación de mes */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          href={`/presupuesto?anio=${prev.anio}&mes=${prev.mes}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          ‹
        </Link>
        <span className="text-sm font-medium capitalize">
          {nombreMes(anio, mes)}
        </span>
        <Link
          href={`/presupuesto?anio=${next.anio}&mes=${next.mes}`}
          className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          ›
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">
            No tienes rubros de gasto todavía.
          </p>
          <Link
            href="/categorias"
            className="mt-3 inline-block rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
          >
            Crear categorías de gasto
          </Link>
        </div>
      ) : (
        <PresupuestoForm items={items} anio={anio} mes={mes} />
      )}
    </main>
  );
}
