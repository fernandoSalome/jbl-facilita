import Link from "next/link";
import { ARQUIVOS, ATUACOES_CARTOES, NOTICIAS, type SiteImage } from "./content";
import { SiteImg } from "./SiteImg";

/** Banner de topo das páginas internas (foto + película escura + título). */
export function PageBanner({ titulo, img }: { titulo: string; img: SiteImage }) {
  return (
    <section className="s-banner">
      <SiteImg img={img} sizes="100vw" className="s-bg" priority />
      <h1>{titulo}</h1>
    </section>
  );
}

/** Título de seção "JBL Incorporadora / Título". */
export function Titulo({ titulo }: { titulo: string }) {
  return (
    <div className="s-titulo">
      <h6>JBL Incorporadora</h6>
      <h2>{titulo}</h2>
    </div>
  );
}

export function CartoesAtuacao() {
  return (
    <div className="s-cards">
      {ATUACOES_CARTOES.map((a) => (
        <Link key={a.slug} href={`/atuacao/${a.slug}`} className="s-card">
          <span className="s-card__media">
            <SiteImg img={a.img} sizes="(max-width: 767px) 100vw, (max-width: 1024px) 50vw, 400px" />
          </span>
          <span className="s-card__content">
            <h3 className="s-card__title">{a.title}</h3>
            <span className="s-card__summary">{a.resumo}</span>
            <span className="s-card__link">
              Conheça esta atuação <span aria-hidden="true">→</span>
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Navegação "anterior / seguinte" no fim das páginas de atuação e publicação. */
export function NavPosts({
  anterior,
  seguinte,
  rotulo,
}: {
  anterior?: { href: string; title: string };
  seguinte?: { href: string; title: string };
  rotulo: "Atuação" | "Post";
}) {
  return (
    <nav className="s-postnav" aria-label="Navegação">
      {anterior ? (
        <Link href={anterior.href} title={anterior.title}>
          <span aria-hidden="true">←</span> {rotulo} anterior
        </Link>
      ) : (
        <span />
      )}
      {seguinte && (
        <Link href={seguinte.href} title={seguinte.title}>
          {rotulo} seguinte <span aria-hidden="true">→</span>
        </Link>
      )}
    </nav>
  );
}

/** Barra lateral do blog: busca, últimas postagens, categorias e arquivos. */
export function BlogSidebar({ busca = "" }: { busca?: string }) {
  return (
    <aside className="s-sidebar">
      <form action="/publicacoes" className="s-busca" role="search">
        <label htmlFor="s-busca" className="sr-only">
          Pesquisar
        </label>
        <input id="s-busca" type="search" name="s" defaultValue={busca} />
        <button type="submit" aria-label="Pesquisar">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M13 5c-3.3 0-6 2.7-6 6 0 1.4.5 2.7 1.3 3.7l-3.8 3.8 1.1 1.1 3.8-3.8c1 .8 2.3 1.3 3.7 1.3 3.3 0 6-2.7 6-6S16.3 5 13 5zm0 10.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z" />
          </svg>
        </button>
      </form>
      <h3>Últimas Postagens</h3>
      <ul className="s-sidebar__lista">
        {NOTICIAS.map((n) => (
          <li key={n.slug}>
            <Link href={`/${n.slug}`}>{n.title}</Link>
          </li>
        ))}
      </ul>
      <h3>Categorias</h3>
      <ul className="s-sidebar__lista s-sidebar__lista--links">
        <li>
          <Link href="/publicacoes">Noticias</Link> ({NOTICIAS.length})
        </li>
      </ul>
      <h3>Arquivos</h3>
      <ul className="s-sidebar__lista s-sidebar__lista--links">
        {ARQUIVOS.map((a) => (
          <li key={a.mes}>
            <Link href={`/publicacoes?mes=${a.mes}`}>{a.label}</Link> ({NOTICIAS.filter((n) => n.mes === a.mes).length})
          </li>
        ))}
      </ul>
    </aside>
  );
}
