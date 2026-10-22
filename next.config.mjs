/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "8mb" }, serverComponentsExternalPackages: ["playwright-core"] },
  async headers() {
    // Imagens do site: o navegador guarda por 30 dias em vez de revalidar a cada visita.
    // Ao trocar uma imagem, use outro nome de arquivo.
    return [
      {
        source: "/site/img/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
    ];
  },
  async redirects() {
    // Endereços antigos do WordPress que não existem com o mesmo caminho aqui.
    return [
      { source: "/home", destination: "/", permanent: true },
      { source: "/publicacao", destination: "/publicacoes", permanent: true },
      { source: "/category/noticias", destination: "/publicacoes", permanent: true },
      { source: "/2025/05", destination: "/publicacoes?mes=2025-05", permanent: true },
      { source: "/2024/12", destination: "/publicacoes?mes=2024-12", permanent: true },
    ];
  },
};

export default nextConfig;
