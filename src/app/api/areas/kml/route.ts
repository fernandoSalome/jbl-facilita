import { json, withSession } from "@/lib/api";
import { hectares, kmlDoKmz, lerKml } from "@/lib/kml";

const MAX = 5 * 1024 * 1024;

/** Lê o KML/KMZ enviado e devolve o polígono e a área em hectares (nada é gravado aqui) */
export async function POST(req: Request) {
  return withSession(async () => {
    const form = await req.formData().catch(() => null);
    const arq = form?.get("arquivo");
    if (!(arq instanceof File) || arq.size > MAX || !/\.km[lz]$/i.test(arq.name)) return json({ error: "Envie um .kml ou .kmz de até 5 MB" }, 400);
    const buf = Buffer.from(await arq.arrayBuffer());
    const xml = /\.kmz$/i.test(arq.name) ? kmlDoKmz(buf) : buf.toString("utf8");
    const poligono = xml ? lerKml(xml) : null;
    if (!poligono) return json({ error: "Não achei um polígono nesse arquivo" }, 400);
    return json({ poligono, hectares: hectares(poligono) });
  });
}
