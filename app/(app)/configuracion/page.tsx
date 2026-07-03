import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TasasForm from "@/components/TasasForm";

const MENU = [
  {
    href: "/cuentas",
    titulo: "Cuentas",
    desc: "Tu plan de cuentas: activos, pasivos, patrimonio.",
  },
  {
    href: "/categorias",
    titulo: "Categorías",
    desc: "Rubros de gasto e ingreso.",
  },
  {
    href: "/presupuesto",
    titulo: "Presupuesto",
    desc: "Monto mensual por rubro de gasto.",
  },
];

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("tasas_cambio").select("moneda, tasa");
  const tasas = Object.fromEntries(
    (data ?? []).map((t) => [t.moneda as string, Number(t.tasa)]),
  );

  return (
    <main>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">
        Configuración
      </h1>

      <ul className="mb-8 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {MENU.map((m) => (
          <li key={m.href}>
            <Link
              href={m.href}
              className="flex items-center justify-between gap-3 px-4 py-3.5 transition active:bg-neutral-50 dark:active:bg-neutral-900"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{m.titulo}</span>
                <span className="block truncate text-xs text-neutral-500">
                  {m.desc}
                </span>
              </span>
              <span className="text-neutral-400">›</span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-1 text-sm font-semibold">Tipo de cambio</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Tasa fija usada al registrar movimientos en otra moneda (puedes
          ajustarla en cada movimiento).
        </p>
        <TasasForm tasas={tasas} />
      </section>
    </main>
  );
}
