"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CategoriaState = { error?: string };

// Crea una categoría de gasto (cuenta tipo 'gasto') desde un solo campo.
export async function crearCategoria(
  _prev: CategoriaState,
  formData: FormData,
): Promise<CategoriaState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const moneda = String(formData.get("moneda") ?? "GTQ").trim() || "GTQ";

  if (!nombre) return { error: "Escribe un nombre." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cuentas")
    .insert({ nombre, tipo: "gasto", moneda });

  if (error) {
    if (error.code === "23505")
      return { error: "Ya existe una cuenta con ese nombre." };
    return { error: error.message };
  }

  revalidatePath("/categorias");
  revalidatePath("/movimientos/nuevo");
  revalidatePath("/dashboard");
  return {};
}
