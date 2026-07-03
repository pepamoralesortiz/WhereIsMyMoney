"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CategoriaState = { error?: string };

// Crea una categoría (cuenta tipo 'gasto' o 'ingreso') desde un solo campo.
export async function crearCategoria(
  _prev: CategoriaState,
  formData: FormData,
): Promise<CategoriaState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "gasto");
  const moneda = String(formData.get("moneda") ?? "GTQ").trim() || "GTQ";

  if (!nombre) return { error: "Escribe un nombre." };
  if (tipo !== "gasto" && tipo !== "ingreso")
    return { error: "Tipo de categoría inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cuentas")
    .insert({ nombre, tipo, moneda });

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
