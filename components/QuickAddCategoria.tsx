"use client";

import { useActionState, useEffect, useRef } from "react";
import { crearCategoria, type CategoriaState } from "@/app/(app)/categorias/actions";

export default function QuickAddCategoria() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<CategoriaState, FormData>(
    crearCategoria,
    {},
  );

  // Limpia el campo tras un alta exitosa (state sin error).
  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mb-5">
      <div className="flex gap-2">
        <input
          name="nombre"
          required
          autoComplete="off"
          placeholder="Nueva categoría: Comida, Transporte…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-base font-medium text-white transition active:scale-[.99] disabled:opacity-60"
        >
          {pending ? "…" : "Añadir"}
        </button>
      </div>
      {state.error && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  );
}
