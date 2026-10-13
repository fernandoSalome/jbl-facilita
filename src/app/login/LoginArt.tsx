/**
 * Ilustração de fundo do login: mapa estilizado de um bairro planejado
 * (quadras, lotes e ruas) nas cores da JBL. Gerado por código, sem foto.
 */

// gerador pseudoaleatório fixo: a ilustração é sempre a mesma (servidor e navegador)
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const W = 1000;
const H = 1000;

function blocks() {
  const r = rng(7);
  const out: { x: number; y: number; w: number; h: number; lots: number; built: number[] }[] = [];
  const cols = [40, 210, 380, 550, 720, 890];
  const rows = [30, 150, 270, 390, 510, 630, 750, 870];
  for (const x of cols) {
    for (const y of rows) {
      const w = 140;
      const h = 96;
      const lots = 6 + Math.floor(r() * 4);
      const built = Array.from({ length: lots * 2 }, () => (r() > 0.45 ? 1 : 0));
      out.push({ x, y, w, h, lots, built });
    }
  }
  return out;
}

const BLOCKS = blocks();

export default function LoginArt() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="la-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0E2238" />
          <stop offset="1" stopColor="#163353" />
        </linearGradient>
        <radialGradient id="la-glow" cx="0.72" cy="0.38" r="0.55">
          <stop offset="0" stopColor="#C1943D" stopOpacity="0.22" />
          <stop offset="1" stopColor="#C1943D" stopOpacity="0" />
        </radialGradient>
        <pattern id="la-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="1.1" fill="#ffffff" opacity="0.05" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#la-bg)" />
      <rect width={W} height={H} fill="url(#la-dots)" />

      {/* quadras e lotes */}
      <g transform="rotate(-14 500 500) translate(-60 -40) scale(1.12)">
        {BLOCKS.map((b, i) => {
          const lw = b.w / b.lots;
          return (
            <g key={i}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="6" fill="#1D3D60" opacity="0.55" />
              {Array.from({ length: b.lots }).map((_, j) => (
                <g key={j}>
                  <rect x={b.x + j * lw + 2} y={b.y + 3} width={lw - 4} height={b.h / 2 - 5} rx="1.5" fill={b.built[j] ? "#2A5079" : "none"} stroke="#3E668F" strokeOpacity="0.5" strokeWidth="0.8" />
                  <rect x={b.x + j * lw + 2} y={b.y + b.h / 2 + 2} width={lw - 4} height={b.h / 2 - 5} rx="1.5" fill={b.built[j + b.lots] ? "#2A5079" : "none"} stroke="#3E668F" strokeOpacity="0.5" strokeWidth="0.8" />
                </g>
              ))}
            </g>
          );
        })}
        {/* avenida curva */}
        <path d="M -80 760 C 220 690 380 560 560 470 S 880 300 1120 250" fill="none" stroke="#0E2238" strokeWidth="34" />
        <path d="M -80 760 C 220 690 380 560 560 470 S 880 300 1120 250" fill="none" stroke="#C1943D" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="10 12" />
        {/* praça */}
        <circle cx="560" cy="470" r="46" fill="#24543F" opacity="0.55" />
        <circle cx="560" cy="470" r="46" fill="none" stroke="#C1943D" strokeOpacity="0.5" strokeWidth="1.5" />
        {/* nova gleba demarcada em dourado */}
        <path d="M 600 90 L 880 70 L 940 300 L 760 360 L 640 280 Z" fill="#C1943D" fillOpacity="0.07" stroke="#D4AA55" strokeWidth="2.5" strokeDasharray="12 8" />
        {[[600, 90], [880, 70], [940, 300], [760, 360], [640, 280]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="5" fill="#D4AA55" />
        ))}
      </g>

      <rect width={W} height={H} fill="url(#la-glow)" />
    </svg>
  );
}
