import { centro, type Poligono } from "@/lib/poligono";

/** Foto de satélite (Esri) com o polígono do KMZ por cima, e os atalhos para o Google */
export default function MapaArea({ poligono, altura = 340 }: { poligono: Poligono | null; altura?: number }) {
  if (!poligono) {
    return <div className="grid place-items-center rounded-md border-2 border-dashed border-gold-line bg-gold-soft text-sm text-gold-ink" style={{ height: altura }}>Sem KMZ. Envie o arquivo em Configurações.</div>;
  }
  const lons = poligono.map((c) => c[0]);
  const lats = poligono.map((c) => c[1]);
  const pad = 0.35;
  const [x0, x1, y0, y1] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)];
  const dx = (x1 - x0) * pad || 0.002;
  const dy = (y1 - y0) * pad || 0.002;
  const bb = [x0 - dx, y0 - dy, x1 + dx, y1 + dy];
  const W = 1000;
  const H = Math.round((W * (bb[3] - bb[1])) / ((bb[2] - bb[0]) * Math.cos(((y0 + y1) / 2) * (Math.PI / 180))));
  const img = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${bb.join(",")}&bboxSR=4326&imageSR=3857&size=${W},${H}&format=jpg&f=image`;
  const pts = poligono.map(([lon, lat]) => `${(((lon - bb[0]) / (bb[2] - bb[0])) * W).toFixed(1)},${(((bb[3] - lat) / (bb[3] - bb[1])) * H).toFixed(1)}`).join(" ");
  const [clon, clat] = centro(poligono);
  return (
    <div>
      <div className="relative overflow-hidden rounded-md border border-line bg-navy">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ maxHeight: altura * 1.6 }}>
          <image href={img} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />
          <polygon points={pts} fill="rgba(193,148,61,0.18)" stroke="#D4AA55" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 print:hidden">
        <a className="btn-ghost py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/@${clat},${clon},800m/data=!3m1!1e3`}>Abrir no Google Maps</a>
        <a className="btn-ghost py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://earth.google.com/web/@${clat},${clon},600a,1500d,35y,0h,0t,0r`}>Abrir no Google Earth</a>
      </div>
    </div>
  );
}
