import { createClient } from "@/lib/supabase/server";
import { signout } from "./actions";

// La vista v_saldos une cuentas con su saldo calculado. No conozco los
// nombres exactos de columnas desde aquí, así que leo con fallbacks.
type SaldoRow = Record<string, unknown>;

function pick(row: SaldoRow, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

function money(value: number, moneda: string) {
  try {
    return new Intl.NumberFormat("es", {
      style: "currency",
      currency: moneda || "USD",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${moneda}`;
  }
}

const TIPOS_ORDEN = ["activo", "pasivo", "patrimonio", "ingreso", "gasto"];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase.from("v_saldos").select("*");

  const rows = (data ?? []) as SaldoRow[];

  // Agrupar por tipo de cuenta.
  const grupos = new Map<string, SaldoRow[]>();
  for (const row of rows) {
    const tipo = String(pick(row, ["tipo"]) ?? "otros");
    if (!grupos.has(tipo)) grupos.set(tipo, []);
    grupos.get(tipo)!.push(row);
  }
  const tiposOrdenados = [...grupos.keys()].sort(
    (a, b) => TIPOS_ORDEN.indexOf(a) - TIPOS_ORDEN.indexOf(b),
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cuentas</h1>
          <p className="text-xs text-neutral-500">{user?.email}</p>
        </div>
        <form action={signout}>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition active:scale-[.99] dark:border-neutral-700"
          >
            Salir
          </button>
        </form>
      </header>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Error al leer v_saldos: {error.message}
        </p>
      )}

      {!error && rows.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No hay cuentas todavía.
        </p>
      )}

      <div className="space-y-6">
        {tiposOrdenados.map((tipo) => (
          <section key={tipo}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {tipo}
            </h2>
            <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {grupos.get(tipo)!.map((row, i) => {
                const nombre = String(
                  pick(row, ["nombre", "cuenta", "nombre_cuenta"]) ?? "—",
                );
                const moneda = String(pick(row, ["moneda"]) ?? "USD");
                const saldo = Number(pick(row, ["saldo", "balance", "monto"]) ?? 0);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm">{nombre}</span>
                    <span
                      className={`text-sm font-medium tabular-nums ${
                        saldo < 0 ? "text-red-600 dark:text-red-400" : ""
                      }`}
                    >
                      {money(saldo, moneda)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
