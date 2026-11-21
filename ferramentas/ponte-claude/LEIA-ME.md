# Ponte WhatsApp → Claude Code (VPS)

Pelo grupo **JBL - Central** (mensagem começando com "Claude, …") a equipe pede pesquisas; pelo grupo **JBL - Claude**, se existir, só o Fernando e os números de `CLAUDE_AUTORIZADOS`. A visão geral da VPS está em [docs/vps.md](../../docs/vps.md). Um pedido percorre este caminho:

1. O robô do Facilita guarda o pedido numa fila (tabela `ComandoClaude`).
2. Esta ponte, na VPS, busca o pedido.
3. A ponte roda o `claude -p` com a assinatura. O Claude só pode usar pesquisa na web e leitura: não altera arquivos nem roda comandos.
4. A ponte devolve a resposta ao Facilita.
5. O Facilita manda a resposta no grupo, dentro do limite de 2 mensagens a cada 15 minutos.

Pelo WhatsApp não se altera o código do sistema. Isso é feito pelo app do Claude.

## Na VPS (usuário `jbl`)

| O quê | Onde |
|---|---|
| Programa | `~/ponte/ponte.mjs` |
| Variáveis | `~/.ponte.env` (`CLAUDE_PONTE_SECRET` e `FACILITA_URL`), com `chmod 600` |
| Serviço | `systemctl status jbl-ponte`, que reinicia sozinho |
| Registro | `journalctl -u jbl-ponte -f` (só com sudo; o usuário `jbl` não vê) |
| Login do Claude | uma vez: `claude` e depois `/login`, com a assinatura |

## Na Vercel

- `CLAUDE_PONTE_SECRET`: a mesma senha do `~/.ponte.env`.
- `CLAUDE_AUTORIZADOS`: números que podem pedir no grupo JBL - Claude. No JBL - Central todos do grupo podem (desde 20/11/2026). As mensagens do próprio WhatsApp conectado sempre valem.

## No sistema

Em **Assistente WhatsApp**, marque o grupo **JBL - Claude** com a função "JBL - Claude".

## Estudos pelo WhatsApp

Para pedir um estudo, cite a área. Ela precisa ter KMZ.

| Pedido | Resultado |
|---|---|
| “faça a viabilidade legal do Sítio do Pedro” (ou “rode o raio-x de Sorocaba”) | Estudo 1 nas 17 seções do padrão, com imagens |
| “faça a viabilidade mercadológica de Sorocaba” | Estudo 2, de concorrentes |

O que acontece:

1. A ponte cria `~/estudos/trabalho/<id>/entrada.json`, com o polígono e o que já existe da área.
2. O Claude segue `~/estudos/CLAUDE.md`. Nos estudos, ele pode usar Python e escrever arquivos dentro de `~/estudos`; o limite é de 90 minutos.
3. Ele entrega três arquivos:
   - `relatorio.html`: o estudo completo;
   - `resultado.json`: os campos do formulário;
   - `resposta.txt`: o resumo para o WhatsApp.
4. A plataforma grava o estudo na área: `estudo1` e `relatorioCompleto`, ou `estudo2` e `relatorioMercado`.
5. O resumo vai para o grupo.

As referências ficam em `~/estudos/referencia`: o padrão, as regras, as fontes, os scripts e os exemplos. A pasta `base/` com o material do professor não vai para a VPS.

## Repetidor do webhook do WhatsApp

Na Evolution, cada conexão manda as mensagens para um só endereço. A conexão **"Fernando"** é a do Facilita: por ela saem as mensagens 🤖.

Desde 20/11/2026, essa conexão manda para o repetidor (`~/ponte/repetidor.mjs`, serviço `jbl-repetidor`). O repetidor:

- escuta só na rede interna do Docker (`172.17.0.1:8110`), num caminho com código (`/wa/<TOKEN>`);
- repassa cada mensagem para todos os endereços em `ALVOS`:
  - o Facilita (`/api/whatsapp/webhook?k=<WA_WEBHOOK_SECRET>`);
  - o my-leads-metrics.

As variáveis ficam em `~/.repetidor.env` (`TOKEN`, `FACILITA_K`, `ALVOS`), com `chmod 600`. O `FACILITA_K` é o mesmo valor do `WA_WEBHOOK_SECRET` da Vercel.

Para acompanhar: `journalctl -u jbl-repetidor -f` (só com sudo). Ele só registra os repasses que deram erro. Para diagnosticar quando o WhatsApp para de chegar, ver [docs/vps.md](../../docs/vps.md#quando-o-whatsapp-para-de-chegar).
