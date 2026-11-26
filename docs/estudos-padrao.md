# Padrão dos estudos JBL (pré-viabilidade)

> Cópia de `~/JBL-estudos/PADRAO-ESTUDO.md` (20/11/2026). A VPS usa a mesma cópia em `~/estudos/referencia/`. Mudou o padrão? Mude os três juntos. Nos nomes do sistema, o **Estudo 1** é a **Viabilidade Legal** e o **Estudo 2** é a **Viabilidade Mercadológica**; o Estudo 2 olha os raios de **5 e 20 km**.

Este padrão vale para toda área nova. A base é o formato dos raio-x do Grok (Americana, Itapagipe, São Mateus do Sul e Atibaia), com os acréscimos pedidos em 19/11/2026.

**Ordem dos estudos**
1. **Estudo 1, viabilidade da área.** Roda quando o KMZ recebe "play".
2. **Estudo 2, mercadológico de concorrentes.** Só roda se o Estudo 1 passar e se houver o "sim" no grupo JBL · Central.
3. **Apresentação da reunião.** É gerada no fim do Estudo 2.

As regras do raio-x também valem aqui:
- usar só lei publicada e o mapa oficial vigente;
- fazer a busca exaustiva antes de dizer "não encontrado";
- mostrar o grau de certeza de cada item;
- tratar o estudo como triagem, porque a certidão vem antes de assinar.

---

## Estudo 1: viabilidade da área

Pergunta: **dá para lotear, o que dá para fazer, e a região tem valor?**

Ordem de execução: do mais barato e decisivo para o mais caro. Se um eliminatório der 🔴, o estudo para e avisa, para não gastar à toa.

### Seções (na ordem do Grok, com os acréscimos marcados com ★)

1. **Resumo e parecer**
   - Semáforo: 🟢 viável · 🟡 viável com condição · 🔴 não segue.
   - Área do KML, % aproveitável e lotes (pior / médio / bom).
   - O que pode travar.
   - Parecer em uma frase.
2. **Localização e geometria**
   - Arquivo, área, perímetro, centro, lados principais, bairro e largura.
3. **Vias, testada e entorno**
   - Entradas, frentes, tipo de via (asfalto ou terra) e a vizinhança imediata.
4. **Zona: o que o mapa oficial diz**
   - Método usado (KMZ oficial ou mapa georreferenciado) e a zona com a % da área em cada uma.
   - Ordem do método: 1) zoneamento em dados (KMZ, shapefile, geoportal) cruzado com o polígono; 2) só imagem ou PDF: encaixar o mapa na posição da gleba, tirar a cor de cada quadradinho da legenda e contar, ponto a ponto dentro do polígono, a zona de cada cor (linhas, textos e bordas borradas ficam de fora; muita parte sem identificar = baixa certeza). Imagem da gleba pintada por zona.
   - **Gleba em mais de uma zona** (pedido 26/11/2026, Lages: ZREU-1, EDD-2 e AEAA): listar todas as zonas que passam na gleba, com a %. A JBL pode escolher qualquer uma delas para a gleba inteira, então o estudo leva as zonas todas adiante (seções 6, 7 e 11) e diz qual rende mais. No formulário, `zona` sai como "ZREU-1 · EDD-2 · AEAA (escolher)".
5. **Leis vigentes e o que está em tramitação**
   - Leis com número e data, alterações, ADI e projetos de lei.
6. **Parâmetros da zona**
   - Lote mínimo, testada, TO, CA, permeabilidade, gabarito e usos.
   - Com mais de uma zona na gleba: os parâmetros de cada uma, lado a lado.
7. ★ **O que pode fazer (tipologia e tamanho)**
   - Usos permitidos e tipologias possíveis: loteamento aberto, condomínio de lotes, chacreamento, desmembramento da frente.
   - Tamanhos de lote permitidos e o tamanho sugerido.
   - **Produto sugerido.**
8. **Regras de parcelamento**
   - Áreas públicas (verde, lazer, institucional), sistema viário e quadra máxima.
9. **Meio ambiente**
   - APP, nascentes, mata (estimativa e estágio provável), várzea, unidade de conservação e manancial, reserva legal.
