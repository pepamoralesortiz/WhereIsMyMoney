import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Cuenta } from "@/lib/finance";
import { toggleArchivada } from "../cuentas/actions";
import QuickAddCategoria from "@/components/QuickAddCategoria";

export default async function CategoriasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuentas")
    .select("id, nombre, tipo, subtipo, moneda, archivada")
    .eq("tipo", "gasto")
    .order("nombre");

  const categorias = (data ?? []) as Cuenta[];
  const activas = categorias.filter((c) => !c.archivada);
  const archivadas = categorias.filter((c) => c.archivada);

  return (
    <main>
      <h1 className="mb-1 text-xl font-semibold tracking-tight">
        Categorías de gasto
      </h1>
      <p className="mb-5 text-xs text-neutral-500">
        Cada categoría es una cuenta de tipo Gasto. Aparecen al registrar un
        gasto.
      </p>

      <QuickAddCategoria />

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error.message}
        </p>
      )}

      {!error && activas.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Aún no tienes categorías. Añade la primera arriba.
        </p>
      )}

      {activas.length > 0 && (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
          {activas.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 px-4 py-3"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{c.nombre}</span>
              <div className="flex items-center gap-1">
                <Link
                  href={`/cuentas/${c.id}/editar`}
                  className="rounded-md px-2 py-1 text-xs text-teal-600 dark:text-teal-400"
                >
                  Editar
                </Link>
                <form action={toggleArchivada}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="archivada" value="false" />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-xs text-neutral-500"
                  >
                    Archivar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {archivadas.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Archivadas
          </h2>
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {archivadas.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-4 py-3 text-neutral-400"
              >
                <span className="truncate text-sm">{c.nombre}</span>
                <form action={toggleArchivada}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="archivada" value="true" />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-xs text-teal-600 dark:text-teal-400"
                  >
                    Restaurar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
