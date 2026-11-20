"use client";

export default function BotaoImprimir() {
  return <button className="btn-gold" onClick={() => window.print()}>Imprimir / salvar PDF</button>;
}
