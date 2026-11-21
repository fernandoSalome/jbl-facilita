# Deploy

O código vai para o ar **só pela Vercel**, ligada ao GitHub: cada push na `main` faz o deploy. O Railway não é mais usado.

## O que o deploy roda

`vercel-build` (em `package.json`):

1. `prisma generate`
2. `prisma migrate deploy` (as migrações novas de `prisma/migrations`)
3. `tsx prisma/seed.ts` (os passos de dados; cada um é idempotente e roda a cada deploy)
4. `next build`

Se o build falhar, a Vercel **não publica**: o site continua na versão anterior.

## Antes de subir

1. `git pull` antes de mexer (alguém pode ter subido pelo app do Claude).
2. `npx tsc --noEmit` sem erro (os erros dentro de `base/` não contam: a pasta não vai para o git).
3. `npx vitest run`. O teste de `src/lib/apresentacao/modelo.test.ts` depende de uma planilha em `base/` e falha; é conhecido.
4. **Build numa cópia sem a pasta `base/`**, igual à Vercel, e conferir o código de saída:
   ```bash
   D=$(mktemp -d) && rsync -a --exclude base --exclude .next --exclude .git --exclude node_modules ./ $D/ \
     && ln -s $PWD/node_modules $D/node_modules && (cd $D && npx next build); echo build=$?
   ```
   Se falhar só no download das fontes do Google, é passageiro: rode de novo.
5. Componente `"use client"` não importa `node:*` (quebra o build).
6. **Pedir o "pode subir" do Fernando** antes de cada push.
7. No commit, liste os arquivos um por um e confira o `git status` antes do commit. Um nome de arquivo errado no `git add` faz o commit sair pela metade (já aconteceu duas vezes).
8. Depois do push, esperar o status do commit: `gh api repos/{owner}/{repo}/commits/<hash>/status -q .state` (`success`).

## Nunca vai para o git

- Segredos: ficam só nas variáveis da Vercel e nos `.env` da VPS.
- Cópias do banco (`backup-*.sql`).
- A pasta `base/` (material do professor, transcrições, jogadas).
