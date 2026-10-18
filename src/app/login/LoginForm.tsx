"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "./actions";
import PasswordInput from "@/components/ui/PasswordInput";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-gold mt-2 w-full py-3 text-[15px]" disabled={pending}>
      {pending ? "Entrando…" : "Entrar no portal"}
    </button>
  );
}

export default function LoginForm() {
  const [error, action] = useFormState(login, null);
  return (
    <form action={action} className="mt-8 grid gap-4">
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input py-2.5" />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required className="input py-2.5" />
      </div>
      {error && <p className="rounded border-l-[3px] border-rose-500 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <Submit />
    </form>
  );
}
