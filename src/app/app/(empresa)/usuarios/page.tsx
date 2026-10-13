import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import UsersManager from "@/components/UsersManager";

export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const session = await requireSession();
  if (session.role !== "ADMIN") redirect("/app");
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
  return (
    <>
      <PageHeader eyebrow="JBL Incorporadora" title="Usuários" subtitle="Quem acessa o portal. Administradores veem tudo, reativam propostas excluídas e gerenciam usuários." />
      <div className="max-w-4xl p-8">
        <UsersManager users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} me={session.sub} />
      </div>
    </>
  );
}
