import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import ProjectSwitcher from "./ProjectSwitcher";
import SideNav, { type NavItem } from "./SideNav";

const empresaNav: NavItem[] = [
  { href: "/app", label: "Painel", icon: "grid", exact: true },
  { href: "/app/projetos", label: "Loteamentos", icon: "map" },
  { href: "/app/propostas", label: "Propostas", icon: "doc" },
  { href: "/app/templates", label: "Templates", icon: "layers" },
  { label: "Metas", icon: "target", soon: true },
  { label: "Parceiros", icon: "users", soon: true },
  { label: "Usuários", icon: "key", soon: true },
];

function projectNav(id: string): NavItem[] {
  const base = `/app/projetos/${id}`;
  return [
    { label: "Visão geral", icon: "grid", soon: true },
    { href: `${base}/propostas`, label: "Propostas", icon: "doc" },
    { label: "Análises", icon: "chart", soon: true },
    { label: "Documentação", icon: "folder", soon: true },
    { label: "Licenças e etapas", icon: "flag", soon: true },
    { label: "Tarefas dos parceiros", icon: "check", soon: true },
    { label: "CRM de vendas", icon: "users", soon: true },
    { label: "Grupo WhatsApp", icon: "chat", soon: true },
  ];
}

export default async function Shell({ projectId, children }: { projectId?: string; children: React.ReactNode }) {
  const session = await requireSession();
  const projects = await db.project.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, municipio: true, uf: true },
  });
  const current = projectId ? projects.find((p) => p.id === projectId) : undefined;

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
        <SideNav items={current ? projectNav(current.id) : empresaNav} />
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
