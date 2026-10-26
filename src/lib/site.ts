/**
 * Endereço público das propostas: o link enviado ao cliente é sempre o da Vercel,
 * mesmo quando a proposta é editada pelo Railway. NEXT_PUBLIC_LINK_BASE troca o endereço.
 */
export const LINK_BASE = (process.env.NEXT_PUBLIC_LINK_BASE || "https://jbl-facilita.vercel.app").replace(/\/+$/, "");
export const linkProposta = (token: string) => `${LINK_BASE}/p/${token}`;
