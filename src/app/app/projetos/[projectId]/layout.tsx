import { notFound } from "next/navigation";
import Shell from "@/components/shell/Shell";
import { db } from "@/lib/db";

export default async function ProjectLayout({ params, children }: { params: { projectId: string }; children: React.ReactNode }) {
  const p = await db.project.findFirst({ where: { id: params.projectId, deletedAt: null }, select: { id: true } });
  if (!p) notFound();
  return <Shell projectId={p.id}>{children}</Shell>;
}
