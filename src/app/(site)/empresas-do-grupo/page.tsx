import { PageBanner } from "@/components/site/blocos";
import { BANNERS, EMPRESAS } from "@/components/site/content";
import { EmpresaIcon } from "@/components/site/icons";

export const dynamic = "force-static";
export const metadata = { title: "Empresas do Grupo", alternates: { canonical: "/empresas-do-grupo" } };

export default function EmpresasPage() {
  return (
    <>
      <PageBanner titulo="Empresas do Grupo" img={BANNERS.empresas} />
      <section className="s-sec s-sec--cinza">
        <div className="s-box s-empresas">
          {EMPRESAS.map((e) => (
            <article key={e.nome} className="s-empresa">
              <div className="s-empresa__topo">
                <div className="s-empresa__icone">
                  <EmpresaIcon name={e.icon} />
                </div>
                <h3>{e.nome}</h3>
              </div>
              <p>{e.texto}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
