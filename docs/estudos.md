# Estudos (Viabilidade Legal e Viabilidade Mercadológica)

O formato de cada estudo, seção por seção, está em [estudos-padrao.md](estudos-padrao.md).

| Nome no sistema | No padrão | Pergunta |
|---|---|---|
| **Viabilidade Legal** | Estudo 1 (raio-x da área) | Dá para lotear, o que dá para fazer e a região tem valor? |
| **Viabilidade Mercadológica** | Estudo 2 (concorrentes, raios de 5 e 20 km) | Quem vende ao redor, como vende, e onde cabe o nosso produto? |

## Pedir pela tela

Na etapa Pré-viabilidade, **"🧠 Fazer a Viabilidade Legal"** e **"Sim, fazer a Viabilidade Mercadológica"** põem o estudo na fila da VPS (`/api/areas/[id]/estudo-vps`), como o KMZ no Central (pedido 22/11/2026):

1. Enquanto roda, o bloco do estudo fica desativado com "Realizando a …" e o % (`EstudoEmAndamento.tsx`). O % vem do `andamento.txt` que o Claude grava na VPS (fases em `~/estudos/CLAUDE.md`); sem ele, é estimado pelo tempo. A tela se atualiza a cada 15 s.
1. **Parar estudo** (botão no quadro ou _para o estudo de X_ no Central/Claude): o bloco destrava na hora e o status vira `parado`. A VPS mata o Claude no próximo aviso de andamento (até 30 s), grava `parado.txt` na pasta e o robô confirma no grupo do pedido. Por 5 dias dá para retomar (botão na faixa ou _retoma o estudo de X_): volta para a fila e o Claude continua da pasta guardada. Depois de 5 dias o Facilita marca `descartado` e a VPS apaga a pasta. Pedir um estudo novo do mesmo tipo descarta o parado.
2. Quando a VPS pega o pedido: **JBL - Avisos** recebe "Comecei a análise da gleba X. Aviso quando estiver pronta."
3. Quando termina: o resumo (8 a 12 linhas, `resposta.txt`) vai para o **JBL - Central**, com "Sigo para a Viabilidade Mercadológica?" na Legal; o **JBL - Avisos** recebe "pronta, o resumo está no Central".

Vale também para o estudo pedido pelo WhatsApp (KMZ no Central, "1 Sim").

## Quem faz

Os estudos são feitos **pela assinatura do Claude, não pela API paga**:
- **pela VPS**, quando o pedido vem do WhatsApp (KMZ no Central e "1 Sim"); ver [vps.md](vps.md);
- **aqui no Claude Code**, quando o Fernando pede direto.

## Regras

- Só lei publicada e o mapa oficial vigente (geoportal). Plano Diretor e zoneamento conferidos um contra o outro.
- Busca completa antes de dizer "não encontrado". Não chutar abaixo de 80% de certeza.
- Cada item com o grau de certeza (alta, média, baixa) e como foi conferido.
- É triagem: a certidão de uso do solo vem antes de assinar qualquer coisa.
- Preço de anúncio é **preço pedido**; venda fechada se confirma com corretor.

## Onde ficam os arquivos

Na máquina do Fernando, em `~/JBL-estudos/<Cidade-UF>/` (descrito em `~/JBL-estudos/LEIA-ME.md`):

```
Cidade-UF/
  1-legislacao/                 leis e páginas de onde vieram (reaproveitadas para outro terreno na cidade)
  2-mapas-oficiais/             mapas, KMZ e camadas da prefeitura
  3-mapas-georreferenciados/    mapas da lei encaixados nas coordenadas
  terrenos/<Nome-Area>/
    1-poligono/  2-dados/  3-imagens-relatorio/  4-relatorio/  5-scripts/  6-conferencias/
```

Na VPS, cada estudo trabalha em `~/estudos/trabalho/<id>/` e entrega `relatorio.html`, `resultado.json` e `resposta.txt`. Desde 26/11/2026 também deixa `fontes.json` (tudo o que consultou, com link) e `documentos/` (lei, mapa oficial, certidões; até 8 arquivos de 3 MB). Os documentos vão para a aba **Documentos** da área como "Fonte do estudo: …" (`/api/claude/documento`, conferidos por `estudo-fontes.ts`); a pasta fica na VPS para o chat do estudo consultar.

