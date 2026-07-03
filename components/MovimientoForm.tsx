"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  MONEDAS,
  TC_DEFAULT,
  BASE_MONEDA,
  money,
  type Cuenta,
  type TipoCuenta,
  type TipoMovimiento,
} from "@/lib/finance";
import type { MovimientoState } from "@/app/(app)/movimientos/actions";

const inputCls =
  "mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700";

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

export type MovimientoInicial = {
  id?: string;
  tipo: TipoMovimiento;
  monto: number;
  cuentaA: string;
  cuentaB: string;
  fecha: string;
  descripcion: string;
  moneda: string;
  tc: number;
};

export default function MovimientoForm({
  cuentas,
  hoy,
  tasas,
  action,
  initial,
  submitLabel = "Guardar movimiento",
}: {
  cuentas: Cuenta[];
  hoy: string;
  tasas: Record<string, number>;
  action: (prev: MovimientoState, fd: FormData) => Promise<MovimientoState>;
  initial?: MovimientoInicial;
  submitLabel?: string;
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>(initial?.tipo ?? "gasto");
  const [moneda, setMoneda] = useState<string>(initial?.moneda ?? BASE_MONEDA);
  const [monto, setMonto] = useState<string>(
    initial?.monto ? String(initial.monto) : "",
  );
  const [tc, setTc] = useState<string>(
    String(initial?.tc ?? tasas[moneda] ?? TC_DEFAULT[moneda] ?? 1),
  );
  const [state, formAction, pending] = useActionState<MovimientoState, FormData>(
    action,
    {},
  );

  const cfg = CONFIG[tipo];
  const porMoneda = (c: Cuenta) => c.moneda === BASE_MONEDA || c.moneda === moneda;
  const opcionesA = cuentas.filter((c) => cfg.a.tipos.includes(c.tipo) && porMoneda(c));
  const opcionesB = cuentas.filter((c) => cfg.b.tipos.includes(c.tipo) && porMoneda(c));

  const esForanea = moneda !== BASE_MONEDA;
  const base = esForanea ? Math.round(Number(monto) * Number(tc) * 100) / 100 : Number(monto);

  function cambiarMoneda(m: string) {
    setMoneda(m);
    if (m !== BASE_MONEDA) {
      setTc(String(tasas[m] ?? TC_DEFAULT[m] ?? 1));
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}

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

      {/* Monto + moneda */}
      <div className="flex gap-2">
        <div className="flex-1">
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
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            className={inputCls}
          />
        </div>
        <div className="w-28">
          <label htmlFor="moneda" className="block text-sm font-medium">
            Moneda
          </label>
          <select
            id="moneda"
            name="moneda"
            value={moneda}
            onChange={(e) => cambiarMoneda(e.target.value)}
            className={inputCls}
          >
            {MONEDAS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tipo de cambio (solo moneda extranjera) */}
      {esForanea && (
        <div>
          <label htmlFor="tc" className="block text-sm font-medium">
            Tipo de cambio{" "}
            <span className="text-neutral-400">(GTQ por 1 {moneda})</span>
          </label>
          <input
            id="tc"
            name="tc"
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0.0001"
            value={tc}
            onChange={(e) => setTc(e.target.value)}
            className={inputCls}
          />
          {Number(monto) > 0 && Number(tc) > 0 && (
            <p className="mt-1 text-xs text-neutral-500">
              Se registrará como <b>{money(base)}</b> (moneda base).
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="cuentaA" className="block text-sm font-medium">
          {cfg.a.label}
        </label>
        <select
          id="cuentaA"
          name="cuentaA"
          required
          key={`a-${tipo}-${moneda}`}
          className={inputCls}
          defaultValue={initial?.cuentaA ?? ""}
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {opcionesA.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.moneda !== BASE_MONEDA ? `(${c.moneda})` : ""}
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
          key={`b-${tipo}-${moneda}`}
          className={inputCls}
          defaultValue={initial?.cuentaB ?? ""}
        >
          <option value="" disabled>
            Selecciona…
          </option>
          {opcionesB.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.moneda !== BASE_MONEDA ? `(${c.moneda})` : ""}
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
          defaultValue={initial?.fecha ?? hoy}
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
          defaultValue={initial?.descripcion ?? ""}
          placeholder="Súper, gasolina, sueldo…"
          className={inputCls}
        />
      </div>

      {(opcionesA.length === 0 || opcionesB.length === 0) && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          No hay cuentas para este tipo/moneda.{" "}
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
          {pending ? "Guardando…" : submitLabel}
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
