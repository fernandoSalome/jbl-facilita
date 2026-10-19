// Conteúdo do site institucional (copiado de jblincorporadora.com.br).
export const SITE_URL = "https://jblincorporadora.com.br";

export const WHATSAPP_NUMERO = "5569992328387";
export const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5569992328387&text=Ol%C3%A1%21Vim+atrav%C3%A9s+do+site+e+gostaria+de+mais+informa%C3%A7%C3%B5es.https%3A%2F%2Fjblincorporadora.com.br%2F&type=phone_number&app_absent=0";

export const MENU = [
  { label: "Home", href: "/" },
  { label: "Quem Somos", href: "/quem-somos" },
  { label: "Atuação", href: "/atuacao" },
  { label: "Empresas do Grupo", href: "/empresas-do-grupo" },
  { label: "Publicações", href: "/publicacoes" },
];

/** Imagem otimizada em public/site/img: `${nome}-${largura}.webp`. */
export type SiteImage = { name: string; widths: number[]; w: number; h: number };

const card = (name: string): SiteImage => ({ name, widths: [480, 800, 1200], w: 1376, h: 768 });
const banner = (name: string): SiteImage => ({ name, widths: [828, 1280, 1440, 1920], w: 2560, h: 1429 });

export const BANNERS = {
  quemSomos: banner("banner-quem-somos"),
  atuacao: banner("banner-atuacao"),
  empresas: banner("banner-empresas"),
};

export const FOTO_QUEM_SOMOS: SiteImage = { name: "quem-somos", widths: [480, 896], w: 896, h: 1200 };

/** Na ordem da navegação "anterior / seguinte" do WordPress. */
export const ATUACOES: { slug: string; title: string; resumo: string; texto: string[]; img: SiteImage }[] = [
  {
    slug: "incorporacao",
    title: "Incorporação",
    resumo:
      "Como incorporadora, desenvolvemos e estruturamos projetos de loteamento voltados à criação de novos espaços para moradia e investimento. Nosso…",
    texto: [
      "Como incorporadora, desenvolvemos e estruturamos projetos de loteamento voltados à criação de novos espaços para moradia e investimento. Nosso trabalho é realizado com planejamento e atenção a cada etapa, buscando oferecer empreendimentos organizados e com potencial de valorização.",
    ],
    img: card("incorporacao"),
  },
  {
    slug: "loteamentos",
    title: "Loteamentos",
    resumo:
      "Encontre o terreno ideal para sua casa ou investimento. Ruas pavimentadas, esgotamento sanitário, energia, água tratada, áreas de lazer e amplas…",
    texto: [
      "Encontre o terreno ideal para sua casa ou investimento. Ruas pavimentadas, esgotamento sanitário, energia, água tratada, áreas de lazer e amplas áreas verdes. A JBL Incorporadora entrega tudo pronto para sua construção. Conheça nossos loteamentos e realize seu sonho.",
    ],
    img: card("loteamentos"),
  },
  {
    slug: "comercializacao-de-lotes",
    title: "Comercialização de Lotes",
    resumo:
      "Nosso foco está na comercialização de lotes, conectando clientes a oportunidades imobiliárias que podem representar segurança e potencial de…",
    texto: [
      "Nosso foco está na comercialização de lotes, conectando clientes a oportunidades imobiliárias que podem representar segurança e potencial de valorização. Oferecemos atendimento próximo e transparente para ajudar você a encontrar o lote mais adequado às suas necessidades.",
    ],
    img: card("comercializacao"),
  },
  {
    slug: "investimento-imobiliario",
    title: "Investimento Imobiliário",
    resumo:
      "Os lotes podem ser uma alternativa para quem busca diversificar seu patrimônio ou investir pensando no futuro. Apresentamos oportunidades em…",
    texto: [
      "Os lotes podem ser uma alternativa para quem busca diversificar seu patrimônio ou investir pensando no futuro. Apresentamos oportunidades em loteamentos selecionados, auxiliando nossos clientes na escolha de terrenos que estejam alinhados aos seus objetivos.",
    ],
    img: card("investimento"),
  },
  {
    slug: "financiamento-proprio-sem-burocracia",
    title: "Aquisição de Áreas",
    resumo:
      "Adquirimos áreas a partir de 40.000 m² (4 hectares) a preços justos ou estabelecemos parcerias, sem ou com aporte financeiro. Consulte-nos!Atuamos em…",
    texto: [
      "Adquirimos áreas a partir de 40.000 m² (4 hectares) a preços justos ou estabelecemos parcerias, sem ou com aporte financeiro. Consulte-nos!",
      "Atuamos em todo o território nacional, desenvolvendo projetos ambiciosos com o máximo potencial de valorização para moradia ou investimentos.",
    ],
    img: card("aquisicao"),
  },
  {
    slug: "jbl-financiamento",
    title: "JBL Financiamento",
    resumo:
      "É uma empresa do grupo que disponibiliza aos seus adquirentes financiamento próprio com a JBL Incorporadora e Urbanismo, sem burocracia.",
    texto: [
      "É uma empresa do grupo que disponibiliza aos seus adquirentes financiamento próprio com a JBL Incorporadora e Urbanismo, sem burocracia.",
    ],
    img: card("financiamento"),
  },
];

