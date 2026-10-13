import LoginForm from "./LoginForm";
import LoginArt from "./LoginArt";

export const metadata = { title: "Entrar · Portal JBL" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.25fr_1fr]">
      {/* Foto aérea: a "janela" do portal */}
      <section className="relative hidden overflow-hidden lg:block">
        <LoginArt />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/40 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-[3px] bg-gold" />
        <div className="relative flex h-full flex-col justify-between p-14 text-white">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.28em] text-gold before:h-[2px] before:w-8 before:bg-gold before:content-['']">
            Portal do Grupo JBL
          </div>
          <div className="max-w-xl">
            <h1 className="font-display text-[clamp(40px,4vw,64px)] font-normal leading-[1.06] tracking-[-0.02em]">
              Cada gleba,
              <br />
              <em className="not-italic text-gold">um bairro planejado.</em>
            </h1>
            <p className="mt-6 max-w-md text-[17px] leading-relaxed text-white/75">
              Propostas, estudos de viabilidade e o andamento de cada loteamento, reunidos em um só lugar.
            </p>
            <blockquote className="mt-10 border-l-2 border-gold pl-5 font-display text-xl italic text-white/90">
              “O empreendimento mais importante para nós é o realizado!”
              <span className="mt-1 block font-sans text-sm not-italic text-white/60">Marcelo Aguilar · Diretor de Expansão</span>
            </blockquote>
          </div>
          <div className="flex items-end justify-between text-xs text-white/50">
            <span>JBL Incorporadora e Urbanismo</span>
            <span>Alphaville Empresarial · Barueri/SP</span>
          </div>
        </div>
      </section>

      <section className="relative flex items-center justify-center bg-white px-6 py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{ backgroundImage: "radial-gradient(#ECE1C4 1px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "linear-gradient(180deg, black, transparent 55%)" }}
        />
        <div className="relative w-full max-w-sm">
          <img src="/brand/logo-vertical.webp" alt="Grupo JBL Incorporadora · Urbanismo e Empreendimentos" className="mx-auto mb-10 w-48" />
          <h2 className="h-display text-center text-3xl">Bem-vindo de volta</h2>
          <p className="mt-2 text-center text-sm text-muted">Acesse o portal da empresa</p>
          <LoginForm />
          <p className="mt-10 text-center text-xs text-muted">JBL Incorporadora e Urbanismo · acesso restrito</p>
        </div>
      </section>
    </main>
  );
}
