import { CookieBar } from "@/components/site/CookieBar";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteImg } from "@/components/site/SiteImg";
import {
  ATUACOES,
  DEPOIMENTOS,
  DIFERENCIAIS,
  GALERIA,
  PUBLICACOES,
  REDES,
  RODAPE_INSTITUCIONAL,
  RODAPE_PAGINAS,
  WHATSAPP_URL,
  WP,
} from "@/components/site/content";
import {
  DiferencialIcon,
  IconCaret,
  IconEnvelope,
  IconHome,
  IconPhone,
  IconPin,
  IconWhatsapp,
  WhatsappSquare,
} from "@/components/site/icons";

// Página 100% estática: gerada no build, sem banco nem sessão.
export const dynamic = "force-static";

function Titulo({ titulo, claro = false }: { titulo: string; claro?: boolean }) {
  return (
    <div className={`s-titulo${claro ? " s-titulo--claro" : ""}`}>
      <h6>JBL Incorporadora</h6>
      <h2>{titulo}</h2>
    </div>
  );
}

export default function SitePage() {
  const [destaque, ...outras] = PUBLICACOES;
  return (
    <>
      <SiteHeader />
      <main>
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
              Loteamentos planejados com infraestrutura completa. Perfeito para viver os seus sonhos, seguro para
              investir o seu capital.
            </p>
            <div className="s-hero__buttons">
              <a href={`${WP}/empresas-do-grupo/`} className="s-hbtn s-hbtn--primary">
                <IconHome className="s-ico" />
                Empresas do Grupo
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="s-hbtn s-hbtn--secondary">
                <IconWhatsapp className="s-ico" />
                Fale Conosco
              </a>
            </div>
          </div>
        </section>

        {/* ATUAÇÕES */}
        <section className="s-sec s-sec--atuacoes">
          <div className="s-box">
            <Titulo titulo="Atuações" />
            <div className="s-cards">
              {ATUACOES.map((a) => (
                <a key={a.title} href={a.href} className="s-card">
                  <span className="s-card__media">
                    <SiteImg img={a.img} sizes="(max-width: 767px) 100vw, (max-width: 1024px) 50vw, 380px" />
                  </span>
                  <span className="s-card__content">
                    <h3 className="s-card__title">{a.title}</h3>
                    <span className="s-card__summary">{a.text}</span>
                    <span className="s-card__link">
                      Conheça esta atuação <span aria-hidden="true">→</span>
                    </span>
                  </span>
                </a>
              ))}
            </div>
            <div className="s-center">
              <a href={`${WP}/atuacao`} className="s-btn">
                <IconHome className="s-ico" />
                Ver Atuações
              </a>
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
            <SiteImg img={{ name: "quem-somos", widths: [480, 896], w: 896, h: 1200 }} sizes="(max-width: 1024px) 100vw, 50vw" className="s-bg" />
            <div className="s-quem__inner">
              <h6>JBL Incorporadora</h6>
              <h2>Quem Somos</h2>
              <p>
                A JBL Incorporadora é especializada em loteamento, atuando na transformação de grandes áreas em espaços
                planejados para a realização do sonho da casa própria ou do investimento seguro. Nosso foco é exclusivo
                na comercialização de lotes – não realizamos construção de prédios, mas sim a preparação e
                infraestrutura de terrenos que possibilitam a você construir o imóvel dos seus sonhos, de acordo com suas
                necessidades e estilo de vida.
                <br />
                Trabalhamos com projetos de loteamento que incluem ruas pavimentadas, esgotamento sanitário, iluminação
                pública, energia elétrica, água tratada, áreas de lazer e amplas áreas verdes, garantindo que o terreno
                adquirido esteja pronto para receber sua construção.
              </p>
              <p>
                Nossa equipe acompanha todas as etapas, desde a aprovação do projeto junto aos órgãos públicos até a
                entrega da escritura e matrícula do imóvel, oferecendo transparência e segurança jurídica em cada
                negociação.
              </p>
              <a href={`${WP}/quem-somos`} className="s-btn">
                Saiba Mais
              </a>
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
              <a href={destaque.href} className="s-post s-post--destaque">
                <span className="s-post__media">
                  <SiteImg img={destaque.img} sizes="(max-width: 767px) 100vw, 700px" />
                </span>
                <span className="s-post__content">
                  <h3 className="s-post__title">{destaque.title}</h3>
                  <span className="s-post__summary">{destaque.text}</span>
                  <span className="s-card__link">
                    {destaque.cta} <span aria-hidden="true">→</span>
                  </span>
                </span>
              </a>
              <div className="s-posts__lado">
                {outras.map((p) => (
                  <a key={p.title} href={p.href} className="s-post s-post--lado">
                    <span className="s-post__media">
                      <SiteImg img={p.img} sizes="(max-width: 767px) 100vw, 400px" />
                    </span>
                    <span className="s-post__content">
                      <h3 className="s-post__title">{p.title}</h3>
                      <span className="s-post__summary">{p.text}</span>
                      <span className="s-card__link">
                        {p.cta} <span aria-hidden="true">→</span>
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
            <div className="s-center">
              <a href={`${WP}/publicacoes`} className="s-btn">
                Ver Publicações
              </a>
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
      </main>

      {/* RODAPÉ */}
      <footer className="s-footer">
        <div className="s-footer__grid">
          <div className="s-footer__marca">
            <a href="/" aria-label="JBL Incorporadora">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/site/img/logo-480.webp" width={200} height={144} alt="grupo jbl" loading="lazy" decoding="async" />
            </a>
            <div className="s-footer__redes">
              {REDES.map((r) => (
                <a key={r.label} href={r.href} target="_blank" rel="noopener" aria-label={r.label}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/site/img/icon-${r.icon}-80.webp`} width={40} height={40} alt="" loading="lazy" decoding="async" />
                </a>
              ))}
            </div>
          </div>
          <div className="s-footer__col">
            <h4>Institucional</h4>
            <ul>
              {RODAPE_INSTITUCIONAL.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>
                    <IconCaret className="s-footer__ico" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="s-footer__col">
            <h4>Páginas</h4>
            <ul>
              {RODAPE_PAGINAS.map((l) => (
                <li key={l.label}>
                  <a href={l.href}>
                    <IconCaret className="s-footer__ico" />
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="s-footer__col">
            <h4>Contato</h4>
            <ul>
              <li>
                <a href="tel:1121102731">
                  <IconPhone className="s-footer__ico" />
                  (11) 2110 - 2731
                </a>
              </li>
              <li>
                <a href="mailto:contato@jblincorporadora.com.br">
                  <IconEnvelope className="s-footer__ico" />
                  contato@jblincorporadora.com.br
                </a>
              </li>
              <li>
                <span>
                  <IconPin className="s-footer__ico" />
                  <span>
                    Alameda Rio Negro, n.º 503, Cj. 2011
                    <br />
                    20º Andar – Alphaville Empresarial
                    <br />
                    Barueri/SP
                  </span>
                </span>
              </li>
            </ul>
          </div>
        </div>
        <div className="s-footer__copy">
          Copyright © 2026 JBL INCORPORADORA | Desenvolvido por{" "}
          <a href="https://brainsistemas.com.br/" target="_blank" rel="noopener">
            @Brain Sistemas
          </a>
        </div>
      </footer>

      <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="s-wa" aria-label="Fale conosco pelo WhatsApp">
        <WhatsappSquare />
      </a>
      <CookieBar />
    </>
  );
}
