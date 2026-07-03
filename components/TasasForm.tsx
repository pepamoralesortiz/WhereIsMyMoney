"use client";

import { useActionState } from "react";
import { guardarTasas, type TasasState } from "@/app/(app)/configuracion/actions";

// Monedas extranjeras configurables (la base GTQ no lleva tasa).
const FORANEAS = ["USD", "EUR"];

export default function TasasForm({
  tasas,
}: {
  tasas: Record<string, number>;
}) {
  const [state, action, pending] = useActionState<TasasState, FormData>(
    guardarTasas,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      {FORANEAS.map((m) => (
        <div key={m} className="flex items-center justify-between gap-3">
          <label htmlFor={`tasa_${m}`} className="text-sm">
            1 {m} =
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`tasa_${m}`}
              name={`tasa_${m}`}
              type="number"
              inputMode="decimal"
              step="0.0001"
              min="0"
              defaultValue={tasas[m] || ""}
              placeholder="0"
              className="w-28 rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-right text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700"
            />
            <span className="text-sm text-neutral-500">GTQ</span>
          </div>
        </div>
      ))}

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          Tasas guardadas ✓
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-base font-medium text-white transition active:scale-[.99] disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar tasas"}
      </button>
    </form>
  );
}
