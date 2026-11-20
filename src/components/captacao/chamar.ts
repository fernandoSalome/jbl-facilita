/** Chamada às rotas da captação: devolve o JSON ou lança o erro em português */
export async function chamar<T = Record<string, unknown>>(url: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method,
    headers: body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d as { error?: string }).error ?? "Não foi possível salvar.");
  return d as T;
}
