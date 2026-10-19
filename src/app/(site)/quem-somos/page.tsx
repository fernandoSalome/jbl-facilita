import { PageBanner } from "@/components/site/blocos";
import { SiteImg } from "@/components/site/SiteImg";
import { BANNERS, FOTO_QUEM_SOMOS, QUEM_SOMOS_TEXTO } from "@/components/site/content";

export const dynamic = "force-static";
export const metadata = { title: "Quem Somos", alternates: { canonical: "/quem-somos" } };

export default function QuemSomosPage() {
  return (
    <>
      <PageBanner titulo="Quem Somos" img={BANNERS.quemSomos} />
      <section className="s-sec s-sobre">
        <div className="s-box s-sobre__grid">
          <div className="s-sobre__texto">
            <h3>Sobre a JBL Incorporadora</h3>
            <p>
              {QUEM_SOMOS_TEXTO.p1}
              <br />
              {QUEM_SOMOS_TEXTO.p1b}
            </p>
            <p>{QUEM_SOMOS_TEXTO.p2}</p>
          </div>
          <div className="s-sobre__foto">
            <SiteImg img={FOTO_QUEM_SOMOS} sizes="(max-width: 1024px) 100vw, 600px" className="s-bg" />
          </div>
        </div>
      </section>
    </>
  );
}
