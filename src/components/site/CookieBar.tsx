"use client";

import { useEffect, useState } from "react";
import { WP } from "./content";

const KEY = "viewed_cookie_policy";

export function CookieBar() {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      setVisivel(localStorage.getItem(KEY) !== "yes");
    } catch {
      setVisivel(true);
    }
  }, []);

  if (!visivel) return null;
  return (
    <div className="s-cookie" role="dialog" aria-label="Aviso de cookies">
      <div>
        <strong>Nós utilizamos cookies</strong>
        <p>
          Eles são usados para aprimorar a sua experiência. Ao clicar em &quot;Aceitar&quot; ou continuar na página,
          você concorda com nosso <a href={`${WP}/termos-de-uso`}>Termos de Uso</a> e{" "}
          <a href={`${WP}/politica-de-privacidade`}>Política de Privacidade</a>.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "yes");
          } catch {}
          setVisivel(false);
        }}
      >
        Aceitar
      </button>
    </div>
  );
}
