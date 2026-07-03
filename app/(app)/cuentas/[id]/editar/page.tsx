import { notFound } from "next/navigation";
import CuentaForm from "@/components/CuentaForm";
import { createClient } from "@/lib/supabase/server";
import type { Cuenta } from "@/lib/finance";
import { actualizarCuenta } from "../../actions";

export default async function EditarCuentaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data } = await supabase
    .from("cuentas")
    .select("id, nombre, tipo, subtipo, moneda, archivada")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const cuenta = data as Cuenta;

  return (
    <main>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">
        Editar cuenta
      </h1>
      <CuentaForm action={actualizarCuenta} cuenta={cuenta} />
    </main>
  );
}
