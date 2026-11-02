import { requireSession } from "@/lib/auth";
import { configDe, horariosDe, linkAgendar } from "@/lib/agenda-server";
import { emailConfigurado } from "@/lib/email";
import { smsConfigurado } from "@/lib/sms";
import { googleConfigurado } from "@/lib/google-agenda";
import { grupoMonitoring, whatsappConfigurado } from "@/lib/agenda-whatsapp";
import PageHeader from "@/components/PageHeader";
import Calendario from "@/components/calendario/Calendario";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({ searchParams }: { searchParams: { google?: string } }) {
  const s = await requireSession();
  const c = await configDe(s.sub);
  const grupo = whatsappConfigurado() ? await grupoMonitoring() : null;
  return (
    <>
      <PageHeader eyebrow="JBL Incorporadora" title="Calendário" subtitle="Seus compromissos e reuniões. Quem recebe o seu link escolhe um horário livre; o convidado recebe o convite por e-mail e um SMS 1 hora antes." />
      <Calendario
        config={{
          slug: c.slug, titulo: c.titulo, descricao: c.descricao ?? "", local: c.local ?? "", duracaoMin: c.duracaoMin,
          antecedenciaH: c.antecedenciaH, diasFrente: c.diasFrente, horarios: horariosDe(c), googleEmail: c.googleEmail, googleConectado: !!c.googleRefresh,
        }}
        link={linkAgendar(c.slug)}
        servicos={{ email: emailConfigurado(), sms: smsConfigurado(), google: googleConfigurado(), whatsapp: grupo?.name ?? null }}
        googleRetorno={searchParams.google ?? null}
      />
    </>
  );
}