/** Ordem dos cartões na home e na página Atuação (diferente da navegação). */
export const ATUACOES_CARTOES = [
  "incorporacao",
  "comercializacao-de-lotes",
  "investimento-imobiliario",
  "financiamento-proprio-sem-burocracia",
  "loteamentos",
  "jbl-financiamento",
].map((s) => ATUACOES.find((a) => a.slug === s)!);

export const DIFERENCIAIS: { title: string; text: string; icon: "escudo" | "local" | "plano" | "grafico" }[] = [
  {
    title: "Experiência e Segurança",
    text: "Projetos desenvolvidos com planejamento, responsabilidade e atenção a cada etapa, proporcionando mais segurança para clientes e investidores.",
    icon: "escudo",
  },
  {
    title: "Localizações Estratégicas",
    text: "Empreendimentos selecionados em regiões com potencial de crescimento, valorização imobiliária e qualidade de vida.",
    icon: "local",
  },
  {
    title: "Planejamento Completo",
    text: "Acompanhamos o desenvolvimento do projeto desde a concepção até a comercialização, garantindo maior consistência em todo o processo.",
    icon: "plano",
  },
  {
    title: "Visão de Longo Prazo",
    text: "Desenvolvemos empreendimentos pensando em valorização, infraestrutura e crescimento sustentável para construir resultados consistentes ao longo do tempo.",
    icon: "grafico",
  },
];

/** Publicações, da mais nova para a mais antiga. */
export const NOTICIAS: {
  slug: string;
  title: string;
  data: string;
  mes: string;
  resumo: string;
  texto: string;
  img: SiteImage;
}[] = [
  {
    slug: "noticias-02",
    title: "Segurança jurídica em cada negociação",
    data: "17 de maio de 2025",
    mes: "2025-05",
    resumo:
      "Acompanhamento documental completo, escritura e matrícula do imóvel. Nossa equipe cuida de todas as etapas para que sua compra seja segura. Invista com quem entende de loteamento…",
    texto:
      "Acompanhamento documental completo, escritura e matrícula do imóvel. Nossa equipe cuida de todas as etapas para que sua compra seja segura. Invista com quem entende de loteamento. Entre em contato e saiba mais.",
    img: card("pub-seguranca"),
  },
  {
    slug: "noticias-03",
    title: "Oportunidades em loteamentos com valorização garantida",
    data: "7 de maio de 2025",
    mes: "2025-05",
    resumo:
      "Adquira seu terreno e veja seu patrimônio crescer. Projetos aprovados, localização estratégica e condições facilitadas. JBL Incorporadora é a escolha certa para investir no…",
    texto:
      "Adquira seu terreno e veja seu patrimônio crescer. Projetos aprovados, localização estratégica e condições facilitadas. JBL Incorporadora é a escolha certa para investir no futuro. Solicite um orçamento.",
    img: card("pub-oportunidades"),
  },
  {
    slug: "noticias-01",
    title: "Loteamentos planejados com infraestrutura completa",
    data: "21 de dezembro de 2024",
    mes: "2024-12",
    resumo:
      "Encontre o terreno ideal para sua casa ou investimento. Ruas pavimentadas, esgotamento sanitário, energia, água tratada, áreas de lazer e amplas áreas verdes. A JBL Incorporadora…",
    texto:
      "Encontre o terreno ideal para sua casa ou investimento. Ruas pavimentadas, esgotamento sanitário, energia, água tratada, áreas de lazer e amplas áreas verdes. A JBL Incorporadora entrega tudo pronto para sua construção. Conheça nossos loteamentos e realize seu sonho.",
    img: card("pub-loteamentos"),
  },
];

export const ARQUIVOS = [
  { mes: "2025-05", label: "maio 2025" },
  { mes: "2024-12", label: "dezembro 2024" },
];

export const GALERIA: SiteImage[] = ["entrada", "lago", "beach-tennis", "rua"].map((name) => ({
  name,
  widths: [480, 896],
  w: 896,
  h: 1200,
}));

export const DEPOIMENTOS = [
  {
    nome: "Mariana Souza",
    texto:
      "Comprei um lote com a JBL Incorporadora. O terreno tem infraestrutura completa e o processo foi transparente. Recomendo a todos que buscam segurança e qualidade.",
  },
  {
    nome: "Patrícia Lima",
    texto:
      "A JBL entregou tudo o que prometeu: ruas asfaltadas, rede de esgoto e iluminação. Agora estou construindo minha casa. Empresa séria e comprometida. Nota 10!",
  },
  {
    nome: "Rafaela Oliveira",
    texto:
      "Investi em um lote e a JBL me orientou em todas as etapas. Documentação impecável e atendimento próximo. Super recomendo para quem quer construir ou investir.",
  },
];

