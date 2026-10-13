import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

const MAX = 15 * 1024 * 1024;

export async function POST(req: Request) {
  return withSession(async () => {
    const fd = await req.formData();
    const name = String(fd.get("name") ?? "").trim();
    const file = fd.get("file");
    if (!name || !(file instanceof File) || file.size === 0) return json({ error: "Informe o nome e o arquivo." }, 400);
    if (file.size > MAX) return json({ error: "Arquivo muito grande (máx. 15 MB)." }, 400);
    await db.template.create({
      data: {
        name,
        description: String(fd.get("description") ?? "").trim() || null,
        status: "em_preparacao",
        sourceFileName: file.name,
        sourceFile: Buffer.from(await file.arrayBuffer()),
      },
    });
    return json({ ok: true });
  });
}
