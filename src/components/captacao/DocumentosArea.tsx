"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DOCS_PADRAO, STATUS_DOC } from "@/lib/captacao";
import { chamar } from "./chamar";

const COR = { ok: "bg-emerald-100 text-emerald-800", pedido: "bg-gold-soft text-gold-ink", falta: "bg-rose-50 text-rose-700" } as const;

/** Documentos da área por grupo: o que chegou, o que foi pedido e o que falta */
type Arquivo = { id: string; titulo: string; fileName: string; criado: string; enviadoPor: string | null };

export default function DocumentosArea({ id, documentos, arquivos = [] }: { id: string; documentos: Record<string, keyof typeof STATUS_DOC>; arquivos?: Arquivo[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState(documentos);
  const grupos = [...new Set(DOCS_PADRAO.map((d) => d.grupo))];
  async function mudar(nome: string, st: keyof typeof STATUS_DOC) {
    const novo = { ...docs, [nome]: st };
    setDocs(novo);
    await chamar(`/api/areas/${id}`, "PATCH", { documentos: novo });
    router.refresh();
  }
  return (
    <div className="grid gap-4">
    {/* arquivos que chegaram (WhatsApp ou loteamento ligado), pedido 20/11/2026 */}
    <section className="card p-4">
      <h3 className="eyebrow mb-3">Arquivos recebidos</h3>
      {arquivos.length ? (
        <ul className="grid gap-1.5 text-sm">
          {arquivos.map((d) => (
            <li key={d.id} className="flex flex-wrap justify-between gap-3">
              <a className="font-semibold text-navy hover:underline" href={`/api/documentos/${d.id}`} target="_blank" rel="noreferrer">📄 {d.titulo}</a>
              <span className="text-muted">{d.criado}{d.enviadoPor ? ` · ${d.enviadoPor}` : ""}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">Nada ainda. Mande no WhatsApp citando a área (ex.: “segue a matrícula de Sorocaba”).</p>}
    </section>
    <div className="grid gap-4 md:grid-cols-2">
      {grupos.map((g) => (
        <section key={g} className="card p-4">
          <h3 className="eyebrow mb-3">{g}</h3>
          <ul className="grid gap-2 text-sm">
            {DOCS_PADRAO.filter((d) => d.grupo === g).map((d) => {
              const st = docs[d.nome] ?? "falta";
              return (
                <li key={d.nome} className="flex items-center justify-between gap-3">
                  <span>{d.nome}</span>
                  <select className={`rounded-sm px-2 py-0.5 text-[12px] font-bold ${COR[st]}`} value={st} onChange={(e) => mudar(d.nome, e.target.value as keyof typeof STATUS_DOC)}>
                    {Object.entries(STATUS_DOC).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
    </div>
  );
}
