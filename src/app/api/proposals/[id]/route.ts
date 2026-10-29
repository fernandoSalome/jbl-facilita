import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { parseInputs, parseOptions, STATUS, type Overrides } from "@/lib/proposals";
import { cleanOverride } from "@/lib/sanitize";
import { latestVersion } from "@/lib/formato-server";
import { parseFormato } from "@/lib/formatos";

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  return withSession(async (s) => {
    const b = await req.json();
    // Uma gravação por vez em cada proposta: duas alterações seguidas (ex.: adicionar uma
    // benfeitoria e já escolher o emoji) não podem ler a mesma versão e apagar uma à outra
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Proposal" WHERE id = ${params.id} FOR UPDATE`;
      const p = await tx.proposal.findFirst({ where: { id: params.id, deletedAt: null } });
      if (!p) return json({ error: "Proposta não encontrada" }, 404);

      // bloqueada: só o desfecho (status) e "expirar agora" passam; os dados dela não mudam
      if (p.lockedAt) {
        const mexe = ["name", "ownerName", "ownerPhone", "inputs", "options", "overrides", "atualizarTemplate", "resetOverrides"].filter((k) => b[k] !== undefined);
        if (mexe.length) return json({ error: "Proposta bloqueada para edição. Libere na lista de propostas." }, 423);
      }
      const data: Record<string, unknown> = {};
      if (typeof b.name === "string" && b.name.trim()) data.name = b.name.trim();
      if (typeof b.ownerName === "string" && b.ownerName.trim()) data.ownerName = b.ownerName.trim();
      if (typeof b.ownerPhone === "string") data.ownerPhone = b.ownerPhone.trim() || null;
      if (b.inputs) data.inputs = parseInputs(b.inputs);
      if (b.options) {
        const antes = parseOptions(p.options);
        const depois = parseOptions({ ...(p.options as object), ...b.options });
        data.options = depois;
        // proposta já enviada: o link vence no envio + dias (mudou o prazo ou ligou/desligou "sem prazo")
        const mudouPrazo = !!antes.semValidade !== !!depois.semValidade || antes.validadeDias !== depois.validadeDias;
        if (p.status !== "rascunho" && mudouPrazo) {
          data.expiresAt = depois.semValidade ? null : new Date((p.publishedAt ?? new Date()).getTime() + depois.validadeDias * 864e5);
        }
      }
      // Expirar agora: o link passa a mostrar "proposta expirada" (reabrir = prorrogar)
      if (b.expire === true) data.expiresAt = new Date(Date.now() - 1000);
      // passa para a versão atual do template (ao "Atualizar" ou ao "Voltar tudo ao template")
      if (b.atualizarTemplate === true || b.resetOverrides === true) {
        const v = await latestVersion(p.templateId, parseFormato(p.formato));
        if (v) data.formatoVersionId = v.id;
      }
      if (b.resetOverrides === true) data.overrides = {};
      else if (b.overrides) {
        // Uma chave com valor null volta ao valor calculado
        const merged: Overrides = { ...(p.overrides as Overrides) };
        for (const [k, raw] of Object.entries(b.overrides as Record<string, unknown>)) {
          const v = cleanOverride(k, raw);
          if (v === undefined) return json({ error: `Valor inválido para "${k}"` }, 400);
          if (v === null) delete merged[k];
          else merged[k] = v;
        }
        data.overrides = merged;
      }
      if (typeof b.status === "string" && STATUS[b.status] && b.status !== "expirada") data.status = b.status;

      const updated = await tx.proposal.update({ where: { id: p.id }, data });
      await tx.proposalEvent.create({ data: { proposalId: p.id, type: "edit", meta: { by: s.name, fields: Object.keys(data) } } });
      return json({ ok: true, overrides: updated.overrides });
    });
  });
}

/** Exclusão lógica: a proposta some da lista e o link para de funcionar, mas nada é apagado. */
export async function DELETE(_: Request, { params }: Ctx) {
  return withSession(async (s) => {
    await db.proposal.update({ where: { id: params.id }, data: { deletedAt: new Date(), deletedById: s.sub } });
    await db.proposalEvent.create({ data: { proposalId: params.id, type: "delete", meta: { by: s.name } } });
    return json({ ok: true });
  });
}