## Como o estudo entra na área

O `resultado.json` também traz `"checklist"`: as respostas do checklist oficial que o estudo encontrou (`~/estudos/referencia/checklist-oficial.json`, gerado de `SECOES`). Entram no checklist da área com a origem Raio-x (`respostasDoEstudo`, `checklist-salvar.ts`). Mudou `SECOES`? Gere o arquivo de novo e suba para a VPS.


1. **Campos do formulário** (`estudo1` / `estudo2`): semáforo, zona, lote mínimo, % aproveitável, lotes pior/médio/bom, produto, alertas, estratégia; concorrentes, encaixe, veredito. Lidos e validados por `lerEstudo1` / `lerEstudo2` (`captacao-estudos.ts`). Cada campo mudado à mão tem "↩ Voltar ao original".
2. **Estudo completo** (`relatorioCompleto` / `relatorioMercado`): o HTML é convertido em blocos de texto, tabelas e imagens (`relatorio.ts`), e as imagens viram `Asset`. **Abre sempre dentro da área** (aba Estudo), nunca no Claude Artifact.
3. **Link para parceiro** (`/estudo/<token>`): o mesmo estudo com a marca da JBL, sem o nome do dono e do corretor.

- Pela VPS, isso acontece sozinho (`guardarEstudoDaVps`).
- Feito aqui, o estudo entra por um passo de dados em `prisma/seed-areas.ts`, com o HTML em `prisma/dados/relatorios/`. Exemplos: `raioXCompletoSorocaba`, `viabilidadesDentroDaArea`.
- Ou entra pela própria área: aba **Página do estudo** → "Raio-x completo no link" (enviar o HTML do estudo; o de mercado vai em "Estudo de mercado no link").

Os dois de uma vez (28/11/2026, área que ganhou o KMZ depois da proposta): a Legal entra na fila e a Mercadológica fica `aguarda`; quando a Legal termina, `liberarMercado` põe a Mercadológica na fila sem perguntar no Central (se a Legal falhar, ela é cancelada).

## Chat do estudo

Pedido 27/11/2026. Na aba Estudo, ao lado de "Voltar ao estudo", o botão **💬 Conversar com o estudo** abre um chat lateral, um para cada estudo (Legal e Mercadológica), guardado na área (`EstudoMensagem`) e visto por toda a equipe.

| Passo | O que acontece |
|---|---|
| Pergunta | Vai para a fila do Claude da VPS (tipo `chat`, vagas rápidas). A ponte grava em `~/estudos/chat/<área>-<estudo>/` o estudo (`relatorio.json`), os campos (`estudo.json`), a área e a conversa (`conversa.md`), e aponta a pasta do estudo original (fontes e documentos). O Claude responde sem mexer no estudo e diz o que mudaria (`proposta.txt`) |
| "Incluir o que conversamos na pesquisa?" | Aparece depois de **toda** resposta. **Não**: fica só na conversa. **Sim, incluir**: o Claude devolve o estudo inteiro mudado, que o Facilita valida (`relatorioDoChat`, `estudoDoChat` em `estudo-chat.ts`: só os blocos do formato, HTML limpo, sem imagem nova, andamento e "voltar ao original" mantidos) e grava. A página recarrega com o estudo novo |

Uma mensagem por vez em cada chat. A resposta leva de 20 s a 1 min (o Claude da assinatura abre a cada pergunta); a tela confere a cada 4 s.

## Depois do estudo

- **Viabilidade Legal pronta:** resumo no JBL - Central ("Sigo para o mercadológico? 1 Sim · 2 Não").
- **As duas prontas:** o cartão mostra "marcar a reunião", e a apresentação de 9 slides fica pronta (`/app/captacao-slides/[id]`).
- **Checklist in loco:** o checklist oficial da área ([captacao.md](captacao.md)) é preenchido na visita e puxa sozinho o que os estudos já disseram.
