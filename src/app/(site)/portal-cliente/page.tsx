import Link from "next/link";
import { WHATSAPP_URL } from "@/components/site/content";
import { IconWhatsapp } from "@/components/site/icons";

export const dynamic = "force-static";
export const metadata = { title: "Portal do Cliente", robots: { index: false } };

// Área do cliente ainda não existe: página de aviso até ela ficar pronta.
export default function PortalClientePage() {
  return (
    <section className="s-embreve">
      <div className="s-embreve__card">
        <div className="s-dif__eyebrow">Em breve</div>
        <h1>Portal do Cliente</h1>
        <p>
          Estamos preparando uma área exclusiva para nossos clientes. Enquanto ela não fica pronta, nossa equipe atende
          você pelos canais abaixo.
        </p>
        <div className="s-embreve__acoes">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener" className="s-btn">
            <IconWhatsapp className="s-ico" />
            Fale Conosco
          </a>
          <Link href="/contato" className="s-btn s-btn--contorno">
            Contato
          </Link>
        </div>
      </div>
    </section>
  );
}
