import { FUNCOES } from "@/lib/grupos";

/** O que cada tipo de grupo faz (pedido 19/11/2026); a função de cada um é escolhida na lista acima */
export default function FuncoesGrupos() {
  return (
    <section className="card p-5 text-sm leading-relaxed">
      <h3 className="eyebrow mb-3">Tipos de grupo</h3>
      <ul className="grid gap-3">
        {Object.entries(FUNCOES).map(([k, f]) => (
          <li key={k}>
            <b className="text-navy">{f.nome}</b>: {f.resumo}
            <ul className="mt-1 list-disc pl-5 text-[13px] text-muted">{f.regras.map((r) => <li key={r}>{r}</li>)}</ul>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12.5px] text-muted">Conversas individuais (proprietário, corretor) se ligam à área na Captação, em Configurações da área.</p>
    </section>
  );
}