export const EMPRESAS: { nome: string; texto: string; icon: "mapa" | "predio" | "alerta" | "seta" | "pessoas" | "recibo" }[] = [
  {
    nome: "JBL Loteadora e Urbanização",
    texto:
      "São as unidades de negócios exclusivas em desenvolvimento e urbanização de loteamentos residenciais, ecológicos, industriais, condomínios horizontais e chacreamentos com bairros planejados em que atuamos do padrão econômico ao alto padrão.",
    icon: "mapa",
  },
  {
    nome: "JBL Incorporadora",
    texto:
      "A incorporação é nossa unidade responsável pela aquisição de áreas rurais e urbanas, concepção, desenvolvimento e gestão de novos negócios em todo o território nacional.",
    icon: "predio",
  },
  {
    nome: "JBL Empreendimentos",
    texto:
      "É um braço da empresa do grupo que realiza toda criação e expansão de novos negócios e empreendimentos, os quais se diferenciam por carregar o conceito da realização, inovação e dinamismo da JBL.",
    icon: "alerta",
  },
  {
    nome: "JBL Reflorestamento",
    texto: "Empresa do grupo especializada em reflorestamento de áreas degradadas e plantios diversos.",
    icon: "seta",
  },
  {
    nome: "JBL Vendas",
    texto:
      "É uma empresa do grupo formada por equipes de corretores próprios, parceiros ou terceirizados, especializada em vender todos os produtos da JBL disponíveis para o mercado.",
    icon: "pessoas",
  },
  {
    nome: "JBL Securitizadora",
    texto:
      "É nossa unidade de negócios voltada à compra de carteira (antecipação de recebíveis) para parceiros terrenistas, corretores e prestadores de serviços quando disponível por nossa empresa ou da gama de parceiros com os quais mantemos tratativas no mercado.",
    icon: "recibo",
  },
];

export const QUEM_SOMOS_TEXTO = {
  p1: "A JBL Incorporadora é especializada em loteamento, atuando na transformação de grandes áreas em espaços planejados para a realização do sonho da casa própria ou do investimento seguro. Nosso foco é exclusivo na comercialização de lotes – não realizamos construção de prédios, mas sim a preparação e infraestrutura de terrenos que possibilitam a você construir o imóvel dos seus sonhos, de acordo com suas necessidades e estilo de vida.",
  p1b: "Trabalhamos com projetos de loteamento que incluem ruas pavimentadas, esgotamento sanitário, iluminação pública, energia elétrica, água tratada, áreas de lazer e amplas áreas verdes, garantindo que o terreno adquirido esteja pronto para receber sua construção.",
  p2: "Nossa equipe acompanha todas as etapas, desde a aprovação do projeto junto aos órgãos públicos até a entrega da escritura e matrícula do imóvel, oferecendo transparência e segurança jurídica em cada negociação.",
};

export const CONTATO = {
  telefone: "(11) 2110 - 2731",
  telefoneHref: "tel:1121102731",
  email: "contato@jblincorporadora.com.br",
  endereco: "Alameda Rio Negro, n.º 503, Cj. 2011 - 20º Andar – Alphaville Empresarial – Barueri/SP",
  mapa: "https://maps.google.com/maps?q=Alameda%20Rio%20Negro%2C%20503%2C%20Barueri%2FSP&t=m&z=15&output=embed&iwloc=near",
};

export const REDES = [
  { label: "Instagram", icon: "instagram", href: "https://www.instagram.com/jbl_incorporadora/" },
  { label: "Facebook", icon: "facebook", href: "https://www.facebook.com/share/1BuD6HjKng/?mibextid=wwXIfr" },
  { label: "YouTube", icon: "youtube", href: "https://youtube.com/@jblincorporadoraeurbanismo?si=_-M7hVRRYzh_plcI" },
  {
    label: "LinkedIn",
    icon: "linkedin",
    href: "https://www.linkedin.com/in/jbl-incorporadora-urbanismo-553154437?utm_source=share_via&utm_content=profile&utm_medium=member_ios",
  },
];

export const RODAPE_INSTITUCIONAL = [
  { label: "Quem Somos", href: "/quem-somos" },
  { label: "Termos de Uso", href: "/termos-de-uso" },
  { label: "Política de Privacidade", href: "/politica-de-privacidade" },
];

export const RODAPE_PAGINAS = [
  { label: "Home", href: "/" },
  { label: "Atuação", href: "/atuacao" },
  { label: "Empresas do Grupo", href: "/empresas-do-grupo" },
  { label: "Publicação", href: "/publicacoes" },
  { label: "Contato", href: "/contato" },
];
