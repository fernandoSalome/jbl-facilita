# Facilita (JBL)

## Regra: propostas bloqueadas (desabilitadas) não mudam

Proposta bloqueada (`lockedAt`) já foi enviada e pode ter sido assinada. Nada do que o cliente vê nela pode mudar
depois do bloqueio: nem por alteração no template, nem por alteração no código do projeto.

- **Dados:** passos do `prisma/seed.ts`, salvar template e qualquer atualização em massa filtram `lockedAt IS NULL`.
- **Código da proposta** (`JblPadrao.tsx`, `IntentForm.tsx`, `jbl-padrao*.css`, `calc.ts` e o que a proposta mostra):
  toda mudança visível entra em `src/lib/congelada.ts` com a data do deploy, e a versão antiga continua valendo
  para as bloqueadas antes dessa data (`mudou(props.bloqueadaEm, id)` no JSX, `.jblt:not(.antes-id)` no CSS).
  Ou use uma marca nos `inputs` gravada só nas não bloqueadas.
- Na dúvida se uma mudança aparece na proposta, trate como se aparecesse.
