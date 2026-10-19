// Conteúdo do site institucional (home de jblincorporadora.com.br).
// As páginas internas ainda vivem no WordPress, então os links apontam para lá.
export const WP = "https://jblincorporadora.com.br";

export const WHATSAPP_URL =
  "https://api.whatsapp.com/send/?phone=5569992328387&text=Ol%C3%A1%21Vim+atrav%C3%A9s+do+site+e+gostaria+de+mais+informa%C3%A7%C3%B5es.https%3A%2F%2Fjblincorporadora.com.br%2F&type=phone_number&app_absent=0";

export const MENU = [
  { label: "Home", href: "/" },
  { label: "Quem Somos", href: `${WP}/quem-somos/` },
  { label: "Atuação", href: `${WP}/atuacao/` },
  { label: "Empresas do Grupo", href: `${WP}/empresas-do-grupo/` },
  { label: "Publicações", href: `${WP}/publicacoes/` },
];

export const CONTATO_URL = `${WP}/contato`;

/** Imagem otimizada em public/site/img: `${nome}-${largura}.webp`. */
export type SiteImage = { name: string; widths: number[]; w: number; h: number };

export const ATUACOES: { title: string; text: string; href: string; img: SiteImage }[] = [
  {
    title: "Incorporação",
    text: "Como incorporadora, desenvolvemos e estruturamos projetos de loteamento voltados à criação de novos espaços para moradia e investimento. Nosso…",
    href: `${WP}/atuacao/incorporacao/`,
    img: { name: "incorporacao", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
  {
    title: "Comercialização de Lotes",
    text: "Nosso foco está na comercialização de lotes, conectando clientes a oportunidades imobiliárias que podem representar segurança e potencial de…",
    href: `${WP}/atuacao/comercializacao-de-lotes/`,
    img: { name: "comercializacao", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
  {
    title: "Investimento Imobiliário",
    text: "Os lotes podem ser uma alternativa para quem busca diversificar seu patrimônio ou investir pensando no futuro. Apresentamos oportunidades em…",
    href: `${WP}/atuacao/investimento-imobiliario/`,
    img: { name: "investimento", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
  {
    title: "Aquisição de Áreas",
    text: "Adquirimos áreas a partir de 40.000 m² (4 hectares) a preços justos ou estabelecemos parcerias, sem ou com aporte financeiro. Consulte-nos!Atuamos em…",
    href: `${WP}/atuacao/financiamento-proprio-sem-burocracia/`,
    img: { name: "aquisicao", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
  {
    title: "Loteamentos",
    text: "Encontre o terreno ideal para sua casa ou investimento. Ruas pavimentadas, esgotamento sanitário, energia, água tratada, áreas de lazer e amplas…",
    href: `${WP}/atuacao/loteamentos/`,
    img: { name: "loteamentos", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
  {
    title: "JBL Financiamento",
    text: "É uma empresa do grupo que disponibiliza aos seus adquirentes financiamento próprio com a JBL Incorporadora e Urbanismo, sem burocracia.",
    href: `${WP}/atuacao/jbl-financiamento/`,
    img: { name: "financiamento", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
];

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

export const PUBLICACOES: { title: string; text: string; href: string; cta: string; img: SiteImage }[] = [
  {
    title: "Segurança jurídica em cada negociação",
    text: "Acompanhamento documental completo, escritura e matrícula do imóvel. Nossa equipe cuida de todas as etapas para que sua compra seja segura. Invista com quem entende de loteamento…",
    href: `${WP}/noticias-02/`,
    cta: "Leia a publicação",
    img: { name: "pub-seguranca", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
  {
    title: "Oportunidades em loteamentos com valorização garantida",
    text: "Adquira seu terreno e veja seu patrimônio crescer. Projetos aprovados, localização estratégica e condições facilitadas. JBL Incorporadora é a escolha certa para investir no…",
    href: `${WP}/noticias-03/`,
    cta: "Leia mais",
    img: { name: "pub-oportunidades", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
  {
    title: "Loteamentos planejados com infraestrutura completa",
    text: "Encontre o terreno ideal para sua casa ou investimento. Ruas pavimentadas, esgotamento sanitário, energia, água tratada, áreas de lazer e amplas áreas verdes. A JBL Incorporadora…",
    href: `${WP}/noticias-01/`,
    cta: "Leia mais",
    img: { name: "pub-loteamentos", widths: [480, 800, 1200], w: 1376, h: 768 },
  },
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
  { label: "Quem Somos", href: `${WP}/quem-somos/` },
  { label: "Termos de Uso", href: `${WP}/termos-de-uso` },
  { label: "Política de Privacidade", href: `${WP}/politica-de-privacidade` },
];

export const RODAPE_PAGINAS = [
  { label: "Home", href: "/" },
  { label: "Atuação", href: `${WP}/atuacao` },
  { label: "Empresas do Grupo", href: `${WP}/empresas-do-grupo/` },
  { label: "Publicação", href: `${WP}/publicacao` },
  { label: "Contato", href: CONTATO_URL },
];
