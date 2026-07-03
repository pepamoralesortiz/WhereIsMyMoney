"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Cuenta, TipoCuenta, TipoMovimiento } from "@/lib/finance";
import { crearMovimiento, type MovimientoState } from "@/app/(app)/movimientos/actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700";

// Qué tipos de cuenta aplican a cada campo, y sus etiquetas, por movimiento.
const CONFIG: Record<
  TipoMovimiento,
  { a: { label: string; tipos: TipoCuenta[] }; b: { label: string; tipos: TipoCuenta[] } }
> = {
  gasto: {
    a: { label: "Categoría de gasto", tipos: ["gasto"] },
    b: { label: "Pagado desde", tipos: ["activo", "pasivo"] },
  },
  ingreso: {
    a: { label: "Fuente de ingreso", tipos: ["ingreso"] },
    b: { label: "Recibido en", tipos: ["activo"] },
  },
  transferencia: {
    a: { label: "Hacia (destino)", tipos: ["activo", "pasivo"] },
    b: { label: "Desde (origen)", tipos: ["activo", "pasivo"] },
  },
};

const TABS: { value: TipoMovimiento; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "ingreso", label: "Ingreso" },
  { value: "transferencia", label: "Transferencia" },
];

export default function MovimientoForm({
  cuentas,
  hoy,
}: {
  cuentas: Cuenta[];
  hoy: string;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>("gasto");
  const [state, formAction, pending] = useActionState<MovimientoState, FormData>(
    crearMovimiento,
    {},
  );

  const cfg = CONFIG[tipo];
  const opcionesA = cuentas.filter((c) => cfg.a.tipos.includes(c.tipo));
  const opcionesB = cuentas.filter((c) => cfg.b.tipos.includes(c.tipo));

  return (
    <form action={formAction} className="space-y-4">
      {/* Selector de tipo */}
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-900">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTipo(t.value)}
            className={`rounded-md py-2 text-sm font-medium transition ${
              tipo === t.value
                ? "bg-white text-teal-600 shadow-sm dark:bg-neutral-800 dark:text-teal-400"
                : "text-neutral-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      <div>
        <label htmlFor="monto" className="block text-sm font-medium">
          Monto
        </label>
        <input
          id="monto"
          name="monto"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          required
          placeholder="0.00"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="cuentaA" className="block text-sm font-medium">
          {cfg.a.label}
        </label>
        <select
          id="cuentaA"
          name="cuentaA"
          required
          key={`a-${tipo}`}
          className={inputCls}
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {opcionesA.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="cuentaB" className="block text-sm font-medium">
          {cfg.b.label}
        </label>
        <select
          id="cuentaB"
          name="cuentaB"
          required
          key={`b-${tipo}`}
          className={inputCls}
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {opcionesB.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="fecha" className="block text-sm font-medium">
          Fecha
        </label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          defaultValue={hoy}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium">
          Descripción <span className="text-neutral-400">(opcional)</span>
        </label>
        <input
          id="descripcion"
          name="descripcion"
          placeholder="Súper, gasolina, sueldo…"
          className={inputCls}
        />
      </div>

      {(opcionesA.length === 0 || opcionesB.length === 0) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Te faltan cuentas para este tipo de movimiento.{" "}
          <Link href="/cuentas/nueva" className="underline">
            Crea una cuenta
          </Link>
          .
        </p>
      )}

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
          {pending ? "Guardando…" : "Guardar movimiento"}
        </button>
        <Link
          href="/movimientos"
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-base font-medium dark:border-neutral-700"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
