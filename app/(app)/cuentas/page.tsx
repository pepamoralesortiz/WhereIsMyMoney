import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ORDEN_TIPOS,
  TIPOS_CUENTA_LABEL,
  type Cuenta,
  type TipoCuenta,
} from "@/lib/finance";
import { toggleArchivada } from "./actions";

export default async function CuentasPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuentas")
    .select("id, nombre, tipo, subtipo, moneda, archivada")
    .order("tipo")
    .order("nombre");

  const cuentas = (data ?? []) as Cuenta[];
  const activas = cuentas.filter((c) => !c.archivada);
  const archivadas = cuentas.filter((c) => c.archivada);

  const grupos = new Map<TipoCuenta, Cuenta[]>();
  for (const c of activas) {
    if (!grupos.has(c.tipo)) grupos.set(c.tipo, []);
    grupos.get(c.tipo)!.push(c);
  }
  const tipos = ORDEN_TIPOS.filter((t) => grupos.has(t));

  return (
    <main>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Cuentas</h1>
        <Link
          href="/cuentas/nueva"
          className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition active:scale-[.99]"
        >
          + Nueva
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error.message}
        </p>
      )}

      {!error && cuentas.length === 0 && (
        <p className="rounded-xl border border-dashed border-neutral-300 px-4 py-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          Aún no tienes cuentas. Crea la primera con “+ Nueva”.
        </p>
      )}

      <div className="space-y-6">
        {tipos.map((tipo) => (
          <section key={tipo}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {TIPOS_CUENTA_LABEL[tipo]}
            </h2>
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {grupos.get(tipo)!.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 px-4 py-3"
                >
                  <Link href={`/movimientos?cuenta=${c.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm">{c.nombre}</p>
                    <p className="text-xs text-neutral-400">
                      {c.moneda}
                      {c.subtipo ? ` · ${c.subtipo}` : ""}
                    </p>
                  </Link>
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
          </section>
        ))}
      </div>

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
                <span className="truncate text-sm">
                  {c.nombre}{" "}
                  <span className="text-xs">
                    ({TIPOS_CUENTA_LABEL[c.tipo]})
                  </span>
                </span>
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
