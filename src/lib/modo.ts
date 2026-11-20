import { cookies } from "next/headers";

/**
 * Modo simples (testado em 20/11/2026): menos itens no menu e o próximo passo sempre à vista.
 * Desligado a pedido do Fernando no mesmo dia ("deixe como estava o layout"): só vale com o cookie "simples".
 */
export const MODO_COOKIE = "jbl_modo";
export const modoSimples = () => cookies().get(MODO_COOKIE)?.value === "simples";
