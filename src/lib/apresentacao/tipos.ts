/** Apresentação de custos: o que a página guarda além dos números da planilha (vale no navegador e no servidor) */
import type { DadosCustos } from "./planilha";

/** Aparência de um texto (vazio = a da página) */
export type Formato = { fonte?: string; tamanho?: number; negrito?: boolean; cor?: string; fundo?: string };

/** Aparência geral da página */
export type Estilo = {
  fonte: string;
  fonteTitulos: string;
  corPrincipal: string;
  corDestaque: string;
  corFundo: string;
  corTexto: string;
  /** logo trocada (imagem em data URL); null = a logo da JBL */
  logo: string | null;
  logoAltura: number;
};

export const ESTILO_PADRAO: Estilo = {
  fonte: "Arimo",
  fonteTitulos: "Gelasio",
  corPrincipal: "#122A45",
  corDestaque: "#C1943D",
  corFundo: "#F8F9FB",
  corTexto: "#2B3A4A",
  logo: null,
  logoAltura: 52,
};

export const FONTES = ["Arimo", "Gelasio", "Georgia", "Arial", "Helvetica", "Times New Roman", "Verdana", "Trebuchet MS"] as const;

/** Pilha de fontes de cada opção (Arimo e Gelasio vêm do próprio site) */
export const pilha = (f: string) =>
  ({ Arimo: '"Arimo", "Helvetica Neue", Arial, sans-serif', Gelasio: '"Gelasio", Georgia, serif', Georgia: "Georgia, serif", "Times New Roman": '"Times New Roman", Times, serif' } as Record<string, string>)[f] ??
  `"${f}", Arial, sans-serif`;

export type Conteudo = { dados: DadosCustos; textos: Record<string, string>; formatos: Record<string, Formato>; estilo: Estilo };

export const conteudoDe = (a: { dados: unknown; textos: unknown; formatos: unknown; estilo: unknown }): Conteudo => ({
  dados: a.dados as DadosCustos,
  textos: (a.textos ?? {}) as Record<string, string>,
  formatos: (a.formatos ?? {}) as Record<string, Formato>,
  estilo: { ...ESTILO_PADRAO, ...((a.estilo ?? {}) as Partial<Estilo>) },
});
