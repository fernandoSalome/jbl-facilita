import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { horariosDe } from "@/lib/agenda-server";
import { diaDe } from "@/lib/agenda";
import Agendar from "@/components/calendario/Agendar";

export const dynamic = "force-dynamic";

async function carregar(slug: string) {
  return db.agendaConfig.findUnique({ where: { slug }, include: { user: { select: { name: true } } } });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = await carregar(params.slug);
  return { title: c ? `Agendar · ${c.titulo} · ${c.user.name}` : "Agenda não encontrada", robots: { index: false, follow: false } };
}

/** Link público de agendamento (como o Calendly): a pessoa escolhe o dia, o horário e deixa os contatos */
export default async function AgendarPage({ params }: { params: { slug: string } }) {
  const c = await carregar(params.slug);
  if (!c) notFound();
  const h = horariosDe(c);
  return (
    <Agendar
      slug={c.slug}
      nome={c.user.name}
      titulo={c.titulo}
      descricao={c.descricao}
      local={c.local}
      duracaoMin={c.duracaoMin}
      diasComHorario={Object.keys(h).filter((d) => h[d].length > 0).map(Number)}
      primeiro={diaDe(new Date())}
      ultimo={diaDe(new Date(Date.now() + c.diasFrente * 864e5))}
    />
  );
}
