import { json, withSession } from "@/lib/api";
import { ehModoTroca } from "@/lib/area-kmz";
import { trocarKmz } from "@/lib/area-kmz-db";
import { lerPoligono } from "@/lib/kml";

export const dynamic = "force-dynamic";

/** "Trocar KMZ" (pedido 23/11/2026): o polígono já lido em /api/areas/kml e se mantém ou apaga o estudo */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const poligono = lerPoligono(b?.poligono);
    if (!poligono) return json({ error: "Polígono inválido" }, 400);
    if (!ehModoTroca(b?.modo)) return json({ error: "Escolha se mantém ou apaga o estudo" }, 400);
    try {
      await trocarKmz(params.id.slice(0, 40), poligono, b.modo);
      return json({ ok: true });
    } catch (e) {
      return json({ error: (e as Error).message.slice(0, 200) }, 400);
    }
  });
}
