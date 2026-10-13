import PageHeader from "@/components/PageHeader";
import NewProjectForm from "@/components/NewProjectForm";

export default function NovoProjeto() {
  return (
    <>
      <PageHeader eyebrow="JBL Incorporadora" title="Novo loteamento" subtitle="O básico da gleba. O resto (documentos, licenças, grupo) vem depois, dentro do projeto." />
      <div className="max-w-3xl p-8">
        <NewProjectForm />
      </div>
    </>
  );
}
