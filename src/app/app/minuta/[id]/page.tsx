import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import MinutaEditor from "@/components/minuta/MinutaEditor";

export const dynamic = "force-dynamic";

/** Minuta da carta de intenção: revisar, editar e mandar para assinatura (gov.br) */
export default async function MinutaPage({ params }: { params: { id: string } }) {
  await requireSession();
  const c = await db.intentLetter.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!c) notFound();
  return <MinutaEditor id={c.id} />;
}
