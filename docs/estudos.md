# Estudos (Viabilidade Legal e Viabilidade Mercadológica)

O formato de cada estudo, seção por seção, está em [estudos-padrao.md](estudos-padrao.md).

| Nome no sistema | No padrão | Pergunta |
|---|---|---|
| **Viabilidade Legal** | Estudo 1 (raio-x da área) | Dá para lotear, o que dá para fazer e a região tem valor? |
| **Viabilidade Mercadológica** | Estudo 2 (concorrentes, raios de 5 e 20 km) | Quem vende ao redor, como vende, e onde cabe o nosso produto? |

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

Na VPS, cada estudo trabalha em `~/estudos/trabalho/<id>/` e entrega `relatorio.html`, `resultado.json` e `resposta.txt`.

## Como o estudo entra na área

1. **Campos do formulário** (`estudo1` / `estudo2`): semáforo, zona, lote mínimo, % aproveitável, lotes pior/médio/bom, produto, alertas, estratégia; concorrentes, encaixe, veredito. Lidos e validados por `lerEstudo1` / `lerEstudo2` (`captacao-estudos.ts`). Cada campo mudado à mão tem "↩ Voltar ao original".
2. **Estudo completo** (`relatorioCompleto` / `relatorioMercado`): o HTML é convertido em blocos de texto, tabelas e imagens (`relatorio.ts`), e as imagens viram `Asset`. **Abre sempre dentro da área** (aba Estudo), nunca no Claude Artifact.
3. **Link para parceiro** (`/estudo/<token>`): o mesmo estudo com a marca da JBL, sem o nome do dono e do corretor.

- Pela VPS, isso acontece sozinho (`guardarEstudoDaVps`).
- Feito aqui, o estudo entra por um passo de dados em `prisma/seed-areas.ts`, com o HTML em `prisma/dados/relatorios/`. Exemplos: `raioXCompletoSorocaba`, `viabilidadesDentroDaArea`.
- Ou entra pela própria área: aba **Página do estudo** → "Raio-x completo no link" (enviar o HTML do estudo; o de mercado vai em "Estudo de mercado no link").

## Depois do estudo

- **Viabilidade Legal pronta:** resumo no JBL - Central ("Sigo para o mercadológico? 1 Sim · 2 Não").
- **As duas prontas:** o cartão mostra "marcar a reunião", e a apresentação de 9 slides fica pronta (`/app/captacao-slides/[id]`).
- **Checklist in loco:** o checklist oficial da área ([captacao.md](captacao.md)) é preenchido na visita e puxa sozinho o que os estudos já disseram.
