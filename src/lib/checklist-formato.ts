/**
 * Formato do checklist na tela (pedido 23/11/2026, no modelo da foto do Fernando): cada seção dividida em quadros
 * com ícone, e cada item com o campo certo (Sim/Não, R$, %, texto, lista). Os textos das perguntas são os mesmos
 * de SECOES (captacao.ts); o teste confere que nenhum item ficou de fora nem apareceu duas vezes.
 */

/** sn: Sim/Não · sna: + Em análise · snp: + Parcial · doc: Possui/Não possui/Solicitado · ap: Aprovado/Reprovado ·
 *  rs: valor em R$ · pct: % · num: número · txt: texto curto · long: texto longo · sel: lista */
export type TipoCampo = "sn" | "sna" | "snp" | "doc" | "ap" | "rs" | "pct" | "num" | "txt" | "long" | "sel";
export type Item = { p: string; tipo: TipoCampo; ph?: string; opcoes?: string[] };
export type Quadro = { titulo: string; icone: string; itens: Item[] };

export const OPCOES: Partial<Record<TipoCampo, string[]>> = {
  sn: ["Sim", "Não"],
  sna: ["Sim", "Não", "Em análise"],
  snp: ["Sim", "Não", "Parcial"],
  doc: ["Possui", "Não possui", "Solicitado"],
  ap: ["Aprovado", "Reprovado"],
};

const i = (p: string, tipo: TipoCampo = "txt", ph?: string, opcoes?: string[]): Item => ({ p, tipo, ph, opcoes });
const q = (titulo: string, icone: string, itens: Item[]): Quadro => ({ titulo, icone, itens });
const PERFIL = (p: string) => i(`Perfil: ${p}`, "sn");
const concorrente = (n: number) => i(`Concorrente ${n}: nome, lote (testada × profundidade), preço à vista e m², entrada, parcelas, índices/correção, financiamento próprio ou bancário, relevo, acesso, tempo de lançamento e lotes disponíveis, tipologia`, "long", "Nome, lote, preço, condições, relevo, acesso, estoque…");
const revenda = (n: number) => i(`Revenda particular ${n}: lote (testada × profundidade), preço à vista e m², condições de pagamento, endereço, relevo, acesso, tempo à venda, tipologia`, "long", "Lote, preço, condições, endereço, tempo à venda…");

