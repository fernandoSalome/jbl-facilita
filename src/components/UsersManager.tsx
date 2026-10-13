"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/format";

type U = { id: string; name: string; email: string; role: "ADMIN" | "USER"; createdAt: string };

const ROLE = { ADMIN: "Administrador", USER: "Usuário" };

function UserForm({ user, onDone }: { user?: U; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<U["role"]>(user?.role ?? "USER");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setErr("");
    setBusy(true);
    const r = await fetch(user ? `/api/users/${user.id}` : "/api/users", {
      method: user ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user ? { name, role, password: password || undefined } : { name, email, role, password }),
    });
    setBusy(false);
    if (!r.ok) return setErr((await r.json()).error ?? "Erro ao salvar.");
    onDone();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <label><span className="label">Nome</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label><span className="label">E-mail (login)</span><input className="input" type="email" value={email} disabled={!!user} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>
        <span className="label">Papel</span>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as U["role"])}>
          <option value="ADMIN">Administrador: acesso total</option>
          <option value="USER">Usuário: cria e acompanha propostas</option>
        </select>
      </label>
      <label>
        <span className="label">{user ? "Nova senha (deixe vazio para manter)" : "Senha"}</span>
        <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mínimo 8 caracteres" />
      </label>
      {err && <p className="text-sm font-semibold text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onDone}>Cancelar</button>
        <button className="btn-gold" onClick={save} disabled={busy}>{busy ? "Salvando…" : user ? "Salvar" : "Criar usuário"}</button>
      </div>
    </div>
  );
}

export default function UsersManager({ users, me }: { users: U[]; me: string }) {
  const [editing, setEditing] = useState<U | "new" | null>(null);
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <span className="text-sm text-muted">{users.length} usuário(s)</span>
        <button className="btn-gold" onClick={() => setEditing("new")}>+ Novo usuário</button>
      </div>
      <ul>
        {users.map((u) => (
          <li key={u.id} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-0">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-gold-line bg-gold-soft font-display text-gold-deep">{u.name.slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-navy">{u.name}{u.id === me && <span className="ml-2 text-[11.5px] font-normal text-muted">(você)</span>}</span>
              <span className="block text-[13px] text-muted">{u.email} · desde {fmtDate(u.createdAt)}</span>
            </span>
            <span className={`rounded-sm px-2 py-0.5 text-[11.5px] font-semibold ring-1 ${u.role === "ADMIN" ? "bg-navy text-white ring-navy" : "bg-alt text-navy ring-line"}`}>{ROLE[u.role]}</span>
            <button className="btn-ghost py-1.5 text-[13px]" onClick={() => setEditing(u)}>Editar</button>
          </li>
        ))}
      </ul>
      <Modal open={!!editing} onClose={() => setEditing(null)} eyebrow="Usuários" title={editing === "new" ? "Novo usuário" : "Editar usuário"}>
        {editing && <UserForm key={editing === "new" ? "new" : editing.id} user={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </Modal>
    </div>
  );
}
