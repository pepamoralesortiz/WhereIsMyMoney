"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/movimientos", label: "Movim." },
  { href: "/presupuesto", label: "Presup." },
  { href: "/categorias", label: "Categor." },
  { href: "/cuentas", label: "Cuentas" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
      <div className="mx-auto flex max-w-md">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex-1 truncate px-0.5 py-3 text-center text-[11px] font-medium leading-tight transition ${
                active
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
