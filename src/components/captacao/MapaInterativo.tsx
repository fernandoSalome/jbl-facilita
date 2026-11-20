"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Poligono } from "@/lib/kml";
import { centro } from "@/lib/kml";

/**
 * Mapa do KMZ de ponta a ponta, que se arrasta e dá zoom como o Google (pedido 19/11/2026):
 * foto de satélite (Esri) com nomes de ruas e o polígono em dourado.
 */
export default function MapaInterativo({ poligono, altura = 520 }: { poligono: Poligono | null; altura?: number }) {
  const div = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!poligono || !div.current) return;
    let mapa: import("leaflet").Map | null = null;
    let vivo = true;
    import("leaflet").then((L) => {
      if (!vivo || !div.current) return;
      mapa = L.map(div.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true });
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Esri" }).addTo(mapa);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, opacity: 0.8 }).addTo(mapa);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19 }).addTo(mapa);
      const p = L.polygon(poligono.map(([lon, lat]) => [lat, lon] as [number, number]), { color: "#D4AA55", weight: 3, fillColor: "#C1943D", fillOpacity: 0.15 }).addTo(mapa);
      mapa.fitBounds(p.getBounds(), { padding: [30, 30] });
    });
    return () => {
      vivo = false;
      mapa?.remove();
    };
  }, [poligono]);

  if (!poligono) {
    return <div className="grid place-items-center rounded-md border-2 border-dashed border-gold-line bg-gold-soft text-sm text-gold-ink" style={{ height: 200 }}>Sem KMZ. Envie o arquivo em Configurações.</div>;
  }
  const [clon, clat] = centro(poligono);
  return (
    <div>
      <div ref={div} className="z-0 w-full overflow-hidden rounded-md border border-line bg-navy" style={{ height: altura }} />
      <div className="mt-2 flex flex-wrap gap-2 print:hidden">
        <a className="btn-ghost py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/@${clat},${clon},800m/data=!3m1!1e3`}>Abrir no Google Maps</a>
        <a className="btn-ghost py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://earth.google.com/web/@${clat},${clon},600a,1500d,35y,0h,0t,0r`}>Abrir no Google Earth</a>
      </div>
    </div>
  );
}
