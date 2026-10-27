import type { Metadata } from "next";
import Assinatura from "@/components/minuta/Assinatura";

export const metadata: Metadata = { title: "Assinatura da carta de intenção · JBL", robots: { index: false, follow: false } };

export default function AssinarPage({ params }: { params: { token: string } }) {
  return <Assinatura token={params.token} />;
}
