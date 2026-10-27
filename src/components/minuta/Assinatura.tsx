"use client";

import { useCallback, useEffect, useState } from "react";

type Estado = { nome: string; projeto: string; protocolo: string; telefone: string; temTelefone: boolean; confirmado: boolean; assinada: boolean; minuta: string | null };

const ASSINADOR = "https://assinador.iti.br";

/**
 * Página que a pessoa recebe para assinar a carta: confirma o celular com um código no
 * WhatsApp, lê a minuta, assina no gov.br e envia de volta o PDF assinado.
 */
export default function Assinatura({ token }: { token: string }) {
  const [e, setE] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");
  const [tel, setTel] = useState("");
  const [codigo, setCodigo] = useState("");
  const [enviouCodigo, setEnviouCodigo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [arquivo, setArquivo] = useState<File | null>(null);

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/assinar/${token}`, { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) return setErro(j.error ?? "Link inválido.");
    setE(j);
  }, [token]);
  useEffect(() => {
    carregar();
  }, [carregar]);

  async function post(url: string, body: unknown) {
    setOcupado(true);
    setErro("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Não foi possível.");
      return true;
    } catch (x) {
      setErro(x instanceof Error ? x.message : String(x));
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function enviarAssinado() {
    if (!arquivo) return setErro("Escolha o PDF assinado.");
    if (arquivo.size > 4 * 1024 * 1024) return setErro("O arquivo passa de 4 MB.");
    setOcupado(true);
    setErro("");
    try {
      const r = await fetch(`/api/assinar/${token}/enviar`, { method: "POST", headers: { "Content-Type": "application/pdf", "x-nome-arquivo": encodeURIComponent(arquivo.name) }, body: arquivo });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Não foi possível enviar.");
      await carregar();
    } catch (x) {
      setErro(x instanceof Error ? x.message : String(x));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <main className="min-h-screen bg-alt px-4 py-8">
      <div className="mx-auto max-w-[860px]">
        <header className="mb-6 flex items-center justify-between gap-4">
          <img src="/brand/lockup.webp" alt="Grupo JBL Incorporadora" className="h-12 w-auto" />
          {e && <span className="text-right text-[12px] text-muted">Protocolo <b className="font-mono text-navy">{e.protocolo}</b></span>}
        </header>

        {!e && !erro && <p className="py-20 text-center text-muted">Carregando…</p>}
        {erro && !e && <Caixa><p className="text-rose-700">{erro}</p></Caixa>}

        {e && e.assinada && (
          <Caixa>
            <div className="eyebrow">Carta de intenção · {e.projeto}</div>
            <h1 className="h-display mt-1 text-3xl">Carta assinada. Obrigado, {e.nome}!</h1>
            <p className="mt-3 text-[15px] text-ink">Recebemos a sua carta assinada pelo gov.br. Uma cópia foi enviada para o seu WhatsApp e outra para a equipe da JBL, que vai entrar em contato com os próximos passos.</p>
            {e.confirmado && <a className="btn-gold mt-5" href={`/api/assinar/${token}/pdf?assinada=1`}>Baixar a minha cópia assinada</a>}
          </Caixa>
        )}

        {e && !e.assinada && !e.confirmado && (
          <Caixa>
            <div className="eyebrow">Carta de intenção · {e.projeto}</div>
            <h1 className="h-display mt-1 text-3xl">Olá, {e.nome}! Primeiro, confirme que é você</h1>
            <p className="mt-3 text-[15px] text-ink">Digite o seu celular{e.telefone ? <> (o informado foi <b>{e.telefone}</b>)</> : ""}. Vamos mandar um código de 6 dígitos pelo WhatsApp.</p>
            <div className="mt-4 grid max-w-sm gap-3">
              <label className="grid gap-1 text-[13px] font-semibold text-navy">
                Celular com DDD
                <input className="input" inputMode="tel" autoComplete="tel" value={tel} onChange={(x) => setTel(x.target.value)} placeholder="(18) 99999-9999" />
              </label>
              <button className="btn-gold" disabled={ocupado || tel.replace(/\D/g, "").length < 10} onClick={async () => (await post(`/api/assinar/${token}/codigo`, { telefone: tel })) && setEnviouCodigo(true)}>
                {enviouCodigo ? "Mandar outro código" : "Receber código no WhatsApp"}
              </button>
              {enviouCodigo && (
                <>
                  <label className="grid gap-1 text-[13px] font-semibold text-navy">
                    Código recebido
                    <input className="input tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(x) => setCodigo(x.target.value.replace(/\D/g, ""))} />
                  </label>
                  <button className="btn-navy" disabled={ocupado || codigo.length !== 6} onClick={async () => (await post(`/api/assinar/${token}/verificar`, { codigo, telefone: tel })) && carregar()}>
                    Confirmar e abrir a carta
                  </button>
                </>
              )}
              {erro && <p className="text-[13px] font-semibold text-rose-700">{erro}</p>}
            </div>
          </Caixa>
        )}

        {e && !e.assinada && e.confirmado && (
          <>
            <Caixa>
              <div className="eyebrow">Minuta para assinatura · {e.projeto}</div>
              <h1 className="h-display mt-1 text-3xl">Leia a carta e assine com o gov.br</h1>
              <p className="mt-2 text-[14px] text-muted">Esta é a versão final, revisada pela JBL. Confira os seus dados antes de assinar.</p>
            </Caixa>
            {e.minuta && <iframe title="Minuta da carta de intenção" srcDoc={e.minuta} sandbox="" className="mt-4 h-[70vh] w-full rounded-md border border-line bg-white" />}
            <Caixa>
              <h2 className="h-display text-2xl">Como assinar</h2>
              <ol className="mt-3 grid gap-4 text-[15px] text-ink">
                <li>
                  <b>1. Baixe a carta em PDF.</b>
                  <div className="mt-2"><a className="btn-ghost" href={`/api/assinar/${token}/pdf`}>Baixar a carta (PDF)</a></div>
                </li>
                <li>
                  <b>2. Assine no gov.br.</b> Abra o assinador do governo, entre com a sua conta gov.br (nível prata ou ouro), escolha o arquivo baixado, clique em assinar e baixe o arquivo assinado.
                  <div className="mt-2"><a className="btn-ghost" href={ASSINADOR} target="_blank" rel="noreferrer">Abrir o assinador gov.br ↗</a></div>
                </li>
                <li>
                  <b>3. Envie aqui o PDF assinado.</b>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="file" accept="application/pdf,.pdf" className="max-w-full text-[13px]" onChange={(x) => setArquivo(x.target.files?.[0] ?? null)} />
                    <button className="btn-gold" disabled={ocupado || !arquivo} onClick={enviarAssinado}>{ocupado ? "Enviando…" : "Enviar carta assinada"}</button>
                  </div>
                </li>
              </ol>
              {erro && <p className="mt-3 text-[13px] font-semibold text-rose-700">{erro}</p>}
              <p className="mt-4 text-[12.5px] text-muted">A assinatura gov.br é gratuita e tem validade jurídica (Lei 14.063/2020). Uma cópia da carta assinada vai para o seu WhatsApp e outra para a JBL.</p>
            </Caixa>
          </>
        )}
      </div>
    </main>
  );
}

function Caixa({ children }: { children: React.ReactNode }) {
  return <section className="mt-4 rounded-md border border-line border-t-[3px] border-t-gold bg-white p-6 shadow-sm">{children}</section>;
}
