import { notFound } from "next/navigation";
import Shell from "@/components/shell/Shell";
import type { NavItem } from "@/components/shell/SideNav";
import { ETAPAS, lerChecklist, nomeEtapa, progresso, tituloArea, validarDocumentos } from "@/lib/captacao";
import { buscarArea } from "@/lib/captacao-db";

export const dynamic = "force-dynamic";

/** Menu lateral da área, igual à maquete (19/11/2026): voltar, cabeçalho, checklist, documentos, etapas e "do projeto" */
export default async function AreaLayout({ params, children }: { params: { id: string }; children: React.ReactNode }) {
  const a = await buscarArea(params.id);
  if (!a) notFound();
  const b = `/app/captacao/${a.id}`;
  const i = ETAPAS.findIndex(([k]) => k === a.etapa);
  const docsOk = Object.values(validarDocumentos(a.documentos)).filter((s) => s === "ok").length;
  const nav: NavItem[] = [
    { href: "/app/captacao", label: "Todos os projetos", simbolo: "◀", exact: true },
    { cabecalho: tituloArea(a), sub: [a.nome, nomeEtapa(a.etapa)].filter(Boolean).join(" · ") },
    { href: `${b}?aba=checklist`, label: "Checklist do estudo", simbolo: "✅", badge: `${progresso(lerChecklist(a.checklist)).pct}%` },
    { href: `${b}?aba=documentos`, label: "Documentos", simbolo: "📁", badge: `${docsOk}/15` },
    { grupo: "Etapas" },
    ...ETAPAS.map(([k, n], j): NavItem => ({ href: `${b}?aba=etapa&ver=${k}`, label: `${j + 1} ${n}`, simbolo: j < i ? "✔" : j === i ? "●" : "○", ativoSemAba: j === i })),
    { grupo: "Do projeto" },
    { href: `${b}?aba=custos`, label: "Custos", simbolo: "💰" },
    { href: `${b}?aba=pessoas`, label: "Pessoas", simbolo: "👥" },
    { href: `${b}?aba=pagina`, label: "Página do estudo", simbolo: "🌐" },
    { href: `${b}?aba=config`, label: "Configurações", simbolo: "⚙️" },
  ];
  return <Shell nav={nav}>{children}</Shell>;
}
