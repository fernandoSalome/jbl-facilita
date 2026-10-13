import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

const MAX = 8 * 1024 * 1024;
// SVG fica de fora: pode carregar script
const MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function GET() {
  return withSession(async () => {
    const list = await db.asset.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, width: true, height: true, size: true, createdAt: true },
    });
    return json(list.map((a) => ({ ...a, url: `/api/assets/${a.id}` })));
  });
}

/** Recebe { name, dataUrl, width, height } com a imagem já reduzida no navegador. */
export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => null);
    const m = typeof b?.dataUrl === "string" ? b.dataUrl.match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/) : null;
    if (!m || !MIMES.has(m[1])) return json({ error: "Envie uma imagem JPG, PNG, WEBP ou GIF." }, 400);
    const data = Buffer.from(m[2], "base64");
    if (data.length > MAX) return json({ error: "Imagem muito grande (máx. 8 MB)." }, 400);
    const a = await db.asset.create({
      data: {
        name: String(b.name ?? "imagem").slice(0, 120),
        mime: m[1],
        width: Number.isFinite(b.width) ? Math.round(b.width) : null,
        height: Number.isFinite(b.height) ? Math.round(b.height) : null,
        size: data.length,
        data,
      },
    });
    return json({ id: a.id, url: `/api/assets/${a.id}` });
  });
}
