# WhatsApp

O WhatsApp conectado é o do **Fernando** (instância "Fernando" na Evolution, na VPS). As mensagens que ele manda chegam ao sistema como "de mim"; por isso **toda mensagem do robô começa com 🤖**, e o robô ignora as próprias.

Caminho de uma mensagem: WhatsApp → Evolution → repetidor (VPS) → `/api/whatsapp/webhook` → `tratarMensagem` em `src/lib/robo.ts`. O lado da VPS está em [vps.md](vps.md).

## Limite de envio

Tudo sai por `enviarTexto` e `enviarArquivo` (`src/lib/whatsapp.ts`), que conferem o limite com trava no banco (`WaEnvio`):

| Quem manda | Limite |
|---|---|
| Robô, avisos, lembretes, resumos | **2 a cada 15 minutos** (pedido do Fernando) |
| Pessoa digitando na tela de Conversas (`{ manual: true }`) | 20 a cada 15 minutos |

Passou do limite, a mensagem não sai e quem chamou recebe o erro. As rotinas tentam de novo na rodada seguinte.

## Grupos

A função de cada grupo fica em `WaGroup.funcao` (tela **Assistente WhatsApp**):

| Grupo | JID | Função |
|---|---|---|
| **JBL - Central** | `120363434430037648@g.us` | Comandos, KMZ para estudo, "1 Sim · 2 Não", "Claude, …", carta de intenção, resumo da manhã, aviso de geladeira. **Todos do grupo podem dar comando** |
| JBL - Avisos | — | Avisos do calendário (antes "monitoring"; o nome importa no código) |
| JBL - Estudos | — | Texto citando a área vai para o checklist dela |
| JBL Teste | `120363434373802289@g.us` | Foi o Central até 20/11/2026; hoje é só monitorado |

## O que o robô faz no Central

| Mensagem | Resposta |
|---|---|
| KMZ ou KML | Cria a área, diz cidade e tamanho e pergunta "Faço a pré-pesquisa? 1 Sim · 2 Não". Com "estude essa área" na legenda, já começa |
| `1`, `sim`, "estude essa área", "crie uma nova área para estudar" (até 80 letras, com KMZ esperando) | Põe a Viabilidade Legal na fila da VPS |
| `1` depois do resumo da Viabilidade Legal | Põe a Viabilidade Mercadológica na fila |
| "Claude, …" | Pesquisa livre pelo Claude da VPS |
| "como ficou a viabilidade de Sorocaba?" | Resumo da área |
| "me lembra amanhã às 9h de …" | Lembrete |
| `enviar link`, `enviar email`, `ver minuta`, `não` | Ações da carta de intenção mais recente |

Os comandos sobre propostas e loteamentos (valor do lote, documentos, minuta) continuam em `robo-propostas.ts` e `robo.ts`.

## Conversas particulares

- **KMZ recebido no particular** (de outra pessoa): guardado em silêncio com quem mandou (`KmzRecebido`). Encaminhado depois no Central, a área nasce com esse contato e toda a conversa.
- **Contatos de terra:** toda conversa particular é guardada (`MensagemParticular`) até o Claude da VPS ler (10 minutos depois que ela para). Ele separa pelo contexto:
  - **terra** (terrenista ou corretor): aparece em Conversas com um resumo;
  - **fora**: a conversa guardada é apagada e o contato não é mais guardado;
  - **sem decisão** (conversa curta): espera mais mensagens.
- **Áudios:** guardados como "🎤 áudio (transcrevendo…)" e transcritos na VPS. A conversa só é lida depois dos áudios.
- **Leitura automática:** a VPS lê tudo dos últimos 45 dias uma vez e depois, a cada 20 minutos, o que mudou (até 80 mensagens por conversa).
- **Conversa com id interno (@lid):** o número vem junto na mensagem (`remoteJidAlt`); sem número, a conversa fica de fora.

Tela: `/app/conversas` (lista à esquerda, conversa à direita, responder, ligar à área, "não é de terra").
Código: `contatos-terra.ts` (regras e pedido ao Claude), `contatos-terra-db.ts` (banco), `src/components/conversas/Inbox.tsx`.

## Rotinas

`/api/cron/whatsapp-agenda` (GitHub Actions a cada 10 minutos, irregular) manda lembretes, resumo da manhã, respostas pendentes do Claude e avisos de geladeira. A leitura das conversas e o aviso de geladeira também rodam a cada consulta da VPS, que é mais confiável.
