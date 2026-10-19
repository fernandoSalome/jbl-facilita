"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MENU } from "./content";

// Páginas com banner fotográfico no topo: o cabeçalho fica transparente por cima dele.
const COM_BANNER = ["/", "/quem-somos", "/atuacao", "/empresas-do-grupo", "/contato"];

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [pathname]);

  const ativo = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const transparente = COM_BANNER.includes(pathname);

  return (
    <header className={`s-header${transparente ? "" : " s-header--solido"}`}>
      <div className="s-header__bar">
        <Link href="/" className="s-header__logo" aria-label="JBL Incorporadora">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/site/img/logo-240.webp"
            srcSet="/site/img/logo-240.webp 1x, /site/img/logo-480.webp 2x"
            width={200}
            height={144}
            alt="JBL INCORPORADORA"
            fetchPriority="high"
          />
        </Link>
        <nav className="s-header__nav" aria-label="Menu principal">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} className={ativo(m.href) ? "is-current" : undefined}>
              {m.label}
            </Link>
          ))}
        </nav>
        <Link href="/contato" className="s-header__cta">
          Contato
        </Link>
        <a href="/login" className="s-header__portal">
          Portal
        </a>
        <Link href="/portal-cliente" className="s-header__portal">
          Portal Cliente
        </Link>
        <button
          type="button"
          className="s-header__toggle"
          aria-expanded={aberto}
          aria-label="Abrir menu"
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z" />
            </svg>
          )}
        </button>
      </div>
      {aberto && (
        <nav className="s-header__mobile" aria-label="Menu">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href}>
              {m.label}
            </Link>
          ))}
          <Link href="/contato">Contato</Link>
          <a href="/login">Portal</a>
          <Link href="/portal-cliente">Portal Cliente</Link>
        </nav>
      )}
    </header>
  );
}
