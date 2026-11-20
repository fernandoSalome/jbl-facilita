/** Polígono como [[lon, lat], ...]. Sem nada de servidor: pode ir para o navegador (o mapa usa). */
export type Poligono = [number, number][];

export const centro = (p: Poligono): [number, number] => [p.reduce((a, c) => a + c[0], 0) / p.length, p.reduce((a, c) => a + c[1], 0) / p.length];
