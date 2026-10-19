import type { Metadata } from "next";
import Script from "next/script";
import { Montserrat, Open_Sans } from "next/font/google";
import { CookieBar } from "@/components/site/CookieBar";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SITE_URL, WHATSAPP_URL } from "@/components/site/content";
import { WhatsappSquare } from "@/components/site/icons";
import "./site.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["200", "400", "500", "600", "700", "800"],
  variable: "--s-font-title",
  display: "swap",
});
const openSans = Open_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--s-font-body", display: "swap" });

const DESCRICAO =
  "JBL Incorporadora Loteamentos planejados com infraestrutura completa. Perfeito para viver os seus sonhos, seguro para investir o seu capital.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Home | JBL INCORPORADORA", template: "%s | JBL INCORPORADORA" },
  description: DESCRICAO,
  robots: { index: true, follow: true },
  openGraph: { type: "website", locale: "pt_BR", siteName: "JBL INCORPORADORA", description: DESCRICAO },
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

// Topo, rodapé, WhatsApp e cookies ficam no layout: carregam uma vez e
// persistem entre as páginas (a navegação interna troca só o conteúdo).
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${montserrat.variable} ${openSans.variable}`}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="s-wa" aria-label="Fale conosco pelo WhatsApp">
        <WhatsappSquare />
      </a>
      <CookieBar />
      {/* Analytics só depois que a página terminou de carregar. */}
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="lazyOnload" />
      <Script id="gtag" strategy="lazyOnload">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </div>
  );
}
