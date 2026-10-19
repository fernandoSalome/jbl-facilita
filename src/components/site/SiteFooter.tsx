import Link from "next/link";
import { CONTATO, REDES, RODAPE_INSTITUCIONAL, RODAPE_PAGINAS } from "./content";
import { IconCaret, IconEnvelope, IconPhone, IconPin } from "./icons";

export function SiteFooter() {
  return (
    <footer className="s-footer">
      <div className="s-footer__grid">
        <div className="s-footer__marca">
          <Link href="/" aria-label="JBL Incorporadora">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/site/img/logo-480.webp" width={200} height={144} alt="grupo jbl" loading="lazy" decoding="async" />
          </Link>
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
                <Link href={l.href}>
                  <IconCaret className="s-footer__ico" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="s-footer__col">
          <h4>Páginas</h4>
          <ul>
            {RODAPE_PAGINAS.map((l) => (
              <li key={l.label}>
                <Link href={l.href}>
                  <IconCaret className="s-footer__ico" />
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="s-footer__col">
          <h4>Contato</h4>
          <ul>
            <li>
              <a href={CONTATO.telefoneHref}>
                <IconPhone className="s-footer__ico" />
                {CONTATO.telefone}
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTATO.email}`}>
                <IconEnvelope className="s-footer__ico" />
                {CONTATO.email}
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
  );
}
