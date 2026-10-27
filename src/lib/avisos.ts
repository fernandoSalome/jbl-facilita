import { db } from "./db";
import { enviarTexto } from "./whatsapp";
import { tratamento } from "./destinatario";
import { parseOptions } from "./proposals";

/**
 * Avisos do acompanhamento das propostas nos grupos de WhatsApp cadastrados no portal
 * (tela "Assistente WhatsApp"). Começam com 🤖 para o robô não responder a si mesmo.
 * Falha no WhatsApp nunca atrapalha o cliente: o aviso é tentado por até 8 s.
 */
export async function avisarGrupos(texto: string) {
  if (!process.env.EVOLUTION_URL) return;
  const grupos = await db.waGroup.findMany({ where: { papel: { not: "inativo" } }, select: { jid: true } });
  if (!grupos.length) return;
  const envio = Promise.allSettled(grupos.map((g) => enviarTexto(g.jid, `🤖 ${texto}`)));
  await Promise.race([envio, new Promise((ok) => setTimeout(ok, 8000))]);
}

type PropostaAviso = { id: string; name: string; ownerName: string; options: unknown; project: { name: string } };

/** Nome de quem recebeu a proposta, como escolhido em "Proposta para" (ou o proprietário) */
export function quemRecebeu(p: PropostaAviso) {
  const t = tratamento(parseOptions(p.options).destinatario);
  return t.nome ? t.rotulo : p.ownerName;
}

export const linkPortal = (origem: string, id: string) => `${origem}/app/proposta/${id}`;

/** Dados da carta em texto para o WhatsApp (só o que foi preenchido) */
export function dadosDaCarta(b: Record<string, Record<string, unknown> | unknown>) {
  const grupos: [string, string, [string, string][]][] = [
    ["Proprietário(a)", "proprietario", [["nome", "Nome"], ["cpf", "CPF"], ["rg", "RG"], ["nacionalidade", "Nacionalidade"], ["profissao", "Profissão"], ["endereco", "Endereço"], ["telefone", "Telefone"], ["email", "E-mail"]]],
    ["Casamento", "casamento", [["estadoCivil", "Estado civil"], ["data", "Data"], ["regime", "Regime de bens"], ["matricula", "Matrícula"], ["rcpn", "RCPN"], ["municipio", "Município"]]],
    ["Cônjuge", "conjuge", [["nome", "Nome"], ["cpf", "CPF"], ["rg", "RG"], ["nacionalidade", "Nacionalidade"], ["profissao", "Profissão"]]],
    ["Imóvel", "imovel", [["areaHa", "Área (ha)"], ["zona", "Zona"], ["municipio", "Município"], ["cartorio", "Cartório"], ["matriculas", "Matrícula(s)"], ["car", "CAR"]]],
    ["Interesse", "interesse", [["modalidade", "Modalidade"], ["prazo", "Prazo"], ["reuniao", "Reunião"], ["observacoes", "Observações"]]],
  ];
  const partes: string[] = [];
  for (const [titulo, chave, campos] of grupos) {
    const o = (b[chave] ?? {}) as Record<string, unknown>;
    const linhas = campos.map(([k, rot]) => [rot, String(o[k] ?? "").trim()] as const).filter(([, v]) => v).map(([rot, v]) => `${rot}: ${v.slice(0, 300)}`);
    if (linhas.length) partes.push(`*${titulo}*\n${linhas.join("\n")}`);
  }
  const mat = b.matricula as { name?: string } | null | undefined;
  if (mat?.name) partes.push(`*Matrícula anexada:* ${mat.name}`);
  return partes.join("\n\n") || "(nenhum campo preenchido)";
}
