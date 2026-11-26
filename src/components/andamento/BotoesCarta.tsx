/**
 * Dois botões dentro do passo da Carta de Intenção (pedido 25/11/2026): ver e baixar o modelo da SPE e ir para a
 * carta de intenção na proposta. Sem o endereço, o botão não aparece.
 */
export default function BotoesCarta({ speHref, cartaHref }: { speHref?: string | null; cartaHref?: string | null }) {
  if (!speHref && !cartaHref) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2.5">
      {speHref && (
        <a href={speHref} className="btn-navy gap-2 text-[14px]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 12v6M9 15l3 3 3-3" /></svg>
          Baixar Modelo SPE
        </a>
      )}
      {cartaHref && (
        <a href={cartaHref} className="btn-gold gap-2 text-[14px]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
          Ir para a Carta de Intenção
        </a>
      )}
    </div>
  );
}
