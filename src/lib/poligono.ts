/** Polígono como [[lon, lat], ...]. Sem nada de servidor: pode ir para o navegador (o mapa usa). */
export type Poligono = [number, number][];

export const centro = (p: Poligono): [number, number] => [p.reduce((a, c) => a + c[0], 0) / p.length, p.reduce((a, c) => a + c[1], 0) / p.length];

/** Impressão digital do polígono (coordenadas arredondadas a ~1 m): o mesmo KMZ dá o mesmo valor */
export function impressaoPoligono(p: Poligono) {
  const s = p.map(([lo, la]) => `${lo.toFixed(5)},${la.toFixed(5)}`).join(";");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return `${p.length}-${h.toString(36)}`;
}
