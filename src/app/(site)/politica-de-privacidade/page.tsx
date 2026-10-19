import { POLITICA_DE_PRIVACIDADE } from "@/components/site/legal";

export const dynamic = "force-static";
export const metadata = { title: "Política de Privacidade", alternates: { canonical: "/politica-de-privacidade" } };

export default function PrivacidadePage() {
  return (
    <section className="s-legal">
      <article className="s-legal__card">
        <h1 className="sr-only">Política de Privacidade</h1>
        <div dangerouslySetInnerHTML={{ __html: POLITICA_DE_PRIVACIDADE }} />
      </article>
    </section>
  );
}
