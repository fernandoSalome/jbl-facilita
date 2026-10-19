import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogSidebar, NavPosts } from "@/components/site/blocos";
import { SiteImg } from "@/components/site/SiteImg";
import { NOTICIAS } from "@/components/site/content";

// Publicações ficam na raiz (/noticias-01), como no WordPress. Qualquer outro caminho dá 404.
export const dynamicParams = false;
export const generateStaticParams = () => NOTICIAS.map((n) => ({ noticia: n.slug }));

export function generateMetadata({ params }: { params: { noticia: string } }) {
  const n = NOTICIAS.find((x) => x.slug === params.noticia);
  return n ? { title: n.title, description: n.texto, alternates: { canonical: `/${n.slug}` } } : {};
}

export default function NoticiaPage({ params }: { params: { noticia: string } }) {
  const n = NOTICIAS.find((x) => x.slug === params.noticia);
  if (!n) notFound();
  // Navegação em ordem cronológica (a lista está da mais nova para a mais antiga).
  const ordem = [...NOTICIAS].reverse();
  const i = ordem.indexOf(n);
  const link = (x?: (typeof NOTICIAS)[number]) => x && { href: `/${x.slug}`, title: x.title };

  return (
    <section className="s-blog">
      <div className="s-blog__grid">
        <article className="s-blog__main">
          <div className="s-blog__foto">
            <SiteImg img={n.img} sizes="(max-width: 921px) 100vw, 780px" priority />
          </div>
          <h1 className="s-blog__titulo">{n.title}</h1>
          <div className="s-blog__meta">
            / <Link href="/publicacoes">Noticias</Link> / {n.data}
          </div>
          <p>{n.texto}</p>
          <hr />
          <NavPosts rotulo="Post" anterior={link(ordem[i - 1])} seguinte={link(ordem[i + 1])} />
        </article>
        <BlogSidebar />
      </div>
    </section>
  );
}
