"use client";

import { useActionState } from "react";
import { login, signup } from "./actions";

type AuthState = { error?: string; message?: string };
const initialState: AuthState = {};

export default function LoginPage() {
  const [loginState, loginAction, loginPending] = useActionState(
    login,
    initialState,
  );
  const [signupState, signupAction, signupPending] = useActionState(
    signup,
    initialState,
  );

  const error = loginState.error ?? signupState.error;
  const message = signupState.message;
  const pending = loginPending || signupPending;

  return (
    <main className="flex min-h-dvh flex-col justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Finance Tracker
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Inicia sesión para ver tus cuentas.
        </p>

        <form className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-base outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-neutral-700"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
              {message}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              formAction={loginAction}
              disabled={pending}
              className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-base font-medium text-white transition active:scale-[.99] disabled:opacity-60"
            >
              {loginPending ? "Entrando…" : "Iniciar sesión"}
            </button>
            <button
              type="submit"
              formAction={signupAction}
              disabled={pending}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-base font-medium transition active:scale-[.99] disabled:opacity-60 dark:border-neutral-700"
            >
              {signupPending ? "Creando…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
