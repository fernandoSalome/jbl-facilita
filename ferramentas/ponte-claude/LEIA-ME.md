# Ponte WhatsApp → Claude Code (VPS)

Pelo grupo **JBL - Claude**, o Fernando e o Marcelo pedem pesquisas. Um pedido percorre este caminho:

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
| Registro | `journalctl -u jbl-ponte -f` |
| Login do Claude | uma vez: `claude` e depois `/login`, com a assinatura |

## Na Vercel

- `CLAUDE_PONTE_SECRET`: a mesma senha do `~/.ponte.env`.
- `CLAUDE_AUTORIZADOS`: o número do Marcelo, com DDD. As mensagens do próprio WhatsApp conectado já valem.

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
