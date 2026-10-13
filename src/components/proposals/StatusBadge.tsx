import { STATUS } from "@/lib/proposals";

export default function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status] ?? STATUS.rascunho;
  return <span className={`inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset ${s.tone}`}>{s.label}</span>;
}
