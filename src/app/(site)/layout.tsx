import type { Metadata } from "next";
import Script from "next/script";
import { Montserrat, Open_Sans } from "next/font/google";
import "./site.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "400", "500", "600", "700", "800"],
  variable: "--s-font-title",
  display: "swap",
});
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--s-font-body", display: "swap" });

const DESCRICAO =
  "JBL Incorporadora Loteamentos planejados com infraestrutura completa. Perfeito para viver os seus sonhos, seguro para investir o seu capital. Empresas do";

export const metadata: Metadata = {
  title: "Home | JBL INCORPORADORA",
  description: DESCRICAO,
  robots: { index: true, follow: true },
  alternates: { canonical: "https://jblincorporadora.com.br/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    title: "Home | JBL INCORPORADORA",
    description: DESCRICAO,
    url: "https://jblincorporadora.com.br/",
    siteName: "JBL INCORPORADORA",
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: [
      { url: "/site/img/favicon-32x32.png", sizes: "32x32" },
      { url: "/site/img/favicon-192x192.png", sizes: "192x192" },
    ],
    apple: "/site/img/favicon-180x180.png",
  },
};

const GA_ID = "GT-5DCT6KWH";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${montserrat.variable} ${openSans.variable}`}>
      {children}
      {/* Analytics só depois que a página terminou de carregar: não atrasa a renderização. */}
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
      <Script id="gtag" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </div>
  );
}
