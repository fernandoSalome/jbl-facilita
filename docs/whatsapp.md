# WhatsApp

O WhatsApp conectado é o do **Fernando** (instância "Fernando" na Evolution, na VPS). As mensagens que ele manda chegam ao sistema como "de mim"; por isso **toda mensagem do robô começa com 🤖**, e o robô ignora as próprias.

Caminho de uma mensagem: WhatsApp → Evolution → repetidor (VPS) → `/api/whatsapp/webhook` → `tratarMensagem` em `src/lib/robo.ts`. O lado da VPS está em [vps.md](vps.md).

## Limite de envio

Tudo sai por `enviarTexto` e `enviarArquivo` (`src/lib/whatsapp.ts`), que conferem o limite com trava no banco (`WaEnvio`):

| Para onde / quem manda | Limite |
|---|---|
| **Grupo** (Central, Avisos, Estudos…) | **Sem limite**: sai na hora (pedido 25/11/2026: a conversa no Central precisa de resposta na hora) |
| Número particular: robô, avisos, lembretes | **1 a cada 10 minutos** (pedido 22/11/2026; antes 2 a cada 15) |
| Número particular: pessoa digitando na tela de Conversas (`{ manual: true }`) | 20 a cada 15 minutos |

O limite vale só para número particular, que é onde o WhatsApp pode bloquear (`semLimite` em `limite-whatsapp.ts`). Texto para número particular que passa do limite **espera a vez** na tabela `MensagemEspera` (também entra nela se já houver outra esperando, para manter a ordem). Sai pela `enviarDaEspera`, chamada pela VPS a cada 30 s (`/api/claude/fila`) e pela rotina de 10 minutos. Arquivo (`enviarArquivo`) não espera: passou do limite, dá erro. As digitadas na tela de Conversas também não esperam.

## Grupos

A função de cada grupo fica em `WaGroup.funcao` (tela **Assistente WhatsApp**):

| Grupo | JID | Função |
|---|---|---|
| **JBL - Central** | `120363434430037648@g.us` | Conversa com memória de 90 dias (status, etapas, estudo, proposta, lembretes, reuniões, documentos), KMZ para estudo, "Claude, …", carta de intenção, resumo da manhã, aviso de geladeira. **Todos do grupo podem dar comando** |
| JBL - Avisos | — | Avisos do calendário (antes "monitoring"; o nome importa no código) |
| JBL - Estudos | — | Texto citando a área vai para o checklist dela |
| JBL Teste | `120363434373802289@g.us` | Foi o Central até 20/11/2026; hoje é só monitorado |

## O que o robô faz no Central

Desde 25/11/2026 o Central é uma **conversa**: o robô guarda tudo o que é dito no grupo por **90 dias** (`MensagemCentral`, apagada depois disso) e, para cada pedido, a IA lê a conversa recente e a lista de áreas e diz só **o que** foi pedido (`promptCentral` / `lerPedido` em `central.ts`). Quem decide e executa é o código (`decidir` em `central.ts`, ações em `central-db.ts`). O que muda alguma coisa só acontece depois de **"1 Sim"**. A pergunta em aberto fica em `WaGroup.conversa` (30 minutos; "de quem são os documentos", 24 horas). Vale para mensagens de qualquer pessoa do grupo, **inclusive do próprio número do Fernando** (só as que começam com 🤖 são ignoradas).

| Mensagem | Resposta |
|---|---|
| "como está o terreno do Rogério em Martinópolis?" | Etapa e resumo da área e o menu: 1 Seguir para a próxima etapa · 2 Fazer o estudo · 3 Criar a proposta · 4 Nada. Sem achar a área, pede o nome; com dúvida, lista as possíveis |
| "passa a de Sorocaba para a próxima etapa" / menu `1` | Confirma e muda a etapa (na Proposta, a proposta nasce com os dados dos estudos) |
| "faz o estudo dela" / menu `2` | Confirma e põe na fila da VPS a Viabilidade Legal (ou a Mercadológica, se a Legal já foi feita) |
| "cria a proposta" / menu `3` | Confirma e cria a proposta como rascunho, com o link do editor. Nada vai para o proprietário |
| "me lembra amanhã às 9h de ligar pro Rogério" (", no Avisos") | Lembrete no Central (ou no JBL - Avisos). Sai na hora certa (a VPS confere a cada 30 s) |
| "marca reunião com o Rogério quinta 14h, rogerio@…" | Confirma (data, participantes, local) e cria no calendário, ligada à área, com o convite por e-mail |
| Arquivos (PDF, foto) | A IA lê e guarda; **uma resposta só para o lote** (15 s depois do último). Com dono (legenda, "são do Rogério" ou a área da conversa), vão para **Documentos** da área; sem dono, o robô pergunta de quem são |
| KMZ ou KML | Cria a área (cidade pelo mapa, tamanho, nome da legenda ou do arquivo) e **começa a Viabilidade Legal direto**. Ao terminar, o JBL - Avisos avisa e o resumo sai no Central com "Sigo para a Viabilidade Mercadológica? 1 Sim · 2 Não" |
| `1` depois do resumo da Viabilidade Legal | Põe a Viabilidade Mercadológica na fila |
| "Claude, …" | Pesquisa livre pelo Claude da VPS |
| `enviar link`, `enviar email`, `ver minuta`, `não` | Ações da carta de intenção mais recente |

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
