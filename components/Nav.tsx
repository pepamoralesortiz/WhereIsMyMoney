"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/cuentas", label: "Cuentas" },
  { href: "/categorias", label: "Categorías" },
  { href: "/movimientos", label: "Movimientos" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 border-t border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex max-w-md">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex-1 px-1 py-3 text-center text-xs font-medium transition ${
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
