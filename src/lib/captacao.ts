/**
 * Captação de áreas (pedido 19/11/2026): regras puras do funil, do checklist vivo e do "professor".
 * Nada aqui fala com o banco; o acesso fica em captacao-db.ts.
 */

export const ETAPAS = [
  ["captacao", "Captação"],
  ["previabilidade", "Pré-viabilidade"],
  ["reuniao", "Reunião"],
  ["proposta", "Proposta"],
  ["estudo30", "Estudo 30 dias"],
  ["contrato", "Contrato"],
] as const;
export type Etapa = (typeof ETAPAS)[number][0];
export const nomeEtapa = (k: string) => ETAPAS.find(([e]) => e === k)?.[1] ?? k;
export const proximaEtapa = (k: string): Etapa | null => {
  const i = ETAPAS.findIndex(([e]) => e === k);
  return i >= 0 && i < ETAPAS.length - 1 ? ETAPAS[i + 1][0] : null;
};

/** O que o botão principal de cada etapa pergunta (o "gate") */
export const ACAO_DA_ETAPA: Record<Etapa, string> = {
  captacao: "Sim, estudar",
  previabilidade: "Marcar reunião",
  reuniao: "Fazer proposta",
  proposta: "Proposta aceita",
  estudo30: "Fechar contrato",
  contrato: "Contrato assinado",
};

export const SITUACOES = [
  ["ativa", "Ativas"],
  ["geladeira", "Geladeira"],
  ["descartada", "Descartadas"],
] as const;

/** Tempo na geladeira, em meses (pedido 20/11/2026) */
export const MESES_GELADEIRA = [1, 3, 6, 9, 12] as const;
export const rotuloMeses = (m: number) => (m === 12 ? "1 ano" : m === 1 ? "1 mês" : `${m} meses`);

