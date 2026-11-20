"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { CartaDaArea } from "@/lib/captacao-assinatura";
import { chamar } from "./chamar";

const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");

/**
 * Carta de intenção na etapa Proposta (pedido 20/11/2026): aguardando o recebimento; depois os dados que a pessoa
 * mandou, o editor de contrato e a confirmação do envio (nada sai sozinho); depois quem viu, assinou ou recusou.
 * Atualiza sozinha a cada 30 s; quando todos assinam, a área segue para o estudo de 30 dias.
 */
export default function CartaDaProposta({ carta }: { carta: CartaDaArea | null }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (carta?.status === "assinada") return;
    const t = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(t);
  }, [router, carta?.status]);

  if (!carta)
    return (
      <section className="card border-dashed p-5 text-sm">
        <h3 className="eyebrow mb-2">Carta de intenção</h3>
        <p className="font-semibold text-navy">⏳ Aguardando o recebimento.</p>
        <p className="mt-1 text-muted">Quando o proprietário preencher e enviar a proposta, os dados dele aparecem aqui e o JBL - Central recebe a minuta para confirmar o envio.</p>
      </section>
    );

  const reenviar = async (acao: "whatsapp" | "email") => {
    setBusy(true);
    try {
      const r = await chamar<{ para: string }>(`/api/letters/${carta.id}/minuta`, "POST", { acao });
      setMsg(`✅ Link enviado para ${r.para}.`);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  };
  const assinada = carta.status === "assinada";

  return (
    <section className={`card border-2 p-5 text-sm ${assinada ? "border-emerald-200" : "border-gold-line"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-xl text-navy">✍️ Carta de intenção · {carta.nome}</h3>
        <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ${assinada ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : carta.status === "enviada" ? "bg-gold-soft text-gold-ink ring-gold-line" : "bg-navy-50 text-navy ring-line"}`}>
          {assinada ? `Assinada por todos em ${quando(carta.assinadaEm)}` : carta.status === "enviada" ? "No assinador, esperando assinar" : "Recebida · falta confirmar o envio"}
        </span>
      </div>
      {carta.status === "revisao" && (
        <div className="mt-3 grid gap-1 rounded border border-line bg-surface px-3 py-2.5">
          <p><b className="text-navy">Dados que chegaram:</b> {carta.nome}{carta.cpf ? ` · CPF ${carta.cpf}` : ""}</p>
          <p>{carta.telefone ? `📱 ${carta.telefone}` : "sem telefone"} · {carta.email ? `✉️ ${carta.email}` : "sem e-mail"}</p>
          <p className="text-muted">Proposta {carta.proposta}. Confira e mude o contrato no editor antes de confirmar o envio.</p>
        </div>
      )}
      <p className="mt-1 text-[12.5px] text-muted">Protocolo {carta.protocolo} · recebida em {quando(carta.recebidaEm)}{carta.linkEnviadoEm ? ` · link enviado em ${quando(carta.linkEnviadoEm)}` : ""}</p>

      {carta.assinaturas.length > 0 && (
        <ul className="mt-3 grid gap-1.5">
          {carta.assinaturas.map((a) => (
            <li key={a.nome + a.papel} className="flex flex-wrap items-center gap-2 rounded border border-line px-3 py-2">
              <b className="text-navy">{a.nome}</b> <span className="text-muted">{a.papel}</span>
              <span className="flex-1" />
              {a.assinadoEm ? <span className="font-semibold text-emerald-700">✅ assinou {quando(a.assinadoEm)}</span>
                : a.recusadoEm ? <span className="font-semibold text-rose-700">✖ recusou {quando(a.recusadoEm)}{a.motivo ? `: ${a.motivo}` : ""}</span>
                : a.vistoEm ? <span className="text-gold-ink">👁 abriu {quando(a.vistoEm)}, falta assinar</span>
                : <span className="text-muted">ainda não abriu</span>}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link className={carta.status === "revisao" ? "btn-gold py-1.5 text-[13px]" : "btn-navy py-1.5 text-[13px]"} href={`/app/minuta/${carta.id}`}>✏️ {carta.status === "revisao" ? "Abrir no editor de contrato" : "Ver o contrato"}</Link>
        {carta.status === "revisao" && (
          <>
            <button className="btn-navy py-1.5 text-[13px]" disabled={busy || !carta.telefone} onClick={() => confirm(`Confirmar o envio para assinatura no WhatsApp de ${carta.nome}? Depois disso o texto fica travado.`) && reenviar("whatsapp")}>✓ Confirmar envio no WhatsApp</button>
            <button className="btn-ghost py-1.5 text-[13px]" disabled={busy || !carta.email} onClick={() => confirm(`Confirmar o envio para assinatura no e-mail de ${carta.nome}? Depois disso o texto fica travado.`) && reenviar("email")}>Confirmar envio por e-mail</button>
          </>
        )}
        {carta.status === "enviada" && (
          <>
            <button className="btn-ghost py-1.5 text-[13px]" disabled={busy} onClick={() => reenviar("whatsapp")}>Reenviar no WhatsApp</button>
            <button className="btn-ghost py-1.5 text-[13px]" disabled={busy} onClick={() => reenviar("email")}>Reenviar por e-mail</button>
          </>
        )}
        {assinada && <span className="text-[13px] text-emerald-800">A área seguiu para o Estudo de 30 dias.</span>}
      </div>
      {msg && <p className="mt-2 text-[13px] font-semibold text-navy">{msg}</p>}
      {carta.status === "enviada" && <p className="mt-2 text-[12px] text-muted">Esta tela confere o assinador sozinha a cada 30 segundos.</p>}
    </section>
  );
}