10. **Meio físico**
    - Declividade, risco (CPRM), contaminação, mineração (ANM), linhas de energia, dutos, rodovia e ferrovia.
11. **Cenários**
    - Frente primeiro e depois o interno.
    - Premissas.
    - Lotes nos cenários pior, médio e bom, com o quadro de áreas.
12. ★ **Região**
    - **Valor do m² vendido:** de 5 a 10 lotes anunciados num raio de até 5 km, com mínimo, mediana e máximo.
    - **Tipologia predominante em volta:** aberto, condomínio ou chácara, e o tamanho dos lotes.
    - **Expansão urbana:** se a área está no vetor de crescimento (Plano Diretor, loteamentos novos aprovados e em tramitação, obras previstas). Classificar como no vetor, neutra ou fora.
    - **Cidades em volta (30 a 50 km):** população, crescimento e distância de cada uma.
    - VGV estimado em faixa: lotes do cenário médio × valor do m².
13. **Lei federal em resumo**
    - Lei 6.766/79, Código Florestal, Lei 11.428/06 e o que mais se aplicar.
14. **Problemas, riscos e parecer final**
    - Prós e contras.
    - Os 5 alertas principais, cada um com "como resolver".
    - Próximos passos: matrícula, topografia, diretrizes, meio ambiente, concessionárias, GRAPROHAB.
15. **Grau de certeza**
    - Cada item marcado como alta, média ou baixa, com o modo como foi verificado.
16. **Imagens, resumo para o grupo e o que não foi verificado**
17. **Fontes**

### Imagens padrão

1. Localização
2. Polígono sobre a foto de satélite
3. Zoneamento oficial com o polígono
4. APP e hidrografia (com mata e nascentes)
5. CPRM (suscetibilidade)
6. Declividade
7. Desmembramento da frente
8. Três cenários lado a lado
9. Layout do cenário médio
10. ★ Mapa da região: cidades em volta e vetor de expansão

### Resumo para o grupo JBL · Central

- Cidade · proprietário · semáforo.
- Zona, lote mínimo, % aproveitável e lotes do cenário médio. Com mais de uma zona na gleba: cada zona com o lote mínimo e os lotes do cenário médio, e qual rende mais.
- Produto sugerido, valor do m² e expansão.
- Principal alerta.
- Fechar com: "Sigo para o mercadológico? 1 Sim · 2 Não".

---

## Estudo 2: mercadológico de concorrentes

Pergunta: **quem vende ao redor, como vende, e onde cabe o nosso produto?**

Não é estudo aprofundado: é uma prévia para ver se há encaixe entre produto e mercado.

1. **Mapa da concorrência**
   - Raio de 5 a 10 km: loteamentos e condomínios lançados, em obra, prontos e em tramitação.
2. **Ficha de cada concorrente**
   - Loteadora, tipo, tamanho do lote.
   - Preço de lançamento, preço de hoje e condição de pagamento (entrada, parcelas, juros).
   - % vendido e estoque.
   - Infraestrutura e lazer.
   - Ocupação (casas construídas, vistas na foto de satélite).
3. **Revenda dentro de cada concorrente**
   - Quantidade de lotes, preço de revenda × lançamento, tempo anunciado.
4. **Ranking:** quem vende mais rápido e por quê.
5. **Lacunas:** o que ninguém oferece (tamanho, faixa de preço, tipo, condição de pagamento).
6. **Posicionamento do nosso produto** frente aos 3 principais concorrentes: preço, lote e diferencial.
7. **Veredito:** 🔥 encaixa · 🌫 encaixa com ajuste · ❄️ não encaixa. Incluir o principal risco de mercado.

Fontes: sites e Instagram das loteadoras, portais (Viva Real, OLX, Imovelweb), notícias, camada de loteamentos da prefeitura e mapa do Plano Diretor.

**Fica fora desta fase:** a prévia financeira detalhada (custo por lote, margem, parte do terrenista). Ela vai para o estudo de 30 dias.

---

## Apresentação da reunião

Gerada ao fim do Estudo 2, no modelo padrão da JBL:

1. Capa
2. Quem somos
3. Como funciona a parceria
4. A sua área
5. O que dá para fazer
6. O mercado da região
7. O nosso produto
8. Quanto pode render
9. Próximos passos