/** Soma meses sem pular para o mês seguinte (31/01 + 1 mês = 28 ou 29/02) */
export function somarMeses(d: Date, meses: number) {
  const r = new Date(d);
  const dia = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + meses);
  r.setDate(Math.min(dia, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return r;
}

/** Dias que faltam para sair da geladeira (negativo = já passou) */
export const diasParaSair = (ate: Date, agora = new Date()) => Math.ceil((ate.getTime() - agora.getTime()) / 864e5);

/** Avisa uma vez quando faltam 5 dias ou menos */
export const avisarGeladeira = (a: { situacao: string; geladeiraAte: Date | null; geladeiraAvisoEm: Date | null }, agora = new Date()) =>
  a.situacao === "geladeira" && !!a.geladeiraAte && !a.geladeiraAvisoEm && diasParaSair(a.geladeiraAte, agora) <= 5;

export const PAPEIS: Record<string, string> = {
  proprietario: "Proprietário",
  corretor_proprietario: "Corretor do proprietário",
  fonte_mercado: "Fonte de mercado",
  tecnico: "Técnico",
  outro: "Outro",
};

/** Origem de cada resposta do checklist e o peso dela como prova */
export const FONTES = {
  documento: { rotulo: "Documento", icone: "📜", tipo: "Literal", certeza: 3 },
  raiox: { rotulo: "Raio-x", icone: "📐", tipo: "Medido", certeza: 2 },
  reuniao: { rotulo: "Reunião", icone: "🗣", tipo: "Relato", certeza: 1 },
  whatsapp: { rotulo: "WhatsApp", icone: "🗣", tipo: "Relato", certeza: 1 },
  manual: { rotulo: "Manual", icone: "✍️", tipo: "Anotação", certeza: 1 },
  estimativa: { rotulo: "Estimativa", icone: "💭", tipo: "Estimativa", certeza: 0 },
} as const;
export type Fonte = keyof typeof FONTES;
export const ehFonte = (f: unknown): f is Fonte => typeof f === "string" && f in FONTES;

export type Resposta = { secao: number; pergunta: string; resposta: string; fonte: Fonte; ref: string; em: string };

/** Checklist oficial JBL de viabilidade in loco (base/material, conferido item a item em 20/11/2026): as 30 seções e todos os itens. */
export const SECOES: { titulo: string; perguntas: string[] }[] = [
  { titulo: "Identificação e caracterização da área", perguntas: ["Nome", "Endereço", "Extensão (m²)", "Perímetro com infra", "Perímetro total (ml)", "Quais infras possui?"] },
  { titulo: "Titularidade, terrenista e parceria", perguntas: ["Nome / profissão / telefone", "Aceita parceria?", "Tipo de parceria (unidade de lotes, financeira ou híbrida)", "Aporte financeiro?", "Percentual", "Constituição da parceria (SPE, SCP ou outros)", "Perfil", "Perfil: valor sentimental", "Perfil: conservador", "Perfil: arrojado", "Perfil: especulador / liquidez imediata", "Perfil: investidor", "Perfil: investidor profissional", "Perfil: terrenista profissional", "Perfil: herdeiro", "Perfil: busca renda recorrente", "Perfil: busca valorização", "Perfil: busca segurança jurídica", "Perfil: articulação política na prefeitura", "Valor de venda sugerido pelo terrenista", "Valor da área no imposto de renda"] },
  { titulo: "Due diligence documental e registral", perguntas: ["Matrícula", "Rural ou urbana", "IPTU / CCIR", "CAR", "KMZ/KML", "Certidão de diretrizes de uso e ocupação do solo (LUOS)", "Estudo de Impacto Ambiental (EIA)", "Estudo de Impacto de Vizinhança (EIV)", "Levantamento planialtimétrico", "Levantamento topográfico", "Levantamento georreferenciado", "Outros documentos", "Pessoa física ou jurídica (outro bem no nome da empresa?)", "Herdeiros de acordo?"] },
  { titulo: "Restrições, ônus e ocorrências registrais", perguntas: ["Ônus na matrícula", "Fácil de resolver?", "Lavra mineral"] },
  { titulo: "Legislação municipal", perguntas: ["Zona", "Macrozona", "Lote mínimo", "Áreas públicas", "Doação de áreas verdes (%)", "Doação de área institucional (%)", "Doação no desmembramento (%)", "Infraestrutura exigida no desmembramento (SP: Graprohab)", "Aceita carta compromisso e cronograma no desmembramento?", "Limite de lotes no desmembramento urbano e módulo rural", "Área mínima para portaria/condomínio", "Área máxima do condomínio", "Outorga onerosa de alteração de uso do solo (quando; isenção; cálculo)", "Permite desdobro? (testada e profundidade)", "Isenção de IPTU da incorporadora no loteamento", "Prazo para construção de casas", "Declividade máxima da área institucional (%)", "Permeabilidade (%)", "Percentual mínimo de vias (calçadas, guias e sarjetas)", "Largura mínima do leito carroçável e das calçadas", "Lote urbano: área e testada mínimas", "Lote urbano: meio de quadra, esquina e profundidade mínimos", "Quadras urbanas: testada máxima e mínima", "Quadras urbanas: profundidade máxima e mínima", "Cul-de-sac (balão) das ruas sem saída", "Lote de chacreamento: área mínima", "Chacreamento: testada, meio de quadra, esquina e profundidade mínimos", "Quadras de chacreamento: testada e profundidade máximas e mínimas", "Cul-de-sac do chacreamento", "Módulo rural (2, 3 ou 4 ha)", "Distância máxima ou mínima do perímetro urbano para chacreamento", "Furtos e roubos em chacreamentos da região", "Taxa fiscal por lote (após aprovação ou após TVO)", "Taxa na integralização da SPE", "Taxa de licenciamento ambiental", "Taxa de aprovação de infraestrutura", "Taxa de aprovação de obras", "Isenção ou carência de IPTU", "Dedução do Sistema Financeiro de Habitação (SFH)", "ITBI: base (IR ou avaliação), percentual e valor", "ITBI: isenção, redução ou carência", "Lei de raio para descaracterizar rural em urbana sem anuência", "Venda de lotes antes do TVEO", "Prazo de execução da infraestrutura (e prorrogação)", "Garantia: caução de lotes (%), seguro, permuta ou outros", "Liberação da caução (por medição ou após TVO)", "Outras exigências municipais"] },
  { titulo: "Infraestrutura mínima exigida", perguntas: ["Rede de energia", "Drenagem", "Rede de água", "Poço artesiano e reservatório", "Estação elevatória de esgoto", "Estação de tratamento de efluentes", "Esgoto", "Pavimentação", "Outras infraestruturas"] },
  { titulo: "Informações preliminares da Prefeitura", perguntas: ["Certidão de uso do solo", "Diretrizes", "Empreendimentos aprovados ou em aprovação e onde ficam", "Diretrizes GDR / GDU (com memorial descritivo)"] },
  { titulo: "Infraestrutura, engenharia e vistoria", perguntas: ["Mapa ONR consultado", "Zoneamento e inserção (urbana, rural, perímetro, expansão, urbanização específica)", "Zoneamento ecológico-econômico (ZEE)", "Tipologia permitida (residencial, comercial, industrial, turística)", "Servidões, corredores ou vias lindeiras na matrícula", "Possibilidade de desmembramento", "Distância permitida da rodovia (eixo ou faixa de domínio)", "Redes de esgoto, água, energia e drenagem próximas (saturação, reparos, ampliação)", "Declividade", "A direção favorece água, esgoto e drenagem?", "Perto do reservatório de água? Nível em relação à rua", "Perto da estação de esgoto? Nível em relação à rua", "Cliente aceita estação elevatória de esgoto?", "Mau odor por perto?", "A cidade cresce na direção da área?", "O município tem preferência de direção?", "Distância do centro", "Distância do bairro mais próximo", "Linha de ônibus", "Comércio e serviços públicos próximos", "Percentual do público-alvo a atingir", "Torres de transmissão", "Torres eólicas", "Gasoduto", "Linha férrea", "Córregos e nascentes", "Minas, rios, lagos, brejos, aterro, lixão, aquífero, garimpo e outros", "Histórico de alagamento (linha do tempo do Google Earth)", "Contaminação do solo", "Relevo (leve, médio ou alto)", "Solo firme?", "Lençol freático", "Poço artesiano (homologado? tamponar?)", "Cortes ou aterros que pesam na terraplenagem", "Acesso", "Invasão na área ou no entorno", "APP", "APA (%)", "Reserva legal (%)", "Mata", "Supressão necessária?", "Bioma", "Parque nacional inserido?", "Mata nativa (supressão e compensação)", "Aspectos ambientais (Cetesb, MMA, Conama, Ibama, Iphan, ICMBio, Sisnama)", "Vegetação protegida", "Quem rege as leis ambientais (município ou estado)", "Cemitério: distância e se é visível", "Presídio: distância e se é visível", "Aeroporto: está na linha aérea?", "Tipologia e potencial (desmembramento, loteamento aberto ou fechado, condomínio, ZEIS/HIS, chacreamento) e padrão", "Chacreamento: SIGEF, SNCR-CCIR e matrícula no mesmo CPF/CNPJ", "Condomínio de chácaras: fração privada e áreas comuns; ajuste de testada e comprimento", "Lei 10.438/2002 ou Decreto 11.628/2023 ativos no município?", "Cidade praiana (infraestrutura até 20% mais cara)"] },
  { titulo: "Análise socioeconômica e mercadológica", perguntas: ["Preço do lote na região", "Velocidade de venda", "Informações de corretores, imobiliárias e comércio local", "PIB em crescimento?", "Renda per capita (anual e mensal)", "População", "Cidade dormitório?", "População rotativa?", "Índice de violência", "Índice de empregabilidade", "Estância turística?", "Clima", "Meses de chuva (para a obra)", "Idade média dos moradores", "Jovens de 18 a 24 anos (%)", "Região desenvolvida ou em desenvolvimento", "Programas MCMV, HIS ou incentivo municipal", "IPTU médio de casas e lotes nas proximidades", "Cidades vizinhas importantes (até 200 km): distância, população e clientes", "Classes econômicas (A a E)", "Mercados predominantes e sazonais (plantio, colheita, turismo)", "Moradores de aluguel (%)", "Moradores por domicílio", "Possíveis investidores e construtores", "Empresas de médio e grande porte (atuais ou chegando)"] },
  { titulo: "Fornecedores e estrutura local", perguntas: ["Fornecedores de terraplenagem, pavimentação e infraestrutura (distância)", "Distância do fornecedor de CBUQ (mínimo de 150 °C)", "Engenheiros, arquitetos, topógrafos e outros", "Profissionais da prefeitura que prestam serviço", "Corretores e imobiliárias (nomes e telefones)"] },
  { titulo: "Publicidade e estrutura comercial", perguntas: ["Meios de comunicação (nomes e telefones)", "Rádios", "Podcasts", "Influenciadores", "Cantores", "Carros de som"] },
  { titulo: "Estudo da concorrência", perguntas: ["Concorrentes no raio de 5 km", "Materiais da concorrência e mídias que dão resultado", "Empreendimento embargado ou não entregue (motivo e reação da população)", "Concorrente 1: nome, lote (testada × profundidade), preço à vista e m², entrada, parcelas, índices/correção, financiamento próprio ou bancário, relevo, acesso, tempo de lançamento e lotes disponíveis, tipologia", "Concorrente 2: nome, lote (testada × profundidade), preço à vista e m², entrada, parcelas, índices/correção, financiamento próprio ou bancário, relevo, acesso, tempo de lançamento e lotes disponíveis, tipologia", "Concorrente 3: nome, lote (testada × profundidade), preço à vista e m², entrada, parcelas, índices/correção, financiamento próprio ou bancário, relevo, acesso, tempo de lançamento e lotes disponíveis, tipologia", "Concorrente 4: nome, lote (testada × profundidade), preço à vista e m², entrada, parcelas, índices/correção, financiamento próprio ou bancário, relevo, acesso, tempo de lançamento e lotes disponíveis, tipologia", "Concorrente 5: nome, lote (testada × profundidade), preço à vista e m², entrada, parcelas, índices/correção, financiamento próprio ou bancário, relevo, acesso, tempo de lançamento e lotes disponíveis, tipologia", "Concorrente 6: nome, lote (testada × profundidade), preço à vista e m², entrada, parcelas, índices/correção, financiamento próprio ou bancário, relevo, acesso, tempo de lançamento e lotes disponíveis, tipologia", "Revenda particular 1: lote (testada × profundidade), preço à vista e m², condições de pagamento, endereço, relevo, acesso, tempo à venda, tipologia", "Revenda particular 2: lote (testada × profundidade), preço à vista e m², condições de pagamento, endereço, relevo, acesso, tempo à venda, tipologia", "Revenda particular 3: lote (testada × profundidade), preço à vista e m², condições de pagamento, endereço, relevo, acesso, tempo à venda, tipologia", "Revenda particular 4: lote (testada × profundidade), preço à vista e m², condições de pagamento, endereço, relevo, acesso, tempo à venda, tipologia", "Revenda particular 5: lote (testada × profundidade), preço à vista e m², condições de pagamento, endereço, relevo, acesso, tempo à venda, tipologia", "Revenda particular 6: lote (testada × profundidade), preço à vista e m², condições de pagamento, endereço, relevo, acesso, tempo à venda, tipologia"] },
  { titulo: "Capacidade financeira e produto", perguntas: ["Produto sugerido", "Quantidade de lotes", "Ticket médio", "Capacidade de pagamento mensal", "Preço médio praticado", "O produto JBL é adequado ao mercado?", "Velocidade média de vendas", "Estoque de lotes de loteadoras", "Estoque de lotes particulares", "Estoque total de lotes no município"] },
  { titulo: "Cartório de Registro de Imóveis", perguntas: ["Registro da matrícula mãe na SPE", "Registro por lote na SPE (desmembramento e loteamento)", "Registro por módulo na SPE", "Registro por módulo fora da SPE (pessoa física)", "Publicação das matrículas na SPE", "Publicação das matrículas fora da SPE", "Taxa de incorporação", "Taxa de instituição de condomínio", "Taxa de convenção de condomínio", "Outras taxas do cartório", "O cartório faz parceria? (financeira ou lote)", "Servidões menores que o módulo rural: matrícula das ruas obrigatória?"] },
  { titulo: "Informações do Registro de Imóveis", perguntas: ["Diretrizes do Registro de Imóveis"] },
  { titulo: "Tabelionato de Notas", perguntas: ["Registro do contrato de compra e venda", "Outras taxas do tabelionato"] },
  { titulo: "Informações do Tabelionato", perguntas: ["Diretrizes do Tabelionato"] },
  { titulo: "Concessionária de água e esgoto", perguntas: ["Viabilidade de água e esgoto"] },
  { titulo: "Concessionária de energia", perguntas: ["Rede de energia", "Linha de transmissão", "Diretrizes da concessionária de energia"] },
  { titulo: "Secretaria de Meio Ambiente", perguntas: ["Diretrizes da Secretaria de Meio Ambiente"] },
  { titulo: "Secretaria de Trânsito", perguntas: ["Diretrizes da Secretaria de Trânsito"] },
  { titulo: "Corpo de Bombeiros", perguntas: ["Abertura de novas vias?", "Diretrizes ou consulta técnica dos Bombeiros"] },
  { titulo: "DER / DNIT", perguntas: ["Faixa de domínio", "Manual do DER/DNIT (área lindeira ou próxima de rodovia)"] },
  { titulo: "CETESB", perguntas: ["Supressão de mata", "Diretrizes da Cetesb"] },
  { titulo: "GRAPROHAB", perguntas: ["Diretrizes enviadas na pasta de documentação"] },
  { titulo: "Expansão de novos negócios", perguntas: ["Novos empreendimentos possíveis no município ou vizinhos"] },
  { titulo: "Encerramento do estudo", perguntas: ["Levantamento consolidado com documentos, diretrizes, laudos e mercado"] },
  { titulo: "Relatório técnico consolidado", perguntas: ["Relatório técnico de viabilidade"] },
  { titulo: "Considerações", perguntas: ["Articulação política (prefeito, câmara, secretarias)", "KMZ impresso em 2 vias com anotações", "Fotos e vídeos do local", "Croqui"] },
  { titulo: "Laudo", perguntas: ["Índice de viabilidade (%)", "Conclusão", "Técnico responsável: aprovado ou reprovado e data", "Laudado e concluso por: aprovado ou reprovado e data", "Revisado e atestado: consistente ou inconsistente e data", "Precisa de estudo externo (empresa especializada)?", "Diretor-geral (Marcelo Aguilar): aprovado ou reprovado e data", "Planejamento de lançamento: desmembramento e etapas 2, 3 e 4", "Parecer do diretor-geral"] },
];
/** Seção das anotações que não se encaixam em nenhuma regra */
const SECAO_LIVRE = 28;

/** Palavra → seção e pergunta (ordem importa: a primeira que casar vale) */
const REGRAS: [RegExp, number, string][] = [
  [/matr[ií]cula|herdeir|invent[aá]rio|escritura/i, 2, "Matrícula"],
  [/\biptu\b|\bccir\b|\bitr\b/i, 2, "IPTU / CCIR"],
  [/[oô]nus|penhora|hipoteca|usufruto/i, 3, "Ônus na matrícula"],
  [/lavra|minera[cç]|\banm\b/i, 3, "Lavra mineral"],
  [/zona|zoneamento|plano diretor|lote m[ií]nimo/i, 4, "Zona"],
  [/prefeitura|diretriz|certid[aã]o/i, 6, "Diretrizes"],
  [/c[oó]rrego|nascente|grota|brejo|alaga/i, 7, "Córregos e nascentes"],
  [/declive|declividade|terraplen/i, 7, "Declividade"],
  [/\bmata\b|vegeta[cç]|supress/i, 7, "Mata"],
  [/estrada|asfalt|acesso|ponte|porteira/i, 7, "Acesso"],
  [/concorr|loteamento vizinho|condom[ií]nio/i, 11, "Concorrentes no raio de 5 km"],
  [/pre[cç]o|r\$|valor do m|vend/i, 8, "Preço do lote na região"],
  [/[aá]gua|esgoto|saae|sabesp|sanepar|copasa/i, 17, "Viabilidade de água e esgoto"],
  [/energia|\bluz\b|cpfl|enel|elektro|\bposte/i, 18, "Rede de energia"],
  [/percentual|parceria|aporte|\bspe\b|\bscp\b|\d+\s?%/i, 1, "Aceita parceria?"],
  [/profiss|telefone|perfil|renda/i, 1, "Perfil"],
];

const MAX_TEXTO = 8000;

/** Quebra o texto em frases úteis (ponto, ponto e vírgula ou linha) */
export function frases(texto: string): string[] {
  return texto
    .slice(0, MAX_TEXTO)
    .split(/[\n;]+|(?<=[^\d])\.(?=\s|$)/)
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 3);
}

