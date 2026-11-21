# VPS (Hostinger)

Servidor da Hostinger (Ubuntu 24.04; o IP está no painel da Hostinger, fora do repositório, que é público), usuário **`jbl`** (sem sudo e sem acesso ao Docker). Roda o que não cabe na Vercel: o WhatsApp, o Claude Code com a assinatura e a transcrição de áudio. O detalhe da ponte está em [ferramentas/ponte-claude/LEIA-ME.md](../ferramentas/ponte-claude/LEIA-ME.md).

## O que roda lá

| Serviço | Programa | O que faz |
|---|---|---|
| Evolution API (Docker, de outra conta) | — | O WhatsApp. A instância **"Fernando"** é a do Facilita. Outras instâncias (`alisson`, `Rocha`…) são de outros sistemas: não mexer |
| `jbl-repetidor` | `~/ponte/repetidor.mjs` | Recebe o webhook da Evolution em `172.17.0.1:8110` e repassa para o Facilita e o my-leads |
| `jbl-ponte` | `~/ponte/ponte.mjs` | Três filas em paralelo, descritas abaixo |

### As filas da ponte

| Fila | A cada | Rota no Facilita | O que faz |
|---|---|---|---|
| Pedidos ao Claude | 30 s | `/api/claude/fila` | Pesquisa, Viabilidade Legal, Viabilidade Mercadológica e leitura das conversas (`classificar`), com `claude -p` |
| Áudios | 30 s | `/api/claude/audio` | Baixa o áudio e transcreve com o Whisper local (`~/ponte/transcrever.py`, modelo `small`, CPU) |
| Conversas | 20 min | `/api/claude/conversas` | Lê as conversas particulares do WhatsApp (45 dias na primeira vez; depois, só o que mudou desde `~/ponte/ultima-leitura.txt`) |

Todas as rotas conferem a senha `CLAUDE_PONTE_SECRET` (`~/.ponte.env` e Vercel).

## Pastas

| Pasta | O que tem |
|---|---|
| `~/ponte/` | `ponte.mjs`, `repetidor.mjs`, `transcrever.py`, `ultima-leitura.txt` |
| `~/estudos/` | `CLAUDE.md` (instruções dos estudos), `referencia/` (padrão, regras, fontes, scripts, exemplos), `trabalho/<id>/` (cada estudo), `.venv` (Python com faster-whisper) |
| `~/pesquisas/` | Pasta de trabalho das pesquisas e dos áudios temporários |
| `~/.ponte.env`, `~/.repetidor.env` | Segredos (`chmod 600`). Nunca imprimir |

A pasta `base/` (material do professor) **não vai** para a VPS.

## Atualizar um programa

O código fonte fica no repositório em `ferramentas/ponte-claude/`. Depois de mudar:

```bash
scp ferramentas/ponte-claude/ponte.mjs jbl@<IP da VPS>:ponte/novo-ponte.mjs
ssh jbl@<IP da VPS> 'cd ~/ponte && ~/.local/node/bin/node --check novo-ponte.mjs && mv novo-ponte.mjs ponte.mjs'
ssh jbl@<IP da VPS> 'pkill -u jbl -f ponte/ponte.mjs'   # o systemd sobe de novo em 5 s
```

- O arquivo novo precisa terminar em `.mjs` (o `node --check` recusa outra extensão).
- O Node fica em `~/.local/node/bin/node` (não está no PATH de um `ssh` simples).
- `journalctl` não mostra nada para o usuário `jbl`. Para ver o que acontece, rode o programa na mão por alguns segundos ou grave num arquivo de registro temporário.

## Quando o WhatsApp para de chegar

Sintoma: o robô não responde e a tela de Conversas não atualiza. Conferir nesta ordem:

1. **O Facilita recebe?** `npx vercel logs requests --since 2h --query 'requestPath:/api/whatsapp/webhook'`. Normal: dezenas por hora.
2. **O repetidor recebe?** Ligar um registro temporário no `repetidor.mjs` (só o tipo do pedido, nunca o conteúdo) e olhar por 1 minuto.
3. **A Evolution recebe?** Com a chave que está no `.env` de outro sistema da VPS (sem imprimir), consultar `instance/connectionState/Fernando`, `webhook/find/Fernando` e as últimas mensagens de um grupo (`chat/findMessages/Fernando`).
4. **Sessão travada** (diz `open`, mas não guarda mensagem nova): reiniciar a instância "Fernando" (`instance/restart`) ou reconectar o aparelho pelo celular (Aparelhos conectados). **Pedir autorização ao Fernando antes**: derruba o WhatsApp por alguns segundos.
