"use client";

import { useState } from "react";

/** Campo de senha com o "olhinho" para mostrar ou esconder o que foi digitado */
export default function PasswordInput({ className = "input", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={ver ? "text" : "password"} className={`${className} pr-11`} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-navy"
        aria-label={ver ? "Esconder senha" : "Mostrar senha"}
        title={ver ? "Esconder senha" : "Mostrar senha"}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {ver && <path d="M4 4l16 16" />}
        </svg>
      </button>
    </div>
  );
}
