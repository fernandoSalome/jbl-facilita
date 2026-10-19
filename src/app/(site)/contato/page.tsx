import { PageBanner } from "@/components/site/blocos";
import { ContatoForm } from "@/components/site/ContatoForm";
import { BANNERS, CONTATO } from "@/components/site/content";

export const dynamic = "force-static";
export const metadata = { title: "Contato", alternates: { canonical: "/contato" } };

export default function ContatoPage() {
  return (
    <>
      <PageBanner titulo="Contato" img={BANNERS.empresas} />
      <section className="s-sec">
        <div className="s-box s-contato">
          <div className="s-contato__dados">
            <h2>Dados para Contato</h2>
            <div className="s-contato__linha" aria-hidden="true" />
            <h4>
              <a href={CONTATO.telefoneHref}>Telefone:</a>
            </h4>
            <p>{CONTATO.telefone}</p>
            <h4>
              <a href={`mailto:${CONTATO.email}`}>E-mail:</a>
            </h4>
            <p>{CONTATO.email}</p>
            <h4>Endereço</h4>
            <p>{CONTATO.endereco}</p>
          </div>
          <div className="s-contato__form">
            <ContatoForm />
          </div>
        </div>
      </section>
      <section className="s-mapa">
        {/* O mapa do Google só carrega quando a pessoa rola até ele. */}
        <iframe
          src={CONTATO.mapa}
          title="Alameda Rio Negro, 503, Barueri/SP"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    </>
  );
}