export const FORMATO: Quadro[][] = [
  // 1. Identificação e caracterização da área
  [
    q("Identificação", "MapPin", [i("Nome", "txt", "Nome da área…"), i("Endereço", "txt", "Rua, estrada, bairro…")]),
    q("Dimensões e infraestrutura", "Ruler", [i("Extensão (m²)", "num", "Ex.: 125.000"), i("Perímetro com infra", "num", "Metros com infraestrutura"), i("Perímetro total (ml)", "num", "Metros lineares"), i("Quais infras possui?", "long", "Água, energia, asfalto…")]),
  ],
  // 2. Titularidade, terrenista e parceria
  [
    q("Terrenista", "User", [i("Nome / profissão / telefone", "long", "Nome, profissão e telefone…"), i("Valor de venda sugerido pelo terrenista", "rs"), i("Valor da área no imposto de renda", "rs")]),
    q("Parceria", "Handshake", [i("Aceita parceria?", "sna"), i("Tipo de parceria (unidade de lotes, financeira ou híbrida)", "sel", "Selecione…", ["Unidade de lotes", "Financeira", "Híbrida"]), i("Aporte financeiro?", "sn"), i("Percentual", "pct"), i("Constituição da parceria (SPE, SCP ou outros)", "sel", "Selecione…", ["SPE", "SCP", "Outros"])]),
    q("Perfil do terrenista", "UserCheck", [i("Perfil", "txt", "Resumo do perfil…"), PERFIL("valor sentimental"), PERFIL("conservador"), PERFIL("arrojado"), PERFIL("especulador / liquidez imediata"), PERFIL("investidor"), PERFIL("investidor profissional")]),
    q("Motivações", "Target", [PERFIL("terrenista profissional"), PERFIL("herdeiro"), PERFIL("busca renda recorrente"), PERFIL("busca valorização"), PERFIL("busca segurança jurídica"), PERFIL("articulação política na prefeitura")]),
  ],
  // 3. Due diligence documental e registral
  [
    q("Registro e cadastro", "FileText", [i("Matrícula", "doc"), i("Rural ou urbana", "sel", "Selecione…", ["Rural", "Urbana", "Em transição"]), i("IPTU / CCIR", "doc"), i("CAR", "doc"), i("KMZ/KML", "doc")]),
    q("Estudos e certidões", "ClipboardList", [i("Certidão de diretrizes de uso e ocupação do solo (LUOS)", "doc"), i("Estudo de Impacto Ambiental (EIA)", "doc"), i("Estudo de Impacto de Vizinhança (EIV)", "doc")]),
    q("Levantamentos", "Compass", [i("Levantamento planialtimétrico", "doc"), i("Levantamento topográfico", "doc"), i("Levantamento georreferenciado", "doc"), i("Outros documentos", "long", "Quais?")]),
    q("Titulares", "Users", [i("Pessoa física ou jurídica (outro bem no nome da empresa?)", "txt", "PF ou PJ; outros bens…"), i("Herdeiros de acordo?", "sna")]),
  ],
  // 4. Restrições, ônus e ocorrências registrais
  [
    q("Ônus e ocorrências", "AlertTriangle", [i("Ônus na matrícula", "long", "Hipoteca, penhora, usufruto…"), i("Fácil de resolver?", "sna"), i("Lavra mineral", "sna")]),
  ],
  // 5. Legislação municipal
  [
    q("Zoneamento", "Map", [i("Zona", "txt", "Ex.: ZR2"), i("Macrozona", "txt"), i("Lote mínimo", "num", "m²"), i("Áreas públicas", "pct"), i("Módulo rural (2, 3 ou 4 ha)", "sel", "Selecione…", ["2 ha", "3 ha", "4 ha", "Outro"]), i("Lei de raio para descaracterizar rural em urbana sem anuência", "sna")]),
    q("Doações e desmembramento", "Landmark", [i("Doação de áreas verdes (%)", "pct"), i("Doação de área institucional (%)", "pct"), i("Doação no desmembramento (%)", "pct"), i("Infraestrutura exigida no desmembramento (SP: Graprohab)", "long"), i("Aceita carta compromisso e cronograma no desmembramento?", "sna"), i("Limite de lotes no desmembramento urbano e módulo rural", "txt"), i("Permite desdobro? (testada e profundidade)", "txt", "Sim/Não e medidas…")]),
    q("Condomínio", "Building2", [i("Área mínima para portaria/condomínio", "num", "m²"), i("Área máxima do condomínio", "num", "m²"), i("Outorga onerosa de alteração de uso do solo (quando; isenção; cálculo)", "long")]),
    q("Lote e quadra urbanos", "Grid3x3", [i("Lote urbano: área e testada mínimas", "txt", "Ex.: 250 m² · 10 m"), i("Lote urbano: meio de quadra, esquina e profundidade mínimos", "txt"), i("Quadras urbanas: testada máxima e mínima", "txt"), i("Quadras urbanas: profundidade máxima e mínima", "txt"), i("Cul-de-sac (balão) das ruas sem saída", "txt", "Raio mínimo…")]),
    q("Chacreamento", "Trees", [i("Lote de chacreamento: área mínima", "num", "m²"), i("Chacreamento: testada, meio de quadra, esquina e profundidade mínimos", "txt"), i("Quadras de chacreamento: testada e profundidade máximas e mínimas", "txt"), i("Cul-de-sac do chacreamento", "txt"), i("Distância máxima ou mínima do perímetro urbano para chacreamento", "txt", "km"), i("Furtos e roubos em chacreamentos da região", "txt")]),
    q("Urbanismo", "Route", [i("Declividade máxima da área institucional (%)", "pct"), i("Permeabilidade (%)", "pct"), i("Percentual mínimo de vias (calçadas, guias e sarjetas)", "pct"), i("Largura mínima do leito carroçável e das calçadas", "txt", "Ex.: 9 m + 2,5 m"), i("Prazo para construção de casas", "txt")]),
    q("Taxas", "Receipt", [i("Taxa fiscal por lote (após aprovação ou após TVO)", "rs"), i("Taxa na integralização da SPE", "rs"), i("Taxa de licenciamento ambiental", "rs"), i("Taxa de aprovação de infraestrutura", "rs"), i("Taxa de aprovação de obras", "rs")]),
    q("Impostos", "Percent", [i("Isenção de IPTU da incorporadora no loteamento", "sna"), i("Isenção ou carência de IPTU", "txt"), i("Dedução do Sistema Financeiro de Habitação (SFH)", "sna"), i("ITBI: base (IR ou avaliação), percentual e valor", "txt"), i("ITBI: isenção, redução ou carência", "txt")]),
    q("Obras e garantias", "ShieldCheck", [i("Venda de lotes antes do TVEO", "sna"), i("Prazo de execução da infraestrutura (e prorrogação)", "txt", "Ex.: 4 anos + 2"), i("Garantia: caução de lotes (%), seguro, permuta ou outros", "txt"), i("Liberação da caução (por medição ou após TVO)", "sel", "Selecione…", ["Por medição", "Após TVO", "Outro"]), i("Outras exigências municipais", "long")]),
  ],
  // 6. Infraestrutura mínima exigida
  [
    q("Redes", "Zap", [i("Rede de energia", "sna"), i("Rede de água", "sna"), i("Poço artesiano e reservatório", "sna"), i("Drenagem", "sna")]),
    q("Esgoto e pavimento", "Droplets", [i("Esgoto", "sna"), i("Estação elevatória de esgoto", "sna"), i("Estação de tratamento de efluentes", "sna"), i("Pavimentação", "txt", "Tipo exigido…"), i("Outras infraestruturas", "long")]),
  ],
  // 7. Informações preliminares da Prefeitura
  [
    q("Prefeitura", "Landmark", [i("Certidão de uso do solo", "doc"), i("Diretrizes", "doc"), i("Diretrizes GDR / GDU (com memorial descritivo)", "doc"), i("Empreendimentos aprovados ou em aprovação e onde ficam", "long")]),
  ],
  // 8. Infraestrutura, engenharia e vistoria
  [
    q("Enquadramento", "Map", [i("Mapa ONR consultado", "sn"), i("Zoneamento e inserção (urbana, rural, perímetro, expansão, urbanização específica)", "txt"), i("Zoneamento ecológico-econômico (ZEE)", "txt"), i("Tipologia permitida (residencial, comercial, industrial, turística)", "txt"), i("Servidões, corredores ou vias lindeiras na matrícula", "txt"), i("Possibilidade de desmembramento", "sna"), i("Distância permitida da rodovia (eixo ou faixa de domínio)", "txt", "m")]),
    q("Saneamento e níveis", "Droplets", [i("Redes de esgoto, água, energia e drenagem próximas (saturação, reparos, ampliação)", "long"), i("Declividade", "pct"), i("A direção favorece água, esgoto e drenagem?", "sna"), i("Perto do reservatório de água? Nível em relação à rua", "txt"), i("Perto da estação de esgoto? Nível em relação à rua", "txt"), i("Cliente aceita estação elevatória de esgoto?", "sna"), i("Mau odor por perto?", "sn")]),
    q("Crescimento e acesso", "TrendingUp", [i("A cidade cresce na direção da área?", "sna"), i("O município tem preferência de direção?", "txt"), i("Distância do centro", "txt", "km"), i("Distância do bairro mais próximo", "txt", "km"), i("Linha de ônibus", "sn"), i("Comércio e serviços públicos próximos", "txt"), i("Percentual do público-alvo a atingir", "pct"), i("Acesso", "txt", "Descreva o acesso…")]),
    q("Interferências", "RadioTower", [i("Torres de transmissão", "sn"), i("Torres eólicas", "sn"), i("Gasoduto", "sn"), i("Linha férrea", "sn"), i("Córregos e nascentes", "sna"), i("Minas, rios, lagos, brejos, aterro, lixão, aquífero, garimpo e outros", "long"), i("Invasão na área ou no entorno", "sn")]),
    q("Solo e relevo", "Mountain", [i("Histórico de alagamento (linha do tempo do Google Earth)", "sna"), i("Contaminação do solo", "sna"), i("Relevo (leve, médio ou alto)", "sel", "Selecione…", ["Leve", "Médio", "Alto"]), i("Solo firme?", "sna"), i("Lençol freático", "txt", "Profundidade…"), i("Poço artesiano (homologado? tamponar?)", "txt"), i("Cortes ou aterros que pesam na terraplenagem", "txt")]),
    q("Ambiental", "Leaf", [i("APP", "txt", "Onde e quanto…"), i("APA (%)", "pct"), i("Reserva legal (%)", "pct"), i("Mata", "txt"), i("Supressão necessária?", "sna"), i("Bioma", "txt", "Ex.: Mata Atlântica"), i("Parque nacional inserido?", "sn"), i("Mata nativa (supressão e compensação)", "txt"), i("Aspectos ambientais (Cetesb, MMA, Conama, Ibama, Iphan, ICMBio, Sisnama)", "long"), i("Vegetação protegida", "sna"), i("Quem rege as leis ambientais (município ou estado)", "sel", "Selecione…", ["Município", "Estado"])]),
    q("Vizinhança sensível", "Eye", [i("Cemitério: distância e se é visível", "txt"), i("Presídio: distância e se é visível", "txt"), i("Aeroporto: está na linha aérea?", "sn")]),
    q("Produto possível", "LayoutGrid", [i("Tipologia e potencial (desmembramento, loteamento aberto ou fechado, condomínio, ZEIS/HIS, chacreamento) e padrão", "long"), i("Chacreamento: SIGEF, SNCR-CCIR e matrícula no mesmo CPF/CNPJ", "sna"), i("Condomínio de chácaras: fração privada e áreas comuns; ajuste de testada e comprimento", "txt"), i("Lei 10.438/2002 ou Decreto 11.628/2023 ativos no município?", "sna"), i("Cidade praiana (infraestrutura até 20% mais cara)", "sn")]),
  ],
  // 9. Análise socioeconômica e mercadológica (a da foto)
  [
    q("Mercado", "BarChart3", [i("Preço do lote na região", "rs"), i("Velocidade de venda", "txt", "Ex.: 10 unidades/mês"), i("Informações de corretores, imobiliárias e comércio local", "long", "Informe as principais fontes…"), i("IPTU médio de casas e lotes nas proximidades", "rs")]),
    q("Perfil Socioeconômico", "Users", [i("PIB em crescimento?", "sna"), i("Renda per capita (anual e mensal)", "rs"), i("População", "num", "Digite o número…"), i("População rotativa?", "sn"), i("Cidade dormitório?", "sn"), i("Idade média dos moradores", "num", "anos"), i("Jovens de 18 a 24 anos (%)", "pct"), i("Classes econômicas (A a E)", "txt", "Ex.: B e C"), i("Moradores de aluguel (%)", "pct"), i("Moradores por domicílio", "num")]),
    q("Indicadores Complementares", "ShieldCheck", [i("Índice de violência", "txt", "Informe o índice…"), i("Índice de empregabilidade", "pct", "Informe o percentual…"), i("Estância turística?", "sn"), i("Clima", "sel", "Selecione o clima…", ["Tropical", "Subtropical", "Semiárido", "Equatorial", "Tropical de altitude", "Litorâneo úmido"]), i("Meses de chuva (para a obra)", "txt", "Ex.: dez a mar")]),
    q("Condições Regionais", "Palmtree", [i("Região desenvolvida ou em desenvolvimento", "sel", "Selecione…", ["Desenvolvida", "Em desenvolvimento"]), i("Programas MCMV, HIS ou incentivo municipal", "txt"), i("Cidades vizinhas importantes (até 200 km): distância, população e clientes", "long"), i("Mercados predominantes e sazonais (plantio, colheita, turismo)", "long")]),
    q("Investimento na região", "Briefcase", [i("Possíveis investidores e construtores", "long"), i("Empresas de médio e grande porte (atuais ou chegando)", "long")]),
  ],
  // 10. Fornecedores e estrutura local
  [
    q("Obras", "Truck", [i("Fornecedores de terraplenagem, pavimentação e infraestrutura (distância)", "long"), i("Distância do fornecedor de CBUQ (mínimo de 150 °C)", "txt", "km")]),
    q("Profissionais", "HardHat", [i("Engenheiros, arquitetos, topógrafos e outros", "long"), i("Profissionais da prefeitura que prestam serviço", "long"), i("Corretores e imobiliárias (nomes e telefones)", "long")]),
  ],
  // 11. Publicidade e estrutura comercial
  [
    q("Mídia local", "Megaphone", [i("Meios de comunicação (nomes e telefones)", "long"), i("Rádios", "txt"), i("Podcasts", "txt")]),
    q("Pessoas e rua", "Mic", [i("Influenciadores", "txt"), i("Cantores", "txt"), i("Carros de som", "txt")]),
  ],
  // 12. Estudo da concorrência
  [
    q("Panorama", "Search", [i("Concorrentes no raio de 5 km", "long"), i("Materiais da concorrência e mídias que dão resultado", "long"), i("Empreendimento embargado ou não entregue (motivo e reação da população)", "long")]),
    q("Concorrentes", "Building", [concorrente(1), concorrente(2), concorrente(3), concorrente(4), concorrente(5), concorrente(6)]),
    q("Revendas particulares", "Home", [revenda(1), revenda(2), revenda(3), revenda(4), revenda(5), revenda(6)]),
  ],
  // 13. Capacidade financeira e produto
  [
    q("Produto", "Package", [i("Produto sugerido", "txt"), i("Quantidade de lotes", "num"), i("O produto JBL é adequado ao mercado?", "sna")]),
    q("Preço e demanda", "Wallet", [i("Ticket médio", "rs"), i("Capacidade de pagamento mensal", "rs"), i("Preço médio praticado", "rs"), i("Velocidade média de vendas", "txt", "unidades/mês")]),
    q("Estoque", "Boxes", [i("Estoque de lotes de loteadoras", "num"), i("Estoque de lotes particulares", "num"), i("Estoque total de lotes no município", "num")]),
  ],
  // 14. Cartório de Registro de Imóveis
  [
    q("Registro na SPE", "Stamp", [i("Registro da matrícula mãe na SPE", "rs"), i("Registro por lote na SPE (desmembramento e loteamento)", "rs"), i("Registro por módulo na SPE", "rs"), i("Registro por módulo fora da SPE (pessoa física)", "rs"), i("Publicação das matrículas na SPE", "rs"), i("Publicação das matrículas fora da SPE", "rs")]),
    q("Outras taxas e parceria", "Receipt", [i("Taxa de incorporação", "rs"), i("Taxa de instituição de condomínio", "rs"), i("Taxa de convenção de condomínio", "rs"), i("Outras taxas do cartório", "txt"), i("O cartório faz parceria? (financeira ou lote)", "sna"), i("Servidões menores que o módulo rural: matrícula das ruas obrigatória?", "sna")]),
  ],
  // 15. Informações do Registro de Imóveis
  [q("Registro de Imóveis", "BookOpen", [i("Diretrizes do Registro de Imóveis", "long")])],
  // 16. Tabelionato de Notas
  [q("Tabelionato", "PenLine", [i("Registro do contrato de compra e venda", "rs"), i("Outras taxas do tabelionato", "txt")])],
  // 17. Informações do Tabelionato
  [q("Diretrizes", "BookOpen", [i("Diretrizes do Tabelionato", "long")])],
  // 18. Concessionária de água e esgoto
  [q("Água e esgoto", "Droplets", [i("Viabilidade de água e esgoto", "doc")])],
  // 19. Concessionária de energia
  [q("Energia", "Zap", [i("Rede de energia", "sna"), i("Linha de transmissão", "sn"), i("Diretrizes da concessionária de energia", "doc")])],
  // 20. Secretaria de Meio Ambiente
  [q("Meio Ambiente", "Leaf", [i("Diretrizes da Secretaria de Meio Ambiente", "doc")])],
  // 21. Secretaria de Trânsito
  [q("Trânsito", "TrafficCone", [i("Diretrizes da Secretaria de Trânsito", "doc")])],
  // 22. Corpo de Bombeiros
  [q("Bombeiros", "Flame", [i("Abertura de novas vias?", "sna"), i("Diretrizes ou consulta técnica dos Bombeiros", "doc")])],
  // 23. DER / DNIT
  [q("Rodovias", "Route", [i("Faixa de domínio", "txt", "m"), i("Manual do DER/DNIT (área lindeira ou próxima de rodovia)", "doc")])],
  // 24. CETESB
  [q("CETESB", "Leaf", [i("Supressão de mata", "sna"), i("Diretrizes da Cetesb", "doc")])],
  // 25. GRAPROHAB
  [q("GRAPROHAB", "FolderOpen", [i("Diretrizes enviadas na pasta de documentação", "sn")])],
  // 26. Expansão de novos negócios
  [q("Novos negócios", "Rocket", [i("Novos empreendimentos possíveis no município ou vizinhos", "long")])],
  // 27. Encerramento do estudo
  [q("Encerramento", "CheckCircle2", [i("Levantamento consolidado com documentos, diretrizes, laudos e mercado", "snp")])],
  // 28. Relatório técnico consolidado
  [q("Relatório", "FileCheck", [i("Relatório técnico de viabilidade", "snp")])],
  // 29. Considerações
  [
    q("Política", "Landmark", [i("Articulação política (prefeito, câmara, secretarias)", "long")]),
    q("Material de campo", "Camera", [i("KMZ impresso em 2 vias com anotações", "sn"), i("Fotos e vídeos do local", "sn"), i("Croqui", "sn")]),
  ],
  // 30. Laudo
  [
    q("Resultado", "Gauge", [i("Índice de viabilidade (%)", "pct"), i("Conclusão", "long"), i("Precisa de estudo externo (empresa especializada)?", "sna"), i("Planejamento de lançamento: desmembramento e etapas 2, 3 e 4", "long")]),
    q("Aprovações", "BadgeCheck", [i("Técnico responsável: aprovado ou reprovado e data", "txt", "Aprovado/Reprovado · dd/mm/aaaa"), i("Laudado e concluso por: aprovado ou reprovado e data", "txt", "Nome · Aprovado/Reprovado · data"), i("Revisado e atestado: consistente ou inconsistente e data", "txt", "Consistente/Inconsistente · data"), i("Diretor-geral (Marcelo Aguilar): aprovado ou reprovado e data", "txt", "Aprovado/Reprovado · data"), i("Parecer do diretor-geral", "long")]),
  ],
];

/** Opções do campo (as do tipo ou as próprias) */
export const opcoesDo = (it: Item) => it.opcoes ?? OPCOES[it.tipo] ?? [];
