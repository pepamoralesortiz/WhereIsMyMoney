"use client";

import { useActionState } from "react";
import { money } from "@/lib/finance";
import {
  guardarPresupuesto,
  type PresupuestoState,
} from "@/app/(app)/presupuesto/actions";

type Item = { cuenta_id: string; nombre: string; monto: number };

export default function PresupuestoForm({
  items,
  anio,
  mes,
}: {
  items: Item[];
  anio: number;
  mes: number;
}) {
  const [state, action, pending] = useActionState<PresupuestoState, FormData>(
    guardarPresupuesto,
    {},
  );

  const totalInicial = items.reduce((s, i) => s + i.monto, 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="anio" value={anio} />
      <input type="hidden" name="mes" value={mes} />

      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map((i) => (
          <li
            key={i.cuenta_id}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <span className="min-w-0 flex-1 truncate text-sm">{i.nombre}</span>
            <input
              name={`monto_${i.cuenta_id}`}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              defaultValue={i.monto || ""}
              placeholder="0"
              className="w-28 rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-right text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700"
            />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-500">Total presupuestado (al abrir)</span>
        <span className="font-medium tabular-nums">{money(totalInicial)}</span>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          Presupuesto guardado ✓
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-base font-medium text-white transition active:scale-[.99] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar presupuesto"}
      </button>
    </form>
  );
}
