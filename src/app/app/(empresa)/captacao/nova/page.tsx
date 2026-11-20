import PageHeader from "@/components/PageHeader";
import AreaForm from "@/components/captacao/AreaForm";

export default function NovaArea() {
  return (
    <>
      <PageHeader eyebrow="Captação" title="Nova área" subtitle="Cidade, proprietário ou corretor e, se tiver, o KMZ." />
      <div className="max-w-4xl p-8"><AreaForm /></div>
    </>
  );
}
