# Como fazer cada tipo de mudança

Cada receita segue as regras do [CLAUDE.md](../CLAUDE.md). Antes de subir qualquer coisa, veja [deploy.md](deploy.md).

## Tela nova
1. Página em `src/app/app/(empresa)/<nome>/page.tsx` (ou `(area)` se for dentro da área), com `export const dynamic = "force-dynamic"` se ler o banco.
2. Os dados vêm de uma função em `src/lib` (nunca `db` direto num componente).
3. A parte interativa vai num componente `"use client"` em `src/components/<assunto>/`, que só chama a API.
4. Visual: as classes do projeto (`card`, `btn-gold`, `btn-navy`, `btn-ghost`, `input`, `eyebrow`), azul-marinho `#122A45` e dourado `#C1943D`. O botão da próxima etapa é sempre o dourado.
5. Item no menu: `src/components/shell/Shell.tsx`.

## Rota nova da API
1. `src/app/api/<assunto>/route.ts`, com `export const dynamic = "force-dynamic"`.
2. Rota interna: tudo dentro de `withSession(...)` (`{ admin: true }` se for só de admin).
3. Rota pública (cliente, webhook, VPS, cron): confere token, assinatura ou segredo **antes de qualquer coisa**. Para a VPS, `senhaValida` de `claude-ponte.ts`.
4. Valida e limita o tamanho de tudo que chega (corpo, query, params, arquivo).
5. A regra fica numa função de `src/lib`, com teste; a rota só chama.

## Tabela ou coluna nova
1. Mude `prisma/schema.prisma`.
2. Escreva a migração à mão em `prisma/migrations/00NN_nome/migration.sql` (o número segue o último). Para gerar o SQL: `npx prisma migrate diff --from-schema-datamodel <schema antigo> --to-schema-datamodel prisma/schema.prisma --script`.
3. Toda tabela nova termina com `ALTER TABLE "Nome" ENABLE ROW LEVEL SECURITY;` (sem políticas).
4. `npx prisma generate` e `npx tsc --noEmit`.
5. A migração roda sozinha no deploy (`prisma migrate deploy`).

## Mudança de dados já gravados
Nunca direto no banco de produção. Sempre um passo em `prisma/seed-areas.ts` (ou `prisma/seed.ts`):
1. Função `export async function nomeDoPasso(db)` com comentário: o pedido, a data e o que faz.
2. **Idempotente**: confere se já foi feito e sai cedo (roda a cada deploy).
3. **Pula as propostas bloqueadas** (`lockedAt: null` no filtro).
4. Escreve uma linha no log (`console.log`) quando faz algo.
5. Chama no fim da lista em `prisma/seed.ts`.

## Mudança que aparece na proposta
Proposta bloqueada não muda nunca (ver [propostas.md](propostas.md)). Para `JblPadrao.tsx`, `IntentForm.tsx`, `jbl-padrao*.css`, `calc.ts` e tudo que a proposta mostra:
1. Acrescente `{ id, desde }` em `src/lib/congelada.ts`, com a data e hora do deploy.
2. No JSX: `mudou(props.bloqueadaEm, "id") ? novo : antigo`.
3. No CSS: `.jblt:not(.antes-id) ...`.
4. Na dúvida se aparece para o cliente, trate como se aparecesse.

## Mensagem de WhatsApp
1. Sempre por `enviarTexto` ou `enviarArquivo` de `src/lib/whatsapp.ts`: o limite (1 a cada 10 min para o robô, com fila de espera) é conferido lá.
2. Mensagem do robô começa com `🤖`. Sem isso, o robô lê a própria mensagem (o WhatsApp conectado é o do Fernando).
3. Prefira uma mensagem só (por exemplo, PDF com legenda) a várias seguidas.
4. Mensagem digitada pela pessoa na tela de Conversas usa `{ manual: true }` (limite de 20 a cada 15 min).

## Pedido para o Claude da VPS
1. Crie um `ComandoClaude` com o `tipo` (pesquisa, estudo, mercado, classificar). A VPS pega na fila a cada 30 s.
2. Tipo novo: trate em `src/app/api/claude/fila/route.ts` (GET monta, POST guarda) e em `ferramentas/ponte-claude/ponte.mjs`.
3. Depois de mudar `ponte.mjs`, copie para a VPS e reinicie o serviço (ver [vps.md](vps.md)).

## Estudo de uma área
Ver [estudos.md](estudos.md). O formato está em [estudos-padrao.md](estudos-padrao.md).
