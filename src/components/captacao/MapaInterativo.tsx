"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { centro, type Poligono } from "@/lib/poligono";

type L = typeof import("leaflet");

/** Vista de rua do Google num ponto (página de incorporação pública, sem chave) */
const streetView = (lat: number, lon: number) => `https://maps.google.com/maps?layer=c&cbll=${lat.toFixed(6)},${lon.toFixed(6)}&cbp=11,0,0,0,0&output=svembed`;
const streetViewGoogle = (lat: number, lon: number) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat.toFixed(6)},${lon.toFixed(6)}`;

/**
 * Mapa do KMZ de ponta a ponta, que arrasta e dá zoom como o Google (pedido 19/11/2026).
 * Pedido 20/11/2026: o boneco 🧍 (arrastar até o mapa, ou clicar nele e depois no mapa) abre a vista de rua do
 * Google ali mesmo; e um botão esconde o contorno amarelo para ver o terreno limpo.
 */
export default function MapaInterativo({ poligono, altura = 520 }: { poligono: Poligono | null; altura?: number }) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<import("leaflet").Map | null>(null);
  const contorno = useRef<import("leaflet").Polygon | null>(null);
  const lib = useRef<L | null>(null);
  const marca = useRef<import("leaflet").Marker | null>(null);
  const [comContorno, setComContorno] = useState(true);
  const [mirando, setMirando] = useState(false);
  const [rua, setRua] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!poligono || !div.current) return;
    let vivo = true;
    import("leaflet").then((Lf) => {
      if (!vivo || !div.current) return;
      lib.current = Lf;
      const m = Lf.map(div.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true });
      mapa.current = m;
      m.getContainer().style.outline = "none";
      Lf.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Esri" }).addTo(m);
      Lf.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, opacity: 0.8 }).addTo(m);
      Lf.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19 }).addTo(m);
      const p = Lf.polygon(poligono.map(([lon, lat]) => [lat, lon] as [number, number]), { color: "#D4AA55", weight: 3, fillColor: "#C1943D", fillOpacity: 0.15 }).addTo(m);
      contorno.current = p;
      m.fitBounds(p.getBounds(), { padding: [30, 30] });
    });
    return () => {
      vivo = false;
      mapa.current?.remove();
      mapa.current = null;
    };
  }, [poligono]);

  // esconder / mostrar o contorno
  useEffect(() => {
    const m = mapa.current;
    const p = contorno.current;
    if (!m || !p) return;
    if (comContorno) p.addTo(m);
    else p.remove();
  }, [comContorno]);

  // modo "boneco": o próximo clique no mapa abre a vista de rua
  useEffect(() => {
    const m = mapa.current;
    if (!m) return;
    const el = m.getContainer();
    el.style.cursor = mirando ? "crosshair" : "";
    if (!mirando) return;
    const clique = (e: import("leaflet").LeafletMouseEvent) => abrirRua(e.latlng.lat, e.latlng.lng);
    m.once("click", clique);
    return () => {
      m.off("click", clique);
      el.style.cursor = "";
    };
  }, [mirando]);

  function abrirRua(lat: number, lon: number) {
    setMirando(false);
    setRua({ lat, lon });
    const m = mapa.current;
    const Lf = lib.current;
    if (!m || !Lf) return;
    marca.current?.remove();
    marca.current = Lf.marker([lat, lon], { icon: Lf.divIcon({ html: "🧍", className: "", iconSize: [24, 24], iconAnchor: [12, 22] }) }).addTo(m);
  }

  // boneco arrastado e solto em cima do mapa
  function soltar(e: React.DragEvent) {
    e.preventDefault();
    const m = mapa.current;
    if (!m) return;
    const ll = m.mouseEventToLatLng(e.nativeEvent as unknown as MouseEvent);
    abrirRua(ll.lat, ll.lng);
  }

  if (!poligono) {
    return <div className="grid place-items-center rounded-md border-2 border-dashed border-gold-line bg-gold-soft text-sm text-gold-ink" style={{ height: 200 }}>Sem KMZ. Envie o arquivo em Configurações.</div>;
  }
  const [clon, clat] = centro(poligono);
  return (
    <div>
      <div className="relative">
        <div ref={div} onDragOver={(e) => e.preventDefault()} onDrop={soltar} className="z-0 w-full overflow-hidden rounded-md border border-line bg-navy outline-none" style={{ height: altura }} />
        <div className="absolute right-3 top-3 z-[500] flex flex-col items-end gap-2 print:hidden">
          <button
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", "boneco")}
            onClick={() => setMirando((v) => !v)}
            title="Arraste até o mapa (ou clique aqui e depois no mapa) para ver a rua"
            className={`grid h-11 w-11 cursor-grab place-items-center rounded-md border-2 bg-white text-[24px] shadow-md active:cursor-grabbing ${mirando ? "border-gold" : "border-white"}`}
          >🧍</button>
          <button onClick={() => setComContorno((v) => !v)} className="rounded-md bg-white px-2.5 py-1.5 text-[12px] font-semibold text-navy shadow-md hover:bg-gold-soft">
            {comContorno ? "Esconder contorno" : "Mostrar contorno"}
          </button>
        </div>
        {mirando && <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full bg-navy px-3 py-1 text-[12.5px] font-semibold text-white shadow">Clique no ponto do mapa que quer ver na rua</div>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 print:hidden">
        <a className="btn-ghost py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/@${clat},${clon},800m/data=!3m1!1e3`}>Abrir no Google Maps</a>
        <a className="btn-ghost py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://earth.google.com/web/@${clat},${clon},600a,1500d,35y,0h,0t,0r`}>Abrir no Google Earth</a>
      </div>
      {rua && (
        <div className="fixed inset-0 z-[1000] grid place-items-center bg-navy/70 p-4" onClick={() => setRua(null)}>
          <div className="w-full max-w-5xl overflow-hidden rounded-md bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <b className="text-navy">🧍 Vista da rua</b>
              <span className="flex-1 text-[12.5px] text-muted">Se não aparecer nada, o Google não passou com o carro nesse ponto: tente perto de uma rua.</span>
              <a className="text-[13px] font-semibold text-gold-deep underline" href={streetViewGoogle(rua.lat, rua.lon)} target="_blank" rel="noreferrer">Abrir no Google</a>
              <button className="rounded px-2 text-xl leading-none text-muted hover:text-navy" onClick={() => setRua(null)} aria-label="Fechar">×</button>
            </div>
            <iframe title="Vista da rua" src={streetView(rua.lat, rua.lon)} className="block h-[70vh] w-full border-0" allowFullScreen loading="lazy" />
          </div>
        </div>
      )}
    </div>
  );
}
