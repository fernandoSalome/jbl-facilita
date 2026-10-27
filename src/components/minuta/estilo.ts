/** Estilo da minuta na tela (o mesmo do PDF, sem a margem de página) */
export const CSS_MINUTA_TELA = `
.minuta{font-family:Georgia,"Times New Roman",serif;color:#1f2a37;font-size:15px;line-height:1.7}
.minuta h2.titulo{text-align:center;text-decoration:underline;font-size:18px;letter-spacing:.04em;margin:0 0 20px;color:#122A45}
.minuta h3{font-size:15px;font-weight:700;margin:20px 0 6px;color:#122A45}
.minuta p{margin:0 0 12px;text-align:justify}
.minuta ul{list-style:disc;padding-left:28px;margin:0 0 12px}
.minuta ol{list-style:decimal;padding-left:28px;margin:0 0 12px}
.minuta .lacuna{background:#fff1c2;padding:0 3px;border-radius:2px}
.minuta .assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:40px 48px;margin-top:56px}
.minuta .sig{border-top:1px solid #122A45;padding-top:6px;text-align:center;font-size:13.5px}
@media (max-width:640px){.minuta .assinaturas{grid-template-columns:1fr}}
`;
