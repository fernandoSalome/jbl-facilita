import { redirect } from "next/navigation";

/** O template agora é editado em tela cheia, por formato. */
export default function TemplateRoute({ params }: { params: { id: string } }) {
  redirect(`/app/modelo/${params.id}`);
}
