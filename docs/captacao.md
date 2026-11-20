# Captação de áreas

O módulo foi pedido em 19/11/2026, a partir da maquete do menu JBL. Ele cobre a vida de uma área desde o KMZ até o contrato.

Quando a área chega à etapa de proposta, ela vira um **loteamento** (`Project`). A partir daí, as propostas seguem o fluxo que já existia: as propostas, os templates e a aparência delas não mudaram.

## Fluxo

```
KMZ / conversa ──► 1 Captação ──► 2 Pré-viabilidade ──► 3 Reunião ──► 4 Proposta ──► 5 Estudo 30 dias ──► 6 Contrato
                   (mapa, chat)   (raio-x, Estudo 1)    (calendário)   (vira Project,   (hipóteses a provar)
                                                                        propostas de sempre)
```

No topo da página da área ficam três botões:
- **avançar de etapa**: o texto do botão muda conforme a etapa;
- **❄️ Geladeira**;
- **✖ Descartar**.

## Onde está cada coisa

| Camada | Arquivo | O que faz |
|---|---|---|
| Banco | `prisma/schema.prisma` (`Area`, `AreaConversa`, `WaGroup.funcao`) | dados da área, conversas ligadas, função do grupo |
| Migração | `prisma/migrations/0015_captacao` | tabelas novas com RLS |
| Seed | `prisma/seed-areas.ts` + `prisma/dados/poligonos-estudos.json` | cria uma vez as áreas dos estudos (Sorocaba, Atibaia, São Roque) |
| Regras (puras) | `src/lib/captacao.ts` | etapas, checklist de 30 seções, distribuição do texto, perguntas, professor, validações, limpeza de conversa exportada |
| Regras (puras) | `src/lib/kml.ts` | lê KML e KMZ (zip sem biblioteca), calcula hectares |
| Regras (puras) | `src/lib/grupos.ts` | tipos de grupo de WhatsApp (Avisos, Central, Estudos, Projeto) |
| Banco (serviço) | `src/lib/captacao-db.ts` | listar, acrescentar ao checklist, nutrir por telefone, extrair conversa, criar o loteamento |
| Robô | `src/lib/robo-estudos.ts` | grupo JBL - Estudos: o texto vai para o checklist da área citada |
| Testes | `src/lib/captacao.test.ts` | regras e KML |
| API | `src/app/api/areas/**` | rotas finas: sessão, validação e chamada ao serviço |
| API | `src/app/api/whatsapp/grupos` (`PATCH`) | define a função do grupo |
| Telas | `src/app/app/(empresa)/captacao/**` | funil, nova área, página da área com abas |
| Componentes | `src/components/captacao/*` | card, funil, formulário, mapa, gate, checklist vivo, conversas, documentos, hipóteses |

## Checklist vivo

- **Origem de cada resposta:**
  - 📜 Documento: literal.
  - 📐 Raio-x: medido.
  - 🗣 WhatsApp e reunião: relato, "importante checar".
  - ✍️ Manual.
  - 💭 Estimativa.
- **Como o checklist é alimentado:**
  - pela caixa "Adicionar informação": cada frase vai para a seção certa;
  - pelas respostas digitadas direto numa seção;
  - pelo grupo JBL - Estudos;
  - pelas conversas ligadas com a opção "nutrir";
  - pela opção "Limpar e extrair", que lê o `.txt` exportado do WhatsApp.
- **Perguntar sobre esta área:** busca no checklist e mostra o grau de prova de cada resposta.
- **Professor:** confere os 7 itens que decidem o negócio:
  - matrícula;
  - zona;
  - córregos;
  - preço;
  - água e esgoto;
  - parceria;
  - acesso.

  Um item provado por documento ou pelo raio-x conta inteiro; um relato conta meio. Com isso ele dá a nota, aponta as contradições (por exemplo, o tamanho dito × o KMZ) e diz a quem perguntar, pelo papel da conversa ligada.

## Grupos de WhatsApp

A função de cada grupo é escolhida na tela **Assistente WhatsApp**:

| Função | Comportamento |
|---|---|
| JBL - Avisos | Avisos do calendário. Vale primeiro o grupo marcado; sem marca, vale o nome com "Avisos" ou "monitoring", como antes. |
| JBL - Central | Comandos e documentos, como hoje. |
| JBL - Estudos | Texto citando a área entra no checklist. Na dúvida, o robô pergunta de qual área é. |
| Grupo do projeto | Documentos do loteamento. |

As conversas individuais só são lidas quando o número está ligado a uma área com "nutrir". As outras continuam sendo ignoradas.

## Segunda parte (19/11/2026): o resto da maquete

| Item da maquete | Onde está |
|---|---|
| Menu em grupos (Dia a dia, Negócios, Ferramentas, Empresa) | `src/components/shell/Shell.tsx`, `SideNav.tsx` (`{ grupo }`) |
| Dashboard Dia a Dia | `/app/dia-a-dia`; as regras ficam em `pendencias()` (`src/lib/captacao-estudos.ts`) |
| Agenda | É o calendário de sempre (`/app/calendario`), agora no grupo Dia a dia |
| Conversas | `/app/conversas`; as mensagens ficam em `AreaMensagem` |
| Chat abaixo do KMZ | `ChatArea.tsx`, com envio por `POST /api/areas/[id]/mensagens` |
| 📲 "perguntar a X" do professor | Manda a pergunta pronta (`CHAVES.mensagem`) pela conversa ligada |
| Pré-viabilidade em 3 fases | `PreViabilidade.tsx`; `estudo1` e `estudo2` na área, lidos e validados por `lerEstudo1` e `lerEstudo2` |
| Resumo no JBL - Central | `POST /api/areas/[id]/central` mostra "Sigo para o mercadológico? 1 Sim · 2 Não"; o robô lê a resposta em `tratarCentral` |
| Apresentação (9 slides) | `/app/captacao-slides/[id]`; "Imprimir" salva em PDF, um slide por página |
| Reunião pela área | `ReuniaoArea.tsx` e `POST /api/areas/[id]/reuniao`; vira compromisso do calendário, com e-mail, SMS e aviso no JBL - Avisos, como já funcionava |
| Estudo 30 dias: hipóteses e custos | `HipotesesArea.tsx` e a tabela de custos (`custos`) |
| Abas Custos e Pessoas | Página da área (`custos`, `pessoas`) |
| Estudos | `/app/estudos` |
| Biblioteca de cidades | `/app/cidades`, tabela `Cidade` e `POST`/`DELETE /api/cidades` |
| Etapas clicáveis | `?aba=etapa&ver=<etapa>` mostra a etapa sem mudar a etapa da área |

O seed (`estudosEBiblioteca`) preenche o Estudo 1 das 3 áreas com os números do raio-x e cria a biblioteca com Sorocaba, Atibaia e São Roque.

## Ainda não feito

- **Resumo das 07:30 no grupo Central.** Precisa de cron.
- **Convite da reunião para todos os participantes.** Hoje o e-mail vai só para o primeiro; os outros aparecem na descrição.
- **Gerar o raio-x pelo sistema.** Hoje o link do estudo é colado na área.
- **Ler a conversa direto do WhatsApp para o "Limpar e extrair".** Hoje é pelo `.txt` exportado.
- **Áudio no grupo Estudos.** Precisa de transcrição.
