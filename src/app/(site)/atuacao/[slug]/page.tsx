import { notFound } from "next/navigation";
import { NavPosts } from "@/components/site/blocos";
import { SiteImg } from "@/components/site/SiteImg";
import { ATUACOES } from "@/components/site/content";

export const dynamicParams = false;
export const generateStaticParams = () => ATUACOES.map((a) => ({ slug: a.slug }));

export function generateMetadata({ params }: { params: { slug: string } }) {
  const a = ATUACOES.find((x) => x.slug === params.slug);
  return a ? { title: a.title, description: a.texto[0], alternates: { canonical: `/atuacao/${a.slug}` } } : {};
}

export default function AtuacaoDetalhe({ params }: { params: { slug: string } }) {
  const i = ATUACOES.findIndex((x) => x.slug === params.slug);
  if (i < 0) notFound();
  const a = ATUACOES[i];
  const link = (x?: (typeof ATUACOES)[number]) => x && { href: `/atuacao/${x.slug}`, title: x.title };

  return (
    <section className="s-single">
      <div className="s-single__box">
        <div className="s-single__foto">
          <SiteImg img={a.img} sizes="(max-width: 1000px) 100vw, 950px" priority />
        </div>
        <article className="s-single__card">
          <h1>{a.title}</h1>
          {a.texto.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </article>
        <NavPosts rotulo="Atuação" anterior={link(ATUACOES[i - 1])} seguinte={link(ATUACOES[i + 1])} />
      </div>
    </section>
  );
}
