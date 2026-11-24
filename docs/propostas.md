# Propostas

A proposta é a página que o proprietário recebe (`/p/<token>`), montada pelo template **JBL Padrão** (`modelos/jbl-padrao/`, `src/components/template/JblPadrao.tsx`) com as contas de `src/lib/calc.ts`. É editada em `/app/proposta/[id]`.

## Proposta bloqueada não muda

Proposta bloqueada (`lockedAt`) já foi enviada e pode ter sido assinada. **Nada do que o cliente vê nela pode mudar** depois do bloqueio:

- **Dados:** passos do seed, salvar template e qualquer atualização em massa filtram `lockedAt IS NULL`.
- **Código:** toda mudança visível em `JblPadrao.tsx`, `IntentForm.tsx`, `jbl-padrao*.css`, `calc.ts` e no que a proposta mostra entra em `src/lib/congelada.ts` com a data do deploy. As bloqueadas antes dessa data continuam com o jeito antigo:
  - JSX: `mudou(props.bloqueadaEm, "id") ? novo : antigo`;
  - CSS: `.jblt:not(.antes-id) …`.
- Outra saída: uma marca nos `inputs` gravada só nas não bloqueadas.
- Na dúvida se a mudança aparece na proposta, trate como se aparecesse.

## Prazos de recebimento

Os prazos (botões de "Quanto recebe por mês", barras e tabela completa, e a tabela da planilha) vão só até o prazo escolhido na planilha: 10 anos mostra 3, 5, 8 e 10; 14 mostra até 13 e o 14; 17 mostra até 15 e o 17. A conta é a mesma (`cenariosAte` em `calc.ts`); bloqueadas antes de 24/11/2026 continuam com todos (`prazos-ate-o-escolhido` em `congelada.ts`).

## Proposta das Áreas (Captação)

Quando a área chega na etapa Proposta, a proposta nasce com o que os estudos definiram (área, lote, frente, aproveitamento, valor do m²) e abre no editor de sempre (`captacao-proposta.ts`). O resto do fluxo da carta está em [captacao.md](captacao.md#carta-de-intenção-dentro-da-proposta).

## Carta de intenção, minuta e assinatura

1. O proprietário preenche a carta de intenção na proposta (`IntentForm.tsx`; rota pública `/api/public/[token]/carta`).
2. A minuta é montada com o texto oficial e os dados recebidos (`minuta.ts`, `carta.ts`). Ela é revisada e editada no **editor de contrato** (`/app/minuta/[id]`).
3. **Envio para assinatura** (`garantirLink` em `minuta-acoes.ts`): o texto fica travado, vira PDF e documento na **Autentique**. O link vai pelo WhatsApp ou pelo e-mail da pessoa.
4. **Retorno:** a Autentique avisa pelo webhook (`/api/autentique/webhook`, com assinatura conferida) e a tela também confere. Assinada por todos, o PDF assinado vai para o grupo e para a pessoa.

| Proposta de… | Quando a carta chega |
|---|---|
| Área da Captação | Só o **JBL - Central** recebe: PDF da minuta + dados + "Posso enviar para assinatura?". Nada vai sozinho |
| Loteamento antigo | Todos os grupos recebem os dados e as opções (`ver minuta`, `enviar link`, `enviar email`, `não`) |

## PDF da proposta

`src/lib/pdf.ts` abre a página pública num Chromium da Vercel e salva em slides 16:9 (`/api/public/[token]/pdf`).
