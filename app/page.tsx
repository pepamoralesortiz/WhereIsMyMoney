import { redirect } from "next/navigation";

export default function Home() {
  // El middleware ya protege las rutas; si hay sesión verá el dashboard,
  // si no, será redirigido a /login.
  redirect("/dashboard");
}
