import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { configDe } from "@/lib/agenda-server";
import { horariosValidos, slugDe } from "@/lib/agenda";

/** Ajustes da agenda: horários livres, duração, link público, título e local das reuniões */
export async function PUT(req: Request) {
  return withSession(async (s) => {
    const b = await req.json().catch(() => null);
    const c = await configDe(s.sub);
    if (b?.horarios !== undefined && !horariosValidos(b.horarios)) return json({ error: "Horários inválidos (o início tem que ser antes do fim)" }, 400);
    const duracaoMin = Number(b?.duracaoMin ?? c.duracaoMin);
    if (!(duracaoMin >= 5 && duracaoMin <= 480)) return json({ error: "Duração entre 5 e 480 minutos" }, 400);
    const slug = b?.slug !== undefined ? slugDe(String(b.slug)) : c.slug;
    if (slug !== c.slug && (await db.agendaConfig.findUnique({ where: { slug } }))) return json({ error: "Esse link já está em uso. Escolha outro." }, 409);
    const n = await db.agendaConfig.update({
      where: { id: c.id },
      data: {
        slug,
        duracaoMin,
        horarios: b?.horarios ?? c.horarios ?? undefined,
        titulo: String(b?.titulo ?? c.titulo).trim() || c.titulo,
        descricao: b?.descricao !== undefined ? String(b.descricao).trim() || null : c.descricao,
        local: b?.local !== undefined ? String(b.local).trim() || null : c.local,
        antecedenciaH: Math.max(0, Math.min(720, Number(b?.antecedenciaH ?? c.antecedenciaH) || 0)),
        diasFrente: Math.max(1, Math.min(365, Number(b?.diasFrente ?? c.diasFrente) || 30)),
      },
    });
    const { googleRefresh, ...resto } = n;
    return json({ ...resto, googleConectado: !!googleRefresh });
  });
}
