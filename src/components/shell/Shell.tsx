import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import ProjectSwitcher from "./ProjectSwitcher";
import { modoSimples } from "@/lib/modo";
import SideNav, { type NavItem } from "./SideNav";

const empresaNav: NavItem[] = [
  { href: "/app", label: "Painel", icon: "grid", exact: true },
  { grupo: "Dia a dia" },
  { href: "/app/dia-a-dia", label: "Dashboard Dia a Dia", icon: "check" },
  { href: "/app/calendario", label: "Agenda", icon: "calendar" },
  { href: "/app/conversas", label: "Conversas", icon: "chat" },
  { grupo: "Negócios" },
  { href: "/app/captacao", label: "Áreas", icon: "target" },
  { href: "/app/estudos", label: "Estudos", icon: "chart" },
  { href: "/app/propostas", label: "Propostas", icon: "doc" },
  { href: "/app/cartas", label: "Cartas recebidas", icon: "inbox" },
  { grupo: "Ferramentas" },
  { href: "/app/cidades", label: "Biblioteca de cidades", icon: "flag" },
  { href: "/app/templates", label: "Templates", icon: "layers" },
  { href: "/app/imagens", label: "Banco de imagens", icon: "image" },
  { href: "/app/whatsapp", label: "Assistente WhatsApp", icon: "chat" },
  { grupo: "Empresa" },
  { label: "Metas", icon: "target", soon: true },
  { label: "Parceiros", icon: "users", soon: true },
  { href: "/app/usuarios", label: "Usuários", icon: "key" },
];

/** Modo simples: só o do dia a dia (pedido 20/11/2026) */
const simplesNav: NavItem[] = [
  { href: "/app/dia-a-dia", label: "Hoje", icon: "check" },
  { href: "/app/captacao", label: "Áreas", icon: "target" },
  { href: "/app/calendario", label: "Agenda", icon: "calendar" },
  { href: "/app/propostas", label: "Propostas", icon: "doc" },
  { href: "/app/conversas", label: "Conversas", icon: "chat" },
];

/**
 * Menu do Projeto de Loteamento (pedido 20/11/2026): só existe depois do contrato da SPE. A negociação inteira
 * (viabilidades, reunião, proposta, estudo de 30 dias e contrato) fica em "Viabilidade e Contrato"; fora fica a jornada.
 */
function projectNav(id: string, areaId: string | null): NavItem[] {
  const base = `/app/projetos/${id}`;
  return [
    ...(areaId ? ([{ href: `/app/captacao/${areaId}`, label: "Viabilidade e Contrato", icon: "folder" }] as NavItem[]) : []),
    { href: `${base}/propostas`, label: "Propostas", icon: "doc" },
    { href: `${base}/documentos`, label: "Documentação", icon: "folder" },
    { grupo: "Jornada" },
    { label: "Aprovação", icon: "flag", soon: true },
    { label: "Obras", icon: "layers", soon: true },
    { label: "Vendas", icon: "chart", soon: true },
    { label: "Carteira", icon: "users", soon: true },
    { grupo: "Do projeto" },
    { label: "WhatsApp", icon: "chat", soon: true },
    { href: `${base}/configuracoes`, label: "Configurações", icon: "cog" },
  ];
}

/** nav: menu próprio da página (ex.: a área da Captação, com etapas e checklist) */
export default async function Shell({ projectId, nav, children }: { projectId?: string; nav?: NavItem[]; children: React.ReactNode }) {
  const session = await requireSession();
  const simples = modoSimples();
  // só os loteamentos com contrato da SPE assinado aparecem no seletor (pedido 20/11/2026)
  const projects = await db.project.findMany({
    where: { deletedAt: null, speAssinadaEm: { not: null } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, municipio: true, uf: true },
  });
  // o projeto aberto pelo endereço aparece mesmo sem SPE (ex.: para ver as propostas de antes)
  const current = projectId ? (projects.find((p) => p.id === projectId) ?? (await db.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true, name: true, municipio: true, uf: true } })) ?? undefined) : undefined;
  const areaDoProjeto = current ? await db.area.findFirst({ where: { projectId: current.id, deletedAt: null }, select: { id: true } }) : null;


  return (
    <div className="flex min-h-screen bg-alt">
      <aside className="sticky top-0 flex h-screen w-[264px] shrink-0 flex-col bg-navy text-white">
        <div className="border-b border-white/10 px-5 pb-4 pt-5">
          <div className="mb-4 flex items-center gap-2.5">
            <svg width="26" height="26" viewBox="0 0 40 40" aria-hidden>
              {[[20, 4], [8, 16], [32, 16], [20, 28]].map(([x, y]) => (
                <rect key={`${x}${y}`} x={x - 6.5} y={y - 6.5 + 4} width="13" height="13" rx="2.5" transform={`rotate(45 ${x} ${y + 4})`} fill="#D4B06A" />
              ))}
            </svg>
            <div className="leading-tight">
              <div className="font-display text-[15px] tracking-wide">JBL Facilita</div>
              <div className="text-[9.5px] uppercase tracking-[0.22em] text-white/50">Portal da empresa</div>
            </div>
          </div>
          <ProjectSwitcher projects={projects} currentId={current?.id} />
        </div>
        <Suspense><SideNav items={nav ?? (current ? projectNav(current.id, areaDoProjeto?.id ?? null) : simples ? simplesNav : empresaNav)} /></Suspense>
        <div className="mt-auto border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full border border-gold/50 bg-gold/15 font-display text-sm text-gold">
              {session.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-semibold">{session.name}</div>
              <div className="text-[11px] text-white/50">{session.role === "ADMIN" ? "Administrador" : "Usuário"}</div>
            </div>
            <form action={logout}>
              <button className="rounded p-1.5 text-white/50 hover:bg-white/10 hover:text-white" title="Sair">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
