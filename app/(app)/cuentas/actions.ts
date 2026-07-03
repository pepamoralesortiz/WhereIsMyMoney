"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TIPOS_CUENTA } from "@/lib/finance";

export type CuentaState = { error?: string };

const TIPOS_VALIDOS = new Set(TIPOS_CUENTA.map((t) => t.value));

function parseCuenta(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "");
  const subtipo = String(formData.get("subtipo") ?? "").trim();
  const moneda = String(formData.get("moneda") ?? "GTQ").trim() || "GTQ";
  return { nombre, tipo, subtipo, moneda };
}

export async function crearCuenta(
  _prev: CuentaState,
  formData: FormData,
): Promise<CuentaState> {
  const { nombre, tipo, subtipo, moneda } = parseCuenta(formData);

  if (!nombre) return { error: "El nombre es obligatorio." };
  if (!TIPOS_VALIDOS.has(tipo as never))
    return { error: "Selecciona un tipo válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("cuentas").insert({
    nombre,
    tipo,
    subtipo: subtipo || null,
    moneda,
  });

  if (error) {
    if (error.code === "23505")
      return { error: "Ya tienes una cuenta con ese nombre." };
    return { error: error.message };
  }

  revalidatePath("/cuentas");
  revalidatePath("/dashboard");
  redirect("/cuentas");
}

export async function actualizarCuenta(
  _prev: CuentaState,
  formData: FormData,
): Promise<CuentaState> {
  const id = String(formData.get("id") ?? "");
  const { nombre, tipo, subtipo, moneda } = parseCuenta(formData);

  if (!id) return { error: "Cuenta no encontrada." };
  if (!nombre) return { error: "El nombre es obligatorio." };
  if (!TIPOS_VALIDOS.has(tipo as never))
    return { error: "Selecciona un tipo válido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("cuentas")
    .update({ nombre, tipo, subtipo: subtipo || null, moneda })
    .eq("id", id);

  if (error) {
    if (error.code === "23505")
      return { error: "Ya tienes una cuenta con ese nombre." };
    return { error: error.message };
  }

  revalidatePath("/cuentas");
  revalidatePath("/dashboard");
  redirect("/cuentas");
}

// Archiva o restaura una cuenta (no la borra: preserva el histórico contable).
export async function toggleArchivada(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const archivada = String(formData.get("archivada") ?? "") === "true";
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("cuentas").update({ archivada: !archivada }).eq("id", id);

  revalidatePath("/cuentas");
  revalidatePath("/dashboard");
}
