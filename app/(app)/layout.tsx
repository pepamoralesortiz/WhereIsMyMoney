import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import { signout } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensa en profundidad (además del proxy): sin sesión, a /login.
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="truncate text-xs text-neutral-500">
            {user.email}
          </span>
          <form action={signout}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm transition active:scale-[.99] dark:border-neutral-700"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-5">{children}</div>

      <Nav />
    </div>
  );
}
