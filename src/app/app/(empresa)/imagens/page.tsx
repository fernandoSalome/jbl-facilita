import PageHeader from "@/components/PageHeader";
import ImageBank from "@/components/ImageBank";

export default function Imagens() {
  return (
    <>
      <PageHeader
        eyebrow="JBL Incorporadora"
        title="Banco de imagens"
        subtitle="Fotos aéreas, logos e imagens usadas nas propostas. Para trocar uma imagem numa proposta, clique nela no modo “Editar textos”."
      />
      <div className="p-8">
        <ImageBank />
      </div>
    </>
  );
}
