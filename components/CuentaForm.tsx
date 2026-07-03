"use client";

import { useActionState } from "react";
import Link from "next/link";
import { TIPOS_CUENTA, MONEDAS, type Cuenta } from "@/lib/finance";
import type { CuentaState } from "@/app/(app)/cuentas/actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700";

export default function CuentaForm({
  action,
  cuenta,
}: {
  action: (prev: CuentaState, fd: FormData) => Promise<CuentaState>;
  cuenta?: Cuenta;
}) {
  const [state, formAction, pending] = useActionState<CuentaState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {cuenta && <input type="hidden" name="id" value={cuenta.id} />}

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          defaultValue={cuenta?.nombre ?? ""}
          required
          placeholder="Efectivo, Banco, Comida…"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="tipo" className="block text-sm font-medium">
          Tipo
        </label>
        <select
          id="tipo"
          name="tipo"
          defaultValue={cuenta?.tipo ?? "activo"}
          className={inputCls}
        >
          {TIPOS_CUENTA.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="subtipo" className="block text-sm font-medium">
          Subtipo <span className="text-neutral-400">(opcional)</span>
        </label>
        <input
          id="subtipo"
          name="subtipo"
          defaultValue={cuenta?.subtipo ?? ""}
          placeholder="Banco, Tarjeta, Servicios…"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="moneda" className="block text-sm font-medium">
          Moneda
        </label>
        <select
          id="moneda"
          name="moneda"
          defaultValue={cuenta?.moneda ?? "GTQ"}
          className={inputCls}
        >
          {MONEDAS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 text-base font-medium text-white transition active:scale-[.99] disabled:opacity-60"
        >
          {pending ? "Guardando…" : cuenta ? "Guardar cambios" : "Crear cuenta"}
        </button>
        <Link
          href="/cuentas"
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-base font-medium dark:border-neutral-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
