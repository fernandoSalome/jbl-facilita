import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { FASES } from "@/lib/fases";

/** Altera os dados do loteamento (nome, cidade, área, matrícula, tipo, fase e foto aérea) */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const atual = await db.project.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!atual) return json({ error: "Loteamento não encontrado" }, 404);
    const b = await req.json().catch(() => ({}));
    const areaTotal = Number(String(b.areaTotal ?? "").replace(/\./g, "").replace(",", "."));
    if (!String(b.name ?? "").trim() || !String(b.municipio ?? "").trim() || !areaTotal) return json({ error: "Preencha nome, município e área." }, 400);
    // foto: null tira; data:image troca; qualquer outro valor mantém a atual
    const img = b.aerialImage;
    const aerialImage = img === null ? null : typeof img === "string" && img.startsWith("data:image/") ? img : atual.aerialImage;
    await db.project.update({
      where: { id: atual.id },
      data: {
        name: String(b.name).trim(),
        municipio: String(b.municipio).trim(),
        uf: String(b.uf || "SP").trim().toUpperCase().slice(0, 2),
        matricula: String(b.matricula ?? "").trim() || null,
        tipo: String(b.tipo ?? "").trim() || atual.tipo,
        fase: FASES.some(([k]) => k === b.fase) ? b.fase : atual.fase,
        areaTotal,
        aerialImage,
      },
    });
    return json({ ok: true });
  });
}

/** Exclui o loteamento (some das listas; só administradores) */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withSession(
    async () => {
      await db.project.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
      await db.proposal.updateMany({ where: { projectId: params.id, deletedAt: null }, data: { deletedAt: new Date() } });
      return json({ ok: true });
    },
    { admin: true },
  );
}
