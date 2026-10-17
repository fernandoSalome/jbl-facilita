# Site da proposta JBL · São Judas Tadeu II

Este projeto é a cópia exata, já pronta, do site de proposta de parceria do Grupo JBL Incorporadora (loteamento São Judas Tadeu II, Martinópolis/SP). **O objetivo é que o site fique IDÊNTICO ao original.** Não é um projeto para "refazer", "melhorar" ou "modernizar": é para publicar e manter.

## Regra número 1: não reescrever

- Use os arquivos como estão. **Não** converta para React, Next, Tailwind, Bootstrap, Vue ou qualquer framework. É HTML + CSS + JS puros, sem build.
- **Não** reorganize, "limpe", reordene, renomeie classes, junte regras duplicadas ou remova regras "repetidas" do `css/style.css`. O CSS foi construído em camadas: regras posteriores sobrescrevem as anteriores de propósito (muitas com `!important`). Mudar a ordem muda o visual.
- **Não** troque fontes. O site usa fontes de sistema: `--display: Georgia, "Times New Roman", Times, serif` (títulos) e `--body: "Helvetica Neue", Helvetica, Arial, sans-serif` (texto). Não adicione Google Fonts.
- **Não** altere textos, números, valores em reais, porcentagens ou datas sem pedido explícito. São dados de uma proposta comercial.
- Quando o usuário pedir uma mudança, altere **somente** o que foi pedido. Para mudanças de estilo, acrescente a regra nova **no final** do `css/style.css` (é assim que o site foi feito), em vez de editar regras antigas espalhadas.

## Estrutura

```
index.html                      página (marcação), carrega css/style.css e os 2 scripts no fim do <body>
css/style.css                   todo o CSS, na ordem original (não reordenar)
js/main.js                      menu mobile, barra de leitura, setas do “caminho”, rótulos das tabelas no celular,
                                simulador de prazos (abas), download do PDF, centralização dos valores por extenso
js/carta-intencao.js            formulário + carta de intenção (prévia ao vivo, protocolo, WhatsApp, copiar, PDF da carta)
assets/img/logo-lockup.webp     logo horizontal (menu do topo)
assets/img/logo-light.webp      logo (capa, carta e rodapé; usado 3 vezes)
assets/img/gleba-aerea.jpg      foto aérea da gleba com a demarcação
proposta-jbl.pdf                PDF da proposta (12 páginas A4), baixado pelos botões “Baixar proposta em PDF”
referencia/site-original-arquivo-unico.html   o site original em um arquivo só (imagens embutidas). É o GABARITO.
tools/comparar.js               confere, por print de tela, se index.html está idêntico ao gabarito
tools/gerar-pdf.js              gera de novo o proposta-jbl.pdf a partir do index.html
tools/fonts/                    fontes usadas só na geração do PDF (Gelasio e Arimo)
```

Dependência externa única: `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` (gera o PDF da carta de intenção no navegador).

## Como rodar

Não há build. Abra o `index.html` no navegador, ou sirva a pasta:

```
npx serve .        # ou: python3 -m http.server 8080
```

Para publicar, envie a pasta inteira para qualquer hospedagem estática (Vercel, Netlify, GitHub Pages, cPanel...). Os caminhos são relativos, então mantenha a estrutura de pastas.

## Como provar que está idêntico

```
npm i -D playwright
npx playwright install chromium
node tools/comparar.js
```

O script tira prints da página inteira em 1440, 1024 e 390 px do `index.html` e do gabarito e compara. Deve imprimir `IDÊNTICO` nas três larguras. Rode isso **depois de qualquer alteração estrutural** (mover arquivos, mudar caminhos, trocar hospedagem). Se o usuário pedir uma mudança visual de propósito, é esperado que dê `DIFERENTE`. Nesse caso, confira os prints em `tools/prints/` e, se estiver certo, atualize o gabarito.

## PDF da proposta

O botão “Baixar proposta completa em PDF” abre o `proposta-jbl.pdf`. O texto ao lado diz “contém **12 páginas**”. Depois de alterar conteúdo:

```
node tools/gerar-pdf.js
```

Ele abre o `index.html` a 1180 px, esconde menu, botões e o formulário da carta de intenção (`#intencao`), desliga as animações, usa as fontes de `tools/fonts` e gera um A4 com rodapé “Página X de Y”. Se o número de páginas mudar, atualize o “12 páginas” no `index.html` (seção “Próximos passos”).

## Identidade visual (para referência ao criar coisas novas)

| Token | Valor | Uso |
|---|---|---|
| `--navy` / `--sky-strong` | `#122A45` | títulos, cabeçalhos, botões escuros |
| `--gold` | `#C1943D` | detalhes, linhas, botões dourados, ícones sociais |
| `--gold-deep` | `#A2782F` | dourado para texto sobre branco |
| `--gold-ink` | `#8F6B28` | dourado mais escuro |
| `--gold-soft` | `#F7F2E7` | fundo creme dos cartões dourados |
| `--gold-line` | `#ECE1C4` | bordas douradas claras |
| `--fg` | `#2B3A4A` | texto |
| `--muted` | `#697683` | texto secundário |
| `--line` | `#DDE3E9` | bordas |
| `--surface` / `--alt` | `#F5F7FA` / `#F8F9FB` | fundos de cartões e faixas |

- Cabeçalho das tabelas: fundo marinho, texto `#F6CB63`, borda inferior dourada. Linhas alternadas `#EDF1F6` só no computador.
- Valores de destaque pulsam com a animação `vpulse` (escala 1.045 + brilho dourado). A animação é desligada no PDF e com `prefers-reduced-motion`.
- Pontos de quebra: até 760 px (celular), 761–1199 px (fontes escaladas), 900/901 px (margens laterais de 80vw no computador), ≥1200 px (tabelas sem quebra de linha).

## Mapa da página (ordem)

Menu fixo → Capa (`#topo`) → Carta à família (`#carta`) → O grupo / 7 empresas / Missão → Como a JBL trabalha → seções numeradas 1 a 12 (terreno, obras, custos, caminho, VGV, primeira etapa, divisão `#participacao`, recebimentos `#recebimentos` com simulador, antecipação, previsão de vendas, regras, Aviso legal `#aviso-legal`) → Próximos passos (`footer.end`) → Carta de intenção (`#intencao`) → Rodapé escuro (`footer.dark-foot`).

## Comportamentos que dependem do ambiente

- O site nasceu como “artifact” do Claude. Lá existia `window.claude.use("downloads")` para salvar arquivos. Em hospedagem comum isso não existe, e o código já trata os dois casos:
  - PDF da proposta: sem `window.claude`, o botão funciona como link normal para `proposta-jbl.pdf`.
  - PDF da carta de intenção: sem `window.claude`, usa `doc.save()` do jsPDF (download normal do navegador). **Esta é a única diferença de código em relação ao original.**
- O formulário da carta **não envia dados para servidor nenhum**. “Enviar” valida os campos e gera um protocolo local. A carta segue para a JBL pelo WhatsApp (11) 94009-1744, pelo PDF baixado ou pelo texto copiado (e-mail contato@jblincorporadora.com.br). Se o usuário quiser receber os envios automaticamente, isso é uma funcionalidade nova (backend, formulário de e-mail, etc.), e deve ser combinada com ele antes.

## Conteúdo sensível

A proposta é confidencial (ver “Aviso legal”). Não publique em lugar indexável sem o usuário pedir. Considere `<meta name="robots" content="noindex">` se for hospedar publicamente.
