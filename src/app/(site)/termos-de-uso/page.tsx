import { TERMOS_DE_USO } from "@/components/site/legal";

export const dynamic = "force-static";
export const metadata = { title: "Termos de Uso", alternates: { canonical: "/termos-de-uso" } };

export default function TermosPage() {
  return (
    <section className="s-legal">
      <article className="s-legal__card">
        <h1 className="sr-only">Termos de Uso</h1>
        <div dangerouslySetInnerHTML={{ __html: TERMOS_DE_USO }} />
      </article>
    </section>
  );
}
