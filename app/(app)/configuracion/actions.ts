"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TasasState = { ok?: boolean; error?: string };

// Guarda las tasas fijas de cambio (GTQ por 1 unidad). Vacío/0 elimina.
export async function guardarTasas(
  _prev: TasasState,
  formData: FormData,
): Promise<TasasState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión expirada." };

  const upserts: { user_id: string; moneda: string; tasa: number }[] = [];
  const borrar: string[] = [];

  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("tasa_")) continue;
    const moneda = k.slice("tasa_".length);
    const tasa = Number(v);
    if (Number.isFinite(tasa) && tasa > 0) {
      upserts.push({ user_id: user.id, moneda, tasa });
    } else {
      borrar.push(moneda);
    }
  }

  if (upserts.length) {
    const { error } = await supabase
      .from("tasas_cambio")
      .upsert(upserts, { onConflict: "user_id,moneda" });
    if (error) return { error: error.message };
  }
  if (borrar.length) {
    await supabase.from("tasas_cambio").delete().in("moneda", borrar);
  }

  revalidatePath("/configuracion");
  return { ok: true };
}
