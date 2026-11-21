# Facilita (JBL)

O detalhe de cada parte (arquitetura, como fazer cada mudança, áreas, estudos, propostas, WhatsApp, VPS e deploy)
está em [docs/](docs/README.md). Mudou uma regra? Mude o documento no mesmo commit.

## Regra: propostas bloqueadas (desabilitadas) não mudam

Proposta bloqueada (`lockedAt`) já foi enviada e pode ter sido assinada. Nada do que o cliente vê nela pode mudar
depois do bloqueio: nem por alteração no template, nem por alteração no código do projeto.

- **Dados:** passos do `prisma/seed.ts`, salvar template e qualquer atualização em massa filtram `lockedAt IS NULL`.
- **Código da proposta** (`JblPadrao.tsx`, `IntentForm.tsx`, `jbl-padrao*.css`, `calc.ts` e o que a proposta mostra):
  toda mudança visível entra em `src/lib/congelada.ts` com a data do deploy, e a versão antiga continua valendo
  para as bloqueadas antes dessa data (`mudou(props.bloqueadaEm, id)` no JSX, `.jblt:not(.antes-id)` no CSS).
  Ou use uma marca nos `inputs` gravada só nas não bloqueadas.
- Na dúvida se uma mudança aparece na proposta, trate como se aparecesse.

## Arquitetura (todo código novo segue)

- **Camadas:** tela (`src/app`, `src/components`) → rota da API (`src/app/api`, fina: sessão, validação, chama o
  serviço) → regras e acesso ao banco (`src/lib`). Conta e regra de negócio ficam em funções puras em `src/lib`,
  com teste no vitest (`*.test.ts` ao lado); componente não faz conta nem fala com o banco.
- **Rotas:** toda rota interna usa `withSession` (`withSession(..., { admin: true })` para o que é só de admin).
  Rota pública (link do cliente, webhooks, cron) confere token, assinatura ou segredo antes de qualquer coisa.
  Rota que lê o banco tem `export const dynamic = "force-dynamic"`.
- **Entrada:** todo dado que chega (corpo, query, params, arquivo) é validado e limitado em tamanho antes de usar.
  Texto formatado só passa por `cleanOverride`/`sanitizeHtml` (`src/lib/sanitize.ts`); nada de HTML cru do usuário.
- **Banco:** mudança de estrutura só por migração em `prisma/migrations` (toda tabela nova com
  `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`); mudança de dados só por passo idempotente em `prisma/seed.ts`, com
  data do pedido, que roda uma vez, pula as bloqueadas e escreve no log do deploy.
- **Arquivos grandes** (`JblPadrao.tsx`, `Editable.tsx`, `StudyEditor.tsx`, `ProposalEditor.tsx`): coisa nova vai
  em componente ou módulo próprio, importado; não engordar esses arquivos.
- **Nomes:** em português, como o resto do projeto; comentário explica o porquê (pedido, data, regra), não o óbvio.

## Segurança

- Segredos só nas variáveis da Vercel; nunca no código, no git ou no log. Cópias do banco (`backup-*.sql`) e a
  pasta `base/` nunca vão para o git.
- Login com limite de senhas erradas (`LoginTentativa`); sessão em cookie httpOnly, secure e sameSite.
- Cabeçalhos de segurança no `next.config.mjs` (sem abrir dentro de iframe de outro site, nosniff, HSTS,
  Referrer-Policy, Permissions-Policy). Recurso novo que precise de câmera, microfone, localização ou iframe
  externo: ajustar ali.
- RLS ligado em todas as tabelas, sem políticas: a API pública do Supabase não acessa nada; o app usa o Prisma.
