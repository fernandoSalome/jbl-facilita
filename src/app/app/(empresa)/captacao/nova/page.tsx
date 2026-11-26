import PageHeader from "@/components/PageHeader";
import AreaForm from "@/components/captacao/AreaForm";

export default function NovaArea() {
  return (
    <>
      <PageHeader eyebrow="Áreas" title="Novo estudo" subtitle="Cidade, proprietário ou corretor e, se tiver, o KMZ." />
      <div className="max-w-6xl p-8"><AreaForm /></div>
    </>
  );
}