/** Cada frase vai para a seção certa do checklist, com a origem */
export function distribuir(texto: string, fonte: Fonte, ref: string, em = new Date().toISOString()): Resposta[] {
  return frases(texto).map((t) => {
    const r = REGRAS.find(([re]) => re.test(t));
    return { secao: r ? r[1] : SECAO_LIVRE, pergunta: r ? r[2] : "Anotação", resposta: t.slice(0, 600), fonte, ref: ref.slice(0, 120), em };
  });
}

/** Lê o checklist gravado, descartando o que não tem o formato certo */
export function lerChecklist(v: unknown): Resposta[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (r): r is Resposta =>
      !!r && typeof r === "object" && Number.isInteger((r as Resposta).secao) && (r as Resposta).secao >= 0 && (r as Resposta).secao < SECOES.length && typeof (r as Resposta).resposta === "string" && ehFonte((r as Resposta).fonte),
  );
}

/** Quanto do checklist já tem resposta (cada seção conta pelo menos 3 itens) */
export function progresso(chk: Resposta[]) {
  const porSecao = SECOES.map((s, i) => {
    const feitas = new Set(chk.filter((r) => r.secao === i).map((r) => r.pergunta));
    const esperadas = Math.max(s.perguntas.length, 3);
    const ok = s.perguntas.length ? s.perguntas.filter((p) => feitas.has(p)).length + [...feitas].filter((p) => !s.perguntas.includes(p)).length : feitas.size;
    return { ok: Math.min(ok, esperadas), esperadas };
  });
  const total = porSecao.reduce((a, s) => a + s.esperadas, 0);
  const ok = porSecao.reduce((a, s) => a + s.ok, 0);
  return { porSecao, total, ok, pct: Math.round((ok / total) * 100) };
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const PARADAS = new Set(["qual", "quais", "como", "onde", "quem", "quando", "tem", "esta", "sobre", "area", "essa", "esse", "isso", "para", "pela", "pelo", "com", "uma", "que", "dos", "das", "nao", "sim", "ela", "ele"]);

/** "Perguntar sobre esta área": acha no checklist as respostas que falam do assunto, com a fonte */
export function perguntar(chk: Resposta[], pergunta: string) {
  const termos = norm(pergunta.slice(0, 300))
    .split(/[^a-z0-9²]+/)
    .filter((t) => t.length > 2 && !PARADAS.has(t));
  if (!termos.length) return [];
  return chk
    .map((r) => {
      const alvo = norm(`${SECOES[r.secao].titulo} ${r.pergunta} ${r.resposta}`);
      return { r, pontos: termos.filter((t) => alvo.includes(t.length > 5 ? t.slice(0, -1) : t)).length };
    })
    .filter((x) => x.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || FONTES[b.r.fonte].certeza - FONTES[a.r.fonte].certeza)
    .slice(0, 6)
    .map((x) => x.r);
}

/** O que a resposta vale como prova, em uma frase (pedido 19/11/2026) */
export function grauDaFonte(r: Resposta): string {
  switch (r.fonte) {
    case "documento":
      return `Literal: está em ${r.ref}.`;
    case "raiox":
      return `Medido no raio-x (${r.ref}). Confirmar em campo antes de assinar.`;
    case "reuniao":
    case "whatsapp":
      return `Relato (${r.ref}). Importante checar.`;
    case "estimativa":
      return "Palpite do sistema, sem prova.";
    default:
      return `Anotado à mão (${r.ref}).`;
  }
}

/* ------------------------------ o professor ------------------------------ */

export type Questao = { categoria: "Geral" | "Jurídica" | "Ambiental" | "Mercado" | "Financeira" | "Acesso"; texto: string; pedirA?: string; conversaId?: string; mensagem?: string };

/** Itens que decidem o negócio: sem eles (ou só com relato), o estudo não se sustenta */
const CHAVES: { secao: number; pergunta: string; categoria: Questao["categoria"]; falta: string; relato: string; pedirA: string; mensagem: string }[] = [
  { secao: 2, pergunta: "Matrícula", categoria: "Jurídica", falta: "A matrícula ainda não chegou. Quem são os donos? Há inventário ou ônus?", relato: "O que sabemos da matrícula veio de conversa. Pedir a certidão atualizada no cartório.", pedirA: "proprietario", mensagem: "Pode me mandar a matrícula atualizada da área? Se tiver herdeiros ou inventário, me conta também." },
  { secao: 4, pergunta: "Zona", categoria: "Jurídica", falta: "Sem a zona não há lote mínimo nem conta de lotes. Rodar o raio-x ou pedir a certidão de uso do solo.", relato: "A zona foi dita, não conferida no mapa oficial.", pedirA: "tecnico", mensagem: "Você sabe em que zona a área está no Plano Diretor? Tem a certidão de uso do solo?" },
  { secao: 7, pergunta: "Córregos e nascentes", categoria: "Ambiental", falta: "Ninguém confirmou córregos e nascentes. Cada curso d'água tira 30 m de cada lado.", relato: "Córregos e nascentes vêm de relato. Precisa de vistoria em dia seco ou laudo.", pedirA: "proprietario", mensagem: "Na área tem córrego ou nascente com água o ano todo, ou só quando chove?" },
  { secao: 8, pergunta: "Preço do lote na região", categoria: "Mercado", falta: "Sem preço de lote na região não dá para estimar o VGV.", relato: "O preço vem de conversa ou anúncio. Qual foi o preço de venda fechado?", pedirA: "fonte_mercado", mensagem: "Por quanto foram vendidos (de fato) os últimos lotes aí perto? E em quanto tempo?" },
  { secao: 17, pergunta: "Viabilidade de água e esgoto", categoria: "Financeira", falta: "Água e esgoto não foram vistos. Sem rede, a estação de tratamento pesa no custo por lote.", relato: "A água e o esgoto foram ditos, não confirmados pela concessionária.", pedirA: "tecnico", mensagem: "Já tem rede de água e esgoto chegando na área? Sabe de alguma viabilidade pedida?" },
  { secao: 1, pergunta: "Aceita parceria?", categoria: "Geral", falta: "Não sabemos se o dono aceita parceria e em que percentual.", relato: "A parceria foi falada, mas nada assinado. Confirmar percentual e aporte.", pedirA: "proprietario", mensagem: "Você toparia parceria, sem colocar dinheiro, recebendo parte dos lotes ou das vendas?" },
  { secao: 7, pergunta: "Acesso", categoria: "Acesso", falta: "Não sabemos por onde se entra na área nem se a via é asfaltada.", relato: "O acesso foi descrito em conversa. Conferir na visita.", pedirA: "proprietario", mensagem: "Por onde se entra na área hoje? A estrada até lá é asfaltada ou de terra?" },
];

const numeros = (s: string) => [...s.matchAll(/(\d+(?:[.,]\d+)?)\s*(ha|hectares?)/gi)].map((m) => parseFloat(m[1].replace(".", "").replace(",", ".")));

export function professor(area: { hectares: number | null; checklist: Resposta[]; conversas: { id?: string; papel: string; nome: string }[] }) {
  const chk = area.checklist;
  const questoes: Questao[] = [];
  let pontos = 0;
  for (const c of CHAVES) {
    const rs = chk.filter((r) => r.secao === c.secao && r.pergunta === c.pergunta);
    const melhor = Math.max(-1, ...rs.map((r) => FONTES[r.fonte].certeza));
    const conv = area.conversas.find((x) => x.papel === c.pedirA);
    const pedir = { pedirA: conv?.nome, conversaId: conv?.id, mensagem: c.mensagem };
    if (melhor < 0) questoes.push({ categoria: c.categoria, texto: c.falta, ...pedir });
    else if (melhor < 2) {
      pontos += 0.5;
      questoes.push({ categoria: c.categoria, texto: c.relato, ...pedir });
    } else pontos += 1;
  }
  // contradição: tamanho dito nas conversas × tamanho do KMZ
  if (area.hectares) {
    for (const r of chk.filter((x) => x.fonte !== "raiox")) {
      const ha = numeros(r.resposta).find((n) => Math.abs(n - area.hectares!) / area.hectares! > 0.02);
      if (ha) {
        questoes.unshift({ categoria: "Geral", texto: `${r.ref} fala em ${ha.toLocaleString("pt-BR")} ha; o KMZ mede ${area.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha. Qual vale na matrícula?` });
        break;
      }
    }
  }
  const relatos = chk.filter((r) => FONTES[r.fonte].certeza === 1).length;
  const nota = Math.round((pontos / CHAVES.length) * 10);
  const leitura =
    nota >= 8
      ? "Os pontos que decidem o negócio têm prova. O que sobra são confirmações de rotina."
      : nota >= 5
        ? `O estudo anda, mas ${relatos} informação(ões) ainda são relato. Antes da proposta, troque relato por documento nos itens abaixo.`
        : "Ainda é cedo para concluir: faltam os itens que decidem se a área dá lote. Comece pela matrícula, pela zona e pelos córregos.";
  return { nota, leitura, questoes };
}

/* ------------------------------ documentos ------------------------------ */

export const DOCS_PADRAO: { grupo: string; nome: string }[] = [
  { grupo: "Área", nome: "KMZ da área" },
  { grupo: "Área", nome: "Fotos da área" },
  { grupo: "Área", nome: "Levantamento planialtimétrico" },
  { grupo: "Proprietário", nome: "Matrícula atualizada" },
  { grupo: "Proprietário", nome: "IPTU / CCIR" },
  { grupo: "Proprietário", nome: "RG/CPF dos proprietários" },
  { grupo: "Proprietário", nome: "Inventário / acordo dos herdeiros" },
  { grupo: "Estudos", nome: "Raio-x do terreno (Estudo 1)" },
  { grupo: "Estudos", nome: "Mercadológico de concorrentes (Estudo 2)" },
  { grupo: "Estudos", nome: "Laudo hidrológico" },
  { grupo: "Prefeitura e órgãos", nome: "Certidão de uso do solo" },
  { grupo: "Prefeitura e órgãos", nome: "Viabilidade de água e esgoto" },
  { grupo: "Prefeitura e órgãos", nome: "Diretrizes de parcelamento" },
  { grupo: "Reunião", nome: "Gravação da reunião" },
  { grupo: "Reunião", nome: "Transcrição e resumo" },
];
export const STATUS_DOC = { ok: "Recebido", pedido: "Pedido", falta: "Falta" } as const;

/* ------------------------------ cadastro ------------------------------ */

export const tituloArea = (a: { cidade: string; dono?: string | null; corretor?: string | null; nome?: string }) =>
  `${a.cidade} · ${a.dono || a.corretor || a.nome || "sem nome"}`;

export const soDigitos = (s: string) => s.replace(/\D/g, "");
/** Telefone com DDI 55 (o WhatsApp manda assim) */
export function telefoneWa(s: string) {
  const d = soDigitos(s);
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
}

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Valida o corpo do cadastro/edição de área. Dono ou corretor: pelo menos um. */
export function validarArea(b: Record<string, unknown>, parcial = false, agora = new Date()) {
  const d: Record<string, unknown> = {};
  for (const k of ["nome", "cidade", "dono", "corretor", "conclusao", "relatorio"] as const) if (k in b) d[k] = texto(b[k], k === "conclusao" ? 5000 : 200) || (k === "nome" ? "" : null);
  if ("uf" in b) d.uf = texto(b.uf, 2).toUpperCase();
  if ("hectares" in b) {
    const h = typeof b.hectares === "number" ? b.hectares : parseFloat(String(b.hectares ?? "").replace(",", "."));
    d.hectares = Number.isFinite(h) && h > 0 && h < 100000 ? h : null;
  }
  if ("etapa" in b) {
    if (!ETAPAS.some(([e]) => e === b.etapa)) return { erro: "Etapa inválida" } as const;
    d.etapa = b.etapa;
  }
  if ("situacao" in b) {
    if (!SITUACOES.some(([e]) => e === b.situacao)) return { erro: "Situação inválida" } as const;
    d.situacao = b.situacao;
    // descartar e geladeira pedem o motivo; geladeira também o tempo (pedido 20/11/2026)
    const motivo = texto(b.motivo, 1000);
    if (b.situacao === "descartada") {
      if (motivo.length < 3) return { erro: "Escreva o motivo do descarte" } as const;
      Object.assign(d, { motivoDescarte: motivo, descartadaEm: agora });
    }
    if (b.situacao === "geladeira") {
      const meses = Number(b.meses);
      if (!MESES_GELADEIRA.includes(meses as (typeof MESES_GELADEIRA)[number])) return { erro: "Escolha o tempo na geladeira" } as const;
      if (motivo.length < 3) return { erro: "Escreva o motivo da espera" } as const;
      Object.assign(d, { motivoGeladeira: motivo, geladeiraEm: agora, geladeiraAte: somarMeses(agora, meses), geladeiraAvisoEm: null });
    }
  }
  if (typeof d.relatorio === "string" && !/^https:\/\//.test(d.relatorio)) return { erro: "O link do relatório precisa começar com https://" } as const;
  if (!parcial) {
    if (!d.cidade) return { erro: "Informe a cidade" } as const;
    if (!d.dono && !d.corretor) return { erro: "Informe o proprietário ou o corretor" } as const;
    if (!d.uf || !/^[A-Z]{2}$/.test(String(d.uf))) return { erro: "UF inválida" } as const;
  }
  return { dados: d } as const;
}

/** Área citada numa mensagem ("Sítio do Pedro", "Sorocaba", "do Marcos") */
export function areaPorTexto<T extends { id: string; nome: string; cidade: string; dono: string | null; corretor: string | null }>(t: string, areas: T[]): T[] {
  const n = ` ${norm(t)} `;
  const tem = (s: string | null) => !!s && s.trim().length > 2 && n.includes(` ${norm(s.trim())}`);
  const porNome = areas.filter((a) => tem(a.nome) || tem(a.dono) || tem(a.dono?.split(" ")[0] ?? null));
  if (porNome.length) return porNome;
  return areas.filter((a) => tem(a.cidade));
}

/* ------------------------------ entradas da tela ------------------------------ */

/** Documentos: só os nomes do padrão, com status conhecido */
export function validarDocumentos(v: unknown): Record<string, keyof typeof STATUS_DOC> {
  const out: Record<string, keyof typeof STATUS_DOC> = {};
  if (!v || typeof v !== "object") return out;
  for (const d of DOCS_PADRAO) {
    const s = (v as Record<string, unknown>)[d.nome];
    if (typeof s === "string" && s in STATUS_DOC) out[d.nome] = s as keyof typeof STATUS_DOC;
  }
  return out;
}

export type Hipotese = { texto: string; origem: string; prova: string; status: "ok" | "pendente" | "falsa" };
export function validarHipoteses(v: unknown): Hipotese[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 60).flatMap((h) => {
    if (!h || typeof h !== "object") return [];
    const x = h as Record<string, unknown>;
    const t = texto(x.texto, 300);
    if (!t) return [];
    const status = x.status === "ok" || x.status === "falsa" ? x.status : "pendente";
    return [{ texto: t, origem: texto(x.origem, 120), prova: texto(x.prova, 200), status }];
  });
}

/**
 * "Limpar e extrair" (pedido 19/11/2026): lê a conversa exportada do WhatsApp (.txt), tira mídia, figurinha,
 * "ok", "kkk" e mensagens de sistema, e devolve só as falas com conteúdo, com quem disse e quando.
 */
export function limparConversa(txt: string): { quem: string; quando: string; texto: string }[] {
  const out: { quem: string; quando: string; texto: string }[] = [];
  const re = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4})[ ,]+(\d{1,2}:\d{2})(?::\d{2})?\]?\s*(?:-\s*)?([^:]{1,60}):\s(.*)$/;
  for (const linha of txt.slice(0, 500_000).split(/\r?\n/)) {
    const m = linha.match(re);
    if (m) out.push({ quando: m[1], quem: m[3].trim(), texto: m[4] });
    else if (out.length && linha.trim()) out[out.length - 1].texto += ` ${linha.trim()}`;
  }
  const vazio = /^(<m[ií]dia oculta>|<media omitted>|.*\(arquivo anexado\)|mensagem apagada|this message was deleted|figurinha omitida|ok+|blz|beleza|kk+|rs+|👍|obrigad[oa]|bom dia|boa tarde|boa noite)\.?!?$/i;
  return out.filter((f) => f.texto.trim().length > 12 && !vazio.test(f.texto.trim()));
}

/** Acabamento sem IA: espaços, primeira letra maiúscula e ponto final */
export function arrumarSimples(t: string) {
  const s = t.replace(/\s+/g, " ").trim();
  if (!s) return s;
  const c = s[0].toUpperCase() + s.slice(1);
  return /[.!?…)]$/.test(c) ? c : `${c}.`;
}
