import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

/** Altera nome, papel ou senha. Um administrador não pode tirar o próprio acesso de admin. */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withSession(
    async (s) => {
      const b = await req.json().catch(() => ({}));
      const data: { name?: string; role?: "ADMIN" | "USER"; passwordHash?: string } = {};
      if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
      if (b.role === "ADMIN" || b.role === "USER") {
        if (params.id === s.sub && b.role !== "ADMIN") return json({ error: "Você não pode remover o seu próprio acesso de administrador." }, 400);
        data.role = b.role;
      }
      if (typeof b.password === "string" && b.password) {
        if (b.password.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
        data.passwordHash = await bcrypt.hash(b.password, 10);
      }
      await db.user.update({ where: { id: params.id }, data });
      return json({ ok: true });
    },
    { admin: true },
  );
}
