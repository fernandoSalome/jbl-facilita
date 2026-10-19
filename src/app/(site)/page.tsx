import Link from "next/link";
import { CartoesAtuacao, Titulo } from "@/components/site/blocos";
import { SiteImg } from "@/components/site/SiteImg";
import { DEPOIMENTOS, DIFERENCIAIS, FOTO_QUEM_SOMOS, GALERIA, NOTICIAS, QUEM_SOMOS_TEXTO, WHATSAPP_URL } from "@/components/site/content";
import { DiferencialIcon, IconHome, IconWhatsapp } from "@/components/site/icons";

export const dynamic = "force-static";
export const metadata = { alternates: { canonical: "/" } };

export default function SitePage() {
  const [destaque, ...outras] = NOTICIAS;
  return (
    <>
      {/* HERO */}
      <section className="s-hero">
        <SiteImg
          img={{ name: "hero", widths: [828, 1280, 1672], w: 1672, h: 941 }}
          sizes="100vw"
          className="s-bg"
          priority
        />
        <div className="s-hero__content">
          <h1>JBL Incorporadora</h1>
          <p>
            Loteamentos planejados com infraestrutura completa. Perfeito para viver os seus sonhos, seguro para investir
            o seu capital.
          </p>
          <div className="s-hero__buttons">
            <Link href="/empresas-do-grupo" className="s-hbtn s-hbtn--primary">
              <IconHome className="s-ico" />
              Empresas do Grupo
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="s-hbtn s-hbtn--secondary">
              <IconWhatsapp className="s-ico" />
              Fale Conosco
            </a>
          </div>
        </div>
      </section>

      {/* ATUAÇÕES */}
      <section className="s-sec">
        <div className="s-box">
          <Titulo titulo="Atuações" />
          <CartoesAtuacao />
          <div className="s-center">
            <Link href="/atuacao" className="s-btn">
              <IconHome className="s-ico" />
              Ver Atuações
            </Link>
          </div>
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="s-sec s-sec--diferenciais">
        <div className="s-box">
          <div className="s-dif__header">
            <div className="s-dif__eyebrow">Por que escolher a JBL</div>
            <h2 className="s-dif__titulo">
              Diferenciais que geram <span>valor em cada projeto</span>
            </h2>
          </div>
          <div className="s-dif__grid">
            {DIFERENCIAIS.map((d) => (
              <article key={d.title} className="s-dif">
                <div className="s-dif__icone">
                  <DiferencialIcon name={d.icon} />
                </div>
                <h3 className="s-dif__nome">{d.title}</h3>
                <p className="s-dif__texto">{d.text}</p>
                <div className="s-dif__linha" aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* QUEM SOMOS */}
      <section className="s-quem">
        <div className="s-quem__texto">
          <SiteImg img={FOTO_QUEM_SOMOS} sizes="(max-width: 1024px) 100vw, 50vw" className="s-bg" />
          <div className="s-quem__inner">
            <h6>JBL Incorporadora</h6>
            <h2>Quem Somos</h2>
            <p>
              {QUEM_SOMOS_TEXTO.p1}
              <br />
              {QUEM_SOMOS_TEXTO.p1b}
            </p>
            <p>{QUEM_SOMOS_TEXTO.p2}</p>
            <Link href="/quem-somos" className="s-btn">
              Saiba Mais
            </Link>
          </div>
        </div>
        <div className="s-quem__foto">
          <SiteImg img={GALERIA[0]} sizes="(max-width: 1024px) 100vw, 50vw" className="s-bg" />
        </div>
      </section>

      {/* PUBLICAÇÕES */}
      <section className="s-sec">
        <div className="s-box">
          <Titulo titulo="Publicações" />
          <div className="s-posts">
            <Link href={`/${destaque.slug}`} className="s-post s-post--destaque">
              <span className="s-post__media">
                <SiteImg img={destaque.img} sizes="(max-width: 767px) 100vw, 700px" />
              </span>
              <span className="s-post__content">
                <h3 className="s-post__title">{destaque.title}</h3>
                <span className="s-post__summary">{destaque.resumo}</span>
                <span className="s-card__link">
                  Leia a publicação <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
            <div className="s-posts__lado">
              {outras.map((p) => (
                <Link key={p.slug} href={`/${p.slug}`} className="s-post s-post--lado">
                  <span className="s-post__media">
                    <SiteImg img={p.img} sizes="(max-width: 767px) 100vw, 400px" />
                  </span>
                  <span className="s-post__content">
                    <h3 className="s-post__title">{p.title}</h3>
                    <span className="s-post__summary">{p.resumo}</span>
                    <span className="s-card__link">
                      Leia mais <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <div className="s-center">
            <Link href="/publicacoes" className="s-btn">
              Ver Publicações
            </Link>
          </div>
        </div>
      </section>

      {/* GALERIA */}
      <section className="s-galeria" aria-label="Galeria">
        {GALERIA.map((g) => (
          <div key={g.name} className="s-galeria__item">
            <SiteImg img={g} sizes="(max-width: 767px) 100vw, 25vw" className="s-bg" />
          </div>
        ))}
      </section>

      {/* DEPOIMENTOS */}
      <section className="s-sec">
        <div className="s-box">
          <Titulo titulo="Depoimentos" />
          <div className="s-depos">
            {DEPOIMENTOS.map((d) => (
              <article key={d.nome} className="s-depo">
                <span className="s-depo__quote" aria-hidden="true">
                  “
                </span>
                <div className="s-depo__texto">{d.texto}</div>
                <footer>
                  <div className="s-depo__stars" aria-label="5 de 5 estrelas">
                    ★★★★★
                  </div>
                  <strong className="s-depo__nome">{d.nome}</strong>
                </footer>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
