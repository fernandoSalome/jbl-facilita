import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json();
    const areaTotal = Number(String(b.areaTotal ?? "").replace(/\./g, "").replace(",", "."));
    if (!b.name?.trim() || !b.municipio?.trim() || !areaTotal) return json({ error: "Preencha nome, município e área." }, 400);
    const p = await db.project.create({
      data: {
        name: b.name.trim(),
        municipio: b.municipio.trim(),
        uf: (b.uf || "SP").trim().toUpperCase().slice(0, 2),
        matricula: b.matricula?.trim() || null,
        tipo: b.tipo?.trim() || "Loteamento aberto",
        areaTotal,
        aerialImage: typeof b.aerialImage === "string" && b.aerialImage.startsWith("data:image/") ? b.aerialImage : null,
      },
    });
    return json({ id: p.id });
  });
}
