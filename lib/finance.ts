// Tipos y helpers de dominio compartidos por la UI.

export type TipoCuenta =
  | "activo"
  | "pasivo"
  | "patrimonio"
  | "ingreso"
  | "gasto";

export type TipoMovimiento = "gasto" | "ingreso" | "transferencia";

export type Cuenta = {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  subtipo: string | null;
  moneda: string;
  archivada: boolean;
};

export const TIPOS_CUENTA: { value: TipoCuenta; label: string }[] = [
  { value: "activo", label: "Activo" },
  { value: "pasivo", label: "Pasivo" },
  { value: "patrimonio", label: "Patrimonio" },
  { value: "ingreso", label: "Ingreso" },
  { value: "gasto", label: "Gasto" },
];

export const TIPOS_CUENTA_LABEL: Record<TipoCuenta, string> = {
  activo: "Activo",
  pasivo: "Pasivo",
  patrimonio: "Patrimonio",
  ingreso: "Ingreso",
  gasto: "Gasto",
};

export const ORDEN_TIPOS: TipoCuenta[] = [
  "activo",
  "pasivo",
  "patrimonio",
  "ingreso",
  "gasto",
];

export const MONEDAS = ["GTQ", "USD", "EUR"];

export function money(value: number, moneda = "GTQ"): string {
  try {
    return new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: moneda || "GTQ",
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${moneda}`;
  }
}

// Mapea un movimiento (origen/destino en términos de UX) a las cuentas
// debe/haber que espera la RPC crear_movimiento.
//   gasto:         debe = categoría de gasto, haber = cuenta de pago
//   ingreso:       debe = cuenta de destino,  haber = fuente de ingreso
//   transferencia: debe = cuenta destino,     haber = cuenta origen
export function partidasDeMovimiento(
  tipo: TipoMovimiento,
  cuentaA: string, // "categoría/fuente" o destino según el tipo
  cuentaB: string, // "cuenta de pago/origen"
): { debe: string; haber: string } {
  switch (tipo) {
    case "gasto":
      return { debe: cuentaA, haber: cuentaB };
    case "ingreso":
      return { debe: cuentaB, haber: cuentaA };
    case "transferencia":
      return { debe: cuentaA, haber: cuentaB };
  }
}
