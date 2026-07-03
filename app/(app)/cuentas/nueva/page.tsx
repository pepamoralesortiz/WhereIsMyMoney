import CuentaForm from "@/components/CuentaForm";
import { crearCuenta } from "../actions";

export default function NuevaCuentaPage() {
  return (
    <main>
      <h1 className="mb-5 text-xl font-semibold tracking-tight">Nueva cuenta</h1>
      <CuentaForm action={crearCuenta} />
    </main>
  );
}
