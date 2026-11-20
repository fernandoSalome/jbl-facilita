"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

export type ContatoLinha = { id: string; nome: string; telefone: string; papel: string | null; resumo: string | null; ultima: string | null; ultimaDeMim: boolean; quando: string };

const PAPEL: Record<string, string> = { proprietario: "Terrenista", corretor: "Corretor", outro: "Outro" };

/** Contatos de terra ainda sem área (pedido 20/11/2026): ligar a uma área ou tirar da lista */
function Linha({ c, areas }: { c: ContatoLinha; areas: { id: string; titulo: string }[] }) {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const agir = async (corpo: Record<string, unknown>) => {
    setBusy(true);
    try { await chamar("/api/contatos-terra", "PATCH", { id: c.id, ...corpo }); router.refresh(); } catch (e) { alert((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold font-display text-navy">{c.nome[0]}</span>
      <span className="min-w-0 flex-1">
        <b className="text-navy">{c.nome}</b> <span className="text-[12px] text-muted">{PAPEL[c.papel ?? ""] ?? "Contato"} · +{c.telefone}</span>
        {c.resumo && <span className="block text-[13px] text-navy">{c.resumo}</span>}
        <span className="block truncate text-[13px] text-muted">{c.ultima ? `${c.ultimaDeMim ? "Você: " : ""}${c.ultima}` : "sem mensagens guardadas"}</span>
      </span>
      <span className="shrink-0 text-[12px] text-muted">{c.quando}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        <select className="input w-44 py-1 text-[13px]" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Ligar a uma área…</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.titulo}</option>)}
        </select>
        <button className="btn-gold py-1 text-[12.5px]" disabled={busy || !area} onClick={() => agir({ acao: "ligar", areaId: area })}>Ligar</button>
        <button className="btn-ghost py-1 text-[12.5px]" disabled={busy} onClick={() => confirm("Tirar este contato? A conversa guardada é apagada e ele não volta mais.") && agir({ acao: "fora" })}>Não é de terra</button>
      </span>
    </div>
  );
}

export default function ContatosTerra({ contatos, areas, pendentes, admin }: { contatos: ContatoLinha[]; areas: { id: string; titulo: string }[]; pendentes: number; admin: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [lendo, setLendo] = useState(false);

  async function lerAntigas() {
    if (!confirm("Ler as conversas particulares dos últimos 45 dias? Nada é enviado; o Claude separa as que são de terra e o resto é descartado.")) return;
    setLendo(true);
    try {
      for (let p: number | null = 0; p !== null; ) {
        const r: { feitas: number; total: number; proxima: number | null } = await chamar("/api/contatos-terra", "POST", { pagina: p });
        setMsg(`Lendo… ${r.feitas} de ${r.total} conversas`);
        p = r.proxima;
      }
      setMsg("✅ Conversas lidas. O Claude está separando as de terra: elas aparecem aqui em alguns minutos.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setLendo(false);
  }

  return (
    <section className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl text-navy">Contatos de terra sem área</h2>
        <span className="text-[13px] text-muted">Terrenistas e corretores que falaram de terra com você. O Claude lê a conversa e separa.{pendentes ? ` ${pendentes} conversa(s) esperando leitura.` : ""}</span>
        <span className="flex-1" />
        {admin && <button className="btn-ghost py-1 text-[12.5px]" disabled={lendo} onClick={lerAntigas}>{lendo ? "Lendo…" : "Ler conversas antigas"}</button>}
      </div>
      {msg && <p className="text-[13px] font-semibold text-navy">{msg}</p>}
      <div className="card divide-y divide-line">
        {contatos.map((c) => <Linha key={c.id} c={c} areas={areas} />)}
        {!contatos.length && <p className="px-4 py-6 text-center text-sm text-muted">Nenhum contato de terra sem área.</p>}
      </div>
    </section>
  );
}
