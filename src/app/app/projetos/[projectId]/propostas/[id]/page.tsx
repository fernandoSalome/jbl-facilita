import { redirect } from "next/navigation";

/** A edição da proposta agora é em tela cheia, sem o menu lateral. */
export default function OldProposalRoute({ params }: { params: { id: string } }) {
  redirect(`/app/proposta/${params.id}`);
}
