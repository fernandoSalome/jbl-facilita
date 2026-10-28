/**
 * Autentique (assinatura eletrônica): cria o documento com quem assina, consulta a situação
 * e baixa o PDF assinado. API GraphQL v2: https://docs.autentique.com.br/api
 *
 * Variáveis na Vercel:
 *   AUTENTIQUE_TOKEN           chave da API (painel.autentique.com.br/perfil/api)
 *   AUTENTIQUE_WEBHOOK_SECRET  segredo do webhook (painel de desenvolvedor da Autentique)
 *   AUTENTIQUE_EMAIL_JBL       opcional: e-mail de quem assina pela JBL (recebe o pedido por e-mail)
 *   AUTENTIQUE_SANDBOX=1       opcional: documentos de teste (não cobram e não valem juridicamente)
 */
import { createHmac, timingSafeEqual } from "node:crypto";

/** AUTENTIQUE_URL só para testes locais (servidor que imita a API) */
const URL_API = process.env.AUTENTIQUE_URL || "https://api.autentique.com.br/v2/graphql";

export const autentiqueConfigurado = () => !!process.env.AUTENTIQUE_TOKEN;

export type Signatario = {
  name?: string;
  email?: string;
  action: "SIGN";
  configs?: { cpf?: string };
  security_verifications?: { type: "SMS"; verify_phone?: string }[];
};

export type Evento = { created_at: string } | null;
export type AssinaturaApi = {
  public_id: string;
  name: string | null;
  email: string | null;
  action: { name: string } | null;
  link: { short_link: string } | null;
  user: { name: string | null; email: string | null } | null;
  viewed: Evento;
  signed: Evento;
  rejected: (Evento & { reason?: string | null }) | null;
};
export type DocumentoApi = { id: string; name: string; files: { original: string | null; signed: string | null } | null; signatures: AssinaturaApi[] };

/** Erro de validação da Autentique em português (ex.: signers.0.configs.cpf: invalid_cpf) */
function explicar(campo: string, cods: string[]) {
  const quem = /signers\.(\d+)/.exec(campo);
  const de = quem ? ` (assinante ${Number(quem[1]) + 1})` : "";
  if (/verify_phone|phone/.test(campo)) return `o celular informado não é válido${de}`;
  if (/cpf/.test(campo)) return `o CPF informado não é válido${de}`;
  if (/email/.test(campo)) return `o e-mail informado não é válido${de}`;
  if (/file/.test(campo)) return "o arquivo do PDF não foi aceito";
  return `${campo}: ${cods.join(", ")}`;
}

async function chamar<T>(body: BodyInit, json: boolean): Promise<T> {
  const token = process.env.AUTENTIQUE_TOKEN;
  if (!token) throw new Error("A Autentique ainda não foi configurada (falta a chave AUTENTIQUE_TOKEN na Vercel).");
  const r = await fetch(URL_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, ...(json ? { "Content-Type": "application/json" } : {}) },
    body,
    cache: "no-store",
  });
  const j = (await r.json().catch(() => null)) as { data?: T; errors?: { message: string; extensions?: { validation?: Record<string, string[]> } }[] } | null;
  if (!r.ok || !j || j.errors?.length || !j.data) {
    const erro = j?.errors?.map((e) => (e.extensions?.validation ? Object.entries(e.extensions.validation).map(([campo, cods]) => explicar(campo, cods)).join("; ") : e.message)).join("; ") || `HTTP ${r.status}`;
    throw new Error(`Autentique: ${erro}`);
  }
  return j.data;
}

const gql = <T>(query: string, variables: Record<string, unknown> = {}) => chamar<T>(JSON.stringify({ query, variables }), true);

const CAMPOS_ASSINATURA = `public_id name email action { name } link { short_link } user { name email }
  viewed { created_at } signed { created_at } rejected { created_at reason }`;

