"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { partidasDeMovimiento, type TipoMovimiento } from "@/lib/finance";

export type MovimientoState = { error?: string };

const TIPOS = new Set<TipoMovimiento>(["gasto", "ingreso", "transferencia"]);

export async function crearMovimiento(
  _prev: MovimientoState,
  formData: FormData,
): Promise<MovimientoState> {
  const tipo = String(formData.get("tipo") ?? "") as TipoMovimiento;
  const fecha = String(formData.get("fecha") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const cuentaA = String(formData.get("cuentaA") ?? "");
  const cuentaB = String(formData.get("cuentaB") ?? "");
  const monto = Number(formData.get("monto"));

  if (!TIPOS.has(tipo)) return { error: "Tipo de movimiento inválido." };
  if (!cuentaA || !cuentaB) return { error: "Selecciona ambas cuentas." };
  if (cuentaA === cuentaB)
    return { error: "Las dos cuentas deben ser distintas." };
  if (!Number.isFinite(monto) || monto <= 0)
    return { error: "El monto debe ser mayor que 0." };

  const { debe, haber } = partidasDeMovimiento(tipo, cuentaA, cuentaB);

  const supabase = await createClient();
  const { error } = await supabase.rpc("crear_movimiento", {
    p_fecha: fecha || null,
    p_tipo: tipo,
    p_descripcion: descripcion || null,
    p_cuenta_debe: debe,
    p_cuenta_haber: haber,
    p_monto: monto,
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
