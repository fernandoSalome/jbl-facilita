"use client";

import { useState } from "react";
import { WHATSAPP_NUMERO } from "./content";

// O formulário do WordPress (WPForms) dependia do servidor de lá. Aqui ele monta
// a mensagem e abre o WhatsApp da JBL já preenchido, sem backend.
export function ContatoForm() {
  const [enviado, setEnviado] = useState(false);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("site")) return; // campo-isca contra robôs
    const texto = [
      "Olá! Vim através do site e gostaria de mais informações.",
      `Nome: ${f.get("nome")}`,
      `E-mail: ${f.get("email")}`,
      `Telefone: ${f.get("telefone")}`,
      `Mensagem: ${f.get("mensagem")}`,
    ].join("\n");
    window.open(`https://api.whatsapp.com/send/?phone=${WHATSAPP_NUMERO}&text=${encodeURIComponent(texto)}`, "_blank");
    setEnviado(true);
  }

  return (
    <form onSubmit={enviar} className="s-form">
      <input type="text" name="site" tabIndex={-1} autoComplete="off" className="s-form__isca" aria-hidden="true" />
      <label className="sr-only" htmlFor="c-nome">
        Nome
      </label>
      <input id="c-nome" name="nome" placeholder="Nome" required />
      <label className="sr-only" htmlFor="c-email">
        E-mail
      </label>
      <input id="c-email" name="email" type="email" placeholder="E-mail" required />
      <label className="sr-only" htmlFor="c-tel">
        Telefone
      </label>
      <input id="c-tel" name="telefone" type="tel" placeholder="Telefone" required />
      <label className="sr-only" htmlFor="c-msg">
        Comentário ou Mensagem
      </label>
      <textarea id="c-msg" name="mensagem" placeholder="Mensagem" rows={5} required />
      <button type="submit">Enviar</button>
      {enviado && <p className="s-form__ok">Abrimos o WhatsApp com a sua mensagem. É só tocar em enviar.</p>}
    </form>
  );
}
