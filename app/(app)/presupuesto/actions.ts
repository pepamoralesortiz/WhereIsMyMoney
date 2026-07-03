"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PresupuestoState = { ok?: boolean; error?: string };

// Guarda (upsert) los presupuestos del mes para cada rubro de gasto.
// monto <= 0 o vacío elimina el presupuesto de ese rubro para el mes.
export async function guardarPresupuesto(
  _prev: PresupuestoState,
  formData: FormData,
): Promise<PresupuestoState> {
  const anio = Number(formData.get("anio"));
  const mes = Number(formData.get("mes"));
  if (!anio || !mes) return { error: "Periodo inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const upserts: {
    user_id: string;
    cuenta_id: string;
    anio: number;
    mes: number;
    monto: number;
  }[] = [];
  const borrar: string[] = [];

  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("monto_")) continue;
    const cuenta_id = k.slice("monto_".length);
    const monto = Number(v);
    if (Number.isFinite(monto) && monto > 0) {
      upserts.push({ user_id: user.id, cuenta_id, anio, mes, monto });
    } else {
      borrar.push(cuenta_id);
    }
  }

  if (upserts.length) {
    const { error } = await supabase
      .from("presupuestos")
      .upsert(upserts, { onConflict: "user_id,cuenta_id,anio,mes" });
    if (error) return { error: error.message };
  }
  if (borrar.length) {
    await supabase
      .from("presupuestos")
      .delete()
      .eq("anio", anio)
      .eq("mes", mes)
      .in("cuenta_id", borrar);
  }

  revalidatePath("/presupuesto");
  revalidatePath("/dashboard");
  return { ok: true };
}
