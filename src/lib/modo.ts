import { cookies } from "next/headers";

/**
 * Modo simples (pedido 20/11/2026): menos itens no menu e o próximo passo sempre à vista. É o padrão; quem
 * quiser tudo clica em "Ver tudo" (fica guardado no navegador).
 */
export const MODO_COOKIE = "jbl_modo";
export const modoSimples = () => cookies().get(MODO_COOKIE)?.value !== "completo";
