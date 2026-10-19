import { CartoesAtuacao, PageBanner } from "@/components/site/blocos";
import { BANNERS, WHATSAPP_URL } from "@/components/site/content";
import { IconWhatsapp } from "@/components/site/icons";

export const dynamic = "force-static";
export const metadata = { title: "Atuação", alternates: { canonical: "/atuacao" } };

export default function AtuacaoPage() {
  return (
    <>
      <PageBanner titulo="Atuação" img={BANNERS.atuacao} />
      <section className="s-sec s-sec--cinza">
        <div className="s-box">
          <CartoesAtuacao />
          <div className="s-center">
            <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="s-btn">
              <IconWhatsapp className="s-ico" />
              Entre em Contato
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