/** Cria o documento com o PDF e quem assina. Devolve o id e as assinaturas (com o link de cada uma) */
export async function criarDocumento(nome: string, pdf: Uint8Array, arquivo: string, signatarios: Signatario[]) {
  const sandbox = process.env.AUTENTIQUE_SANDBOX === "1";
  const query = `mutation CriarDocumento($document: DocumentInput!, $signers: [SignerInput!]!, $file: Upload!) {
    createDocument(${sandbox ? "sandbox: true, " : ""}document: $document, signers: $signers, file: $file) {
      id name signatures { ${CAMPOS_ASSINATURA} }
    }
  }`;
  const operations = {
    query,
    variables: {
      document: { name: nome, refusable: true, footer: "BOTTOM", locale: { country: "BR", language: "pt-BR", timezone: "America/Sao_Paulo", date_format: "DD_MM_YYYY" } },
      signers: signatarios,
      file: null,
    },
  };
  // envio do arquivo no formato multipart do GraphQL (operations + map + file)
  const form = new FormData();
  form.append("operations", JSON.stringify(operations));
  form.append("map", JSON.stringify({ file: ["variables.file"] }));
  form.append("file", new Blob([pdf], { type: "application/pdf" }), arquivo);
  const d = await chamar<{ createDocument: { id: string; name: string; signatures: AssinaturaApi[] } }>(form, false);
  return d.createDocument;
}

/** Id de documento seguro para ir no texto da consulta */
const idOk = (id: string) => {
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(id)) throw new Error("Autentique: id de documento inválido.");
  return id;
};

/** Situação do documento: quem já viu, assinou ou recusou, e o endereço do PDF assinado */
export async function lerDocumento(id: string) {
  const d = await gql<{ document: DocumentoApi | null }>(
    `query { document(id: "${idOk(id)}") { id name files { original signed } signatures { ${CAMPOS_ASSINATURA} } } }`,
  );
  if (!d.document) throw new Error("Autentique: documento não encontrado.");
  return d.document;
}

/** Apaga o documento (ao reabrir a minuta para editar: o pedido de assinatura antigo some) */
export async function apagarDocumento(id: string) {
  await gql<{ deleteDocument: boolean }>(`mutation { deleteDocument(id: "${idOk(id)}") }`);
}

/** Baixa o PDF assinado (com a página de verificação da Autentique) */
export async function baixarAssinado(url: string) {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.AUTENTIQUE_TOKEN ?? ""}` }, cache: "no-store" });
  const buf = Buffer.from(await r.arrayBuffer());
  if (!r.ok || buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new Error("Autentique: não foi possível baixar o PDF assinado.");
  return buf;
}

/** O aviso (webhook) veio mesmo da Autentique? HMAC-SHA256 do corpo, em hexadecimal, no cabeçalho X-Autentique-Signature */
export function webhookAutentico(corpo: string, assinatura: string | null) {
  const segredo = process.env.AUTENTIQUE_WEBHOOK_SECRET;
  if (!segredo || !assinatura) return false;
  const calculada = Buffer.from(createHmac("sha256", segredo).update(corpo).digest("hex"), "hex");
  const recebida = Buffer.from(assinatura.trim().toLowerCase(), "hex");
  return calculada.length === recebida.length && timingSafeEqual(calculada, recebida);
}

/**
 * Possíveis ids de documento no aviso. O formato muda entre eventos de documento e de assinatura,
 * então junta todo "id"/"document_id"/"document" (texto) e quem chama confere no banco.
 */
export function idsDoAviso(corpo: unknown): string[] {
  const ids = new Set<string>();
  const visitar = (o: unknown, nivel = 0) => {
    if (!o || typeof o !== "object" || nivel > 8) return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === "string" && (k === "id" || k === "document_id" || k === "document" || k === "uuid") && v.length <= 100) ids.add(v);
      else if (v && typeof v === "object") visitar(v, nivel + 1);
    }
  };
  visitar(corpo);
  return [...ids].slice(0, 50);
}
