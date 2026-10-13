import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  return withSession(
    async () => {
      const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
      return json(users);
    },
    { admin: true },
  );
}

export async function POST(req: Request) {
  return withSession(
    async () => {
      const b = await req.json().catch(() => ({}));
      const name = String(b.name ?? "").trim();
      const email = String(b.email ?? "").trim().toLowerCase();
      const password = String(b.password ?? "");
      if (!name || !EMAIL.test(email)) return json({ error: "Informe nome e um e-mail válido." }, 400);
      if (password.length < 8) return json({ error: "A senha precisa ter pelo menos 8 caracteres." }, 400);
      if (await db.user.findUnique({ where: { email } })) return json({ error: "Já existe um usuário com esse e-mail." }, 400);
      const u = await db.user.create({
        data: { name, email, role: b.role === "ADMIN" ? "ADMIN" : "USER", passwordHash: await bcrypt.hash(password, 10) },
      });
      return json({ id: u.id });
    },
    { admin: true },
  );
}
