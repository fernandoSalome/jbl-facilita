import Link from "next/link";
import { BlogSidebar } from "@/components/site/blocos";
import { SiteImg } from "@/components/site/SiteImg";
import { NOTICIAS } from "@/components/site/content";

export const metadata = { title: "Publicações", alternates: { canonical: "/publicacoes" } };

const normaliza = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Busca (?s=) e arquivo por mês (?mes=) filtram a lista em memória: sem banco.
export default function PublicacoesPage({ searchParams }: { searchParams: { s?: string; mes?: string } }) {
  const busca = (searchParams.s || "").trim();
  const lista = NOTICIAS.filter(
    (n) =>
      (!searchParams.mes || n.mes === searchParams.mes) &&
      (!busca || normaliza(`${n.title} ${n.texto}`).includes(normaliza(busca))),
  );

  return (
    <section className="s-blog">
      <div className="s-blog__grid">
        <div className="s-blog__main">
          {busca && <h1 className="s-blog__aviso">Resultados da pesquisa por: {busca}</h1>}
          {lista.length === 0 && <p>Nada encontrado. Tente pesquisar com outras palavras.</p>}
          {lista.map((n, i) => (
            <article key={n.slug} className="s-blog__item">
              <Link href={`/${n.slug}`} className="s-blog__foto">
                <SiteImg img={n.img} sizes="(max-width: 921px) 100vw, 780px" priority={i === 0} />
              </Link>
              <h2>
                <Link href={`/${n.slug}`}>{n.title}</Link>
              </h2>
              <div className="s-blog__meta">
                <Link href="/publicacoes">Noticias</Link> / {n.data}
              </div>
              <p>{n.texto}</p>
              <Link href={`/${n.slug}`} className="s-blog__mais">
                Leia Mais »
              </Link>
            </article>
          ))}
        </div>
        <BlogSidebar busca={busca} />
      </div>
    </section>
  );
}
