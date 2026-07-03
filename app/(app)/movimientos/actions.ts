"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  partidasDeMovimiento,
  BASE_MONEDA,
  type TipoMovimiento,
} from "@/lib/finance";

export type MovimientoState = { error?: string };

const TIPOS = new Set<TipoMovimiento>(["gasto", "ingreso", "transferencia"]);

type Parsed =
  | { error: string }
  | {
      tipo: TipoMovimiento;
      fecha: string;
      descripcion: string;
      debe: string;
      haber: string;
      monto: number;
      moneda: string;
      tc: number;
    };

function parse(formData: FormData): Parsed {
  const tipo = String(formData.get("tipo") ?? "") as TipoMovimiento;
  const fecha = String(formData.get("fecha") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const cuentaA = String(formData.get("cuentaA") ?? "");
  const cuentaB = String(formData.get("cuentaB") ?? "");
  const monto = Number(formData.get("monto"));
  const moneda = String(formData.get("moneda") ?? BASE_MONEDA) || BASE_MONEDA;
  const tc = moneda === BASE_MONEDA ? 1 : Number(formData.get("tc"));

  if (!TIPOS.has(tipo)) return { error: "Tipo de movimiento inválido." };
  if (!cuentaA || !cuentaB) return { error: "Selecciona ambas cuentas." };
  if (cuentaA === cuentaB)
    return { error: "Las dos cuentas deben ser distintas." };
  if (!Number.isFinite(monto) || monto <= 0)
    return { error: "El monto debe ser mayor que 0." };
  if (moneda !== BASE_MONEDA && (!Number.isFinite(tc) || tc <= 0))
    return { error: "Indica un tipo de cambio válido." };

  const { debe, haber } = partidasDeMovimiento(tipo, cuentaA, cuentaB);
  return { tipo, fecha, descripcion, debe, haber, monto, moneda, tc };
}

export async function crearMovimiento(
  _prev: MovimientoState,
  formData: FormData,
): Promise<MovimientoState> {
  const p = parse(formData);
  if ("error" in p) return p;

  const supabase = await createClient();
  const { error } = await supabase.rpc("crear_movimiento", {
    p_fecha: p.fecha || null,
    p_tipo: p.tipo,
    p_descripcion: p.descripcion || null,
    p_cuenta_debe: p.debe,
    p_cuenta_haber: p.haber,
    p_monto: p.monto,
    p_moneda: p.moneda,
    p_tc: p.tc,
  });

  if (error) return { error: error.message };

  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
  redirect("/movimientos");
}

export async function actualizarMovimiento(
  _prev: MovimientoState,
  formData: FormData,
): Promise<MovimientoState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Movimiento no encontrado." };

  const p = parse(formData);
  if ("error" in p) return p;

  const supabase = await createClient();
  const { error } = await supabase.rpc("actualizar_movimiento", {
    p_asiento: id,
    p_fecha: p.fecha || null,
    p_tipo: p.tipo,
    p_descripcion: p.descripcion || null,
    p_cuenta_debe: p.debe,
    p_cuenta_haber: p.haber,
    p_monto: p.monto,
    p_moneda: p.moneda,
    p_tc: p.tc,
  });

  if (error) return { error: error.message };

  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
  redirect("/movimientos");
}

// Borra un asiento completo (las partidas caen en cascada).
export async function eliminarMovimiento(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("asientos").delete().eq("id", id);

  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
}
