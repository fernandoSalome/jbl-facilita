# Áreas (Captação)

No menu, **Áreas** (endereço `/app/captacao`). Cada cartão do funil é uma **área**: um terreno com KMZ, dono ou corretor. O mesmo dono pode ter várias áreas. O botão **+ Novo estudo** cria uma área.

## Funil

```
1 Captação ─► 2 Pré-viabilidade ─► 3 Reunião ─► 4 Proposta ─► 5 Estudo 30 dias ─► 6 Contrato
  KMZ, chat      Viab. Legal e        agenda      proposta e       hipóteses a        contrato
                 Mercadológica                    carta de         provar             da SPE
                                                  intenção
                                                                   ❄️ Geladeira   ✖ Descartadas  (colunas no fim)
```

- As etapas estão em `ETAPAS` (`src/lib/captacao.ts`). O botão dourado no topo da área avança; o texto dele muda por etapa (`ACAO_DA_ETAPA`).
- Clicar numa etapa no menu da área (`?aba=etapa&ver=<etapa>`) mostra o conteúdo dela sem mudar a etapa.
- O cartão mostra a situação e o próximo passo (`cartao()` em `captacao-estudos.ts`).

## Projeto de Loteamento só depois da SPE

Quando a área chega na Proposta, o sistema cria um `Project` por trás, só para guardar as propostas. Ele **não aparece** no seletor do menu nem tem página própria até o contrato da SPE ser assinado (`speAssinadaEm`). Antes disso, qualquer link para `/app/projetos/[id]` leva para a área, na etapa Proposta (`src/app/app/projetos/[projectId]/layout.tsx`).

## Etapa a etapa

| Etapa | O que acontece | Onde |
|---|---|---|
| Captação | KMZ no mapa (com Street View), chat com as conversas ligadas | `MapaInterativo.tsx`, `ChatArea.tsx` |
| Pré-viabilidade | Viabilidade Legal, resumo no Central (1 Sim · 2 Não), Viabilidade Mercadológica, apresentação | `PreViabilidade.tsx`; ver [estudos.md](estudos.md) |
| Reunião | Marca no calendário, com convite e avisos | `ReuniaoArea.tsx` |
| Proposta | Em cima, a proposta (nasce com os dados dos estudos). Embaixo, a carta de intenção | `BotaoProposta.tsx`, `CartaDaProposta.tsx` |
| Estudo 30 dias | Hipóteses a provar e custos | `HipotesesArea.tsx` |
| Contrato | Contrato da SPE; ao assinar, vira Projeto de Loteamento | `BotaoSpe.tsx` |

### Carta de intenção (dentro da Proposta)

1. Antes de chegar: o bloco de baixo mostra **"Aguardando o recebimento"**.
2. O proprietário preenche e envia a proposta: o bloco de cima fica apagado ("Proposta respondida") e o de baixo mostra os dados recebidos.
3. O **JBL - Central** recebe uma mensagem só: o PDF da minuta com os dados na legenda e "Posso enviar para assinatura?" (`enviar link`, `enviar email` ou `não`).
4. **Nada vai sozinho para o assinador.** A equipe revisa no **editor de contrato** (`/app/minuta/[id]`) e confirma o envio na tela ou no grupo.
5. O bloco mostra quem abriu, assinou ou recusou (confere a Autentique a cada 30 s). Assinada por todos, a área vai sozinha para o **Estudo 30 dias**.

Código: `src/lib/captacao-assinatura.ts`, `src/app/api/public/[token]/carta/route.ts`, `sincronizarAssinaturas` em `minuta-acoes.ts`. Propostas fora da Captação seguem o fluxo antigo (ver [propostas.md](propostas.md)).

Ao concluir uma etapa no botão do topo (`Gate.tsx`), a tela mostra "Etapa concluída → abrindo …" e abre a próxima sozinha (pedido 22/11/2026).

## Geladeira e descarte

- **Descartar** pede o motivo. A área vai para a coluna ✖ Descartadas.
- **Geladeira** pede o tempo (1, 3, 6, 9 meses ou 1 ano) e o motivo. O cartão mostra "volta em …"; **5 dias antes** o robô avisa no Central (`avisosGeladeira`). A área não volta sozinha: alguém usa "Reativar área".
- Ao abrir a área, o motivo aparece no topo (`MotivoSituacao.tsx`). Depois de reativada, o motivo antigo continua visível, pequeno.
- Campos: `motivoDescarte`, `descartadaEm`, `motivoGeladeira`, `geladeiraEm`, `geladeiraAte`, `geladeiraAvisoEm`.

## Checklist oficial

Na aba Checklist, a tela segue o modelo do Word (pedido 23/11/2026): uma seção por vez, faixa com o progresso, quadros com ícone e o campo certo para cada item (Sim/Não, R$, %, lista, texto). O formato de cada item está em `src/lib/checklist-formato.ts`; o teste confere que os 265 itens de `SECOES` estão lá, uma vez cada. "Salvar e Continuar" grava a seção (`PUT /api/areas/[id]/checklist`, `checklist-salvar.ts`) e abre a próxima. Mudou uma pergunta em `SECOES`? Mude também o formato.

`SECOES` em `src/lib/captacao.ts` é o **checklist oficial JBL de viabilidade in loco** (`base/material/JBL_CHECKLIST _OFICIAL_ESTUDO DE VIABILIDADE IN_LOCO (1).docx`), conferido item a item em 20/11/2026: **30 seções e 265 itens**, na mesma ordem do documento. Se o documento mudar, mude `SECOES` junto.

- Os **números das seções não mudam** (as respostas gravadas usam o índice). Item novo vai no fim da seção.
- Nomes de item já usados por respostas gravadas ou pelo código (`Zona`, `Lote mínimo`, `Matrícula`, `Córregos e nascentes`, `Produto sugerido`…) não devem ser trocados.
- **Origem de cada resposta:** 📜 documento, 📐 raio-x, 🗣 WhatsApp ou reunião ("importante checar"), ✍️ manual, 💭 estimativa.
- **Como é alimentado:** a caixa "Adicionar informação" (cada frase vai para a seção certa); o campo de cada seção; o grupo JBL - Estudos; as conversas ligadas com "nutrir"; os dados dos passos (⚡ automático, `respostasDosPassos`).
- Cada ponto escrito tem ✏️ editar e 🗑 apagar.

## Onde está cada coisa

| Camada | Arquivo |
|---|---|
| Banco | `Area`, `AreaConversa`, `AreaMensagem`, `KmzRecebido`, `Cidade` em `prisma/schema.prisma` |
| Regras puras | `captacao.ts`, `captacao-estudos.ts`, `captacao-proposta.ts`, `kml.ts`, `poligono.ts`, `relatorio.ts` |
| Serviço | `captacao-db.ts`, `captacao-assinatura.ts`, `relatorio-db.ts` |
| API | `src/app/api/areas/**` |
| Telas | `src/app/app/(empresa)/captacao/**`, `src/app/app/(area)/captacao/[id]/**` |
| Componentes | `src/components/captacao/*` |
| Dados iniciais | `prisma/seed-areas.ts`, `prisma/dados/` |
