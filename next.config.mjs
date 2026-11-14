/** @type {import('next').NextConfig} */
const nextConfig = {
  // não anuncia "X-Powered-By: Next.js"
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "8mb" },
    serverComponentsExternalPackages: ["playwright-core", "@sparticuz/chromium"],
    // Vercel: os arquivos do Chromium vão junto da função que gera o PDF
    outputFileTracingIncludes: { "/api/public/[token]/pdf": ["./node_modules/@sparticuz/chromium/bin/**"] },
  },
  async headers() {
    // Imagens do site: o navegador guarda por 30 dias em vez de revalidar a cada visita.
    // Ao trocar uma imagem, use outro nome de arquivo.
    return [
      // Segurança em todas as páginas: não abre dentro de site de terceiros (iframe), o navegador não "adivinha"
      // o tipo de arquivo, o endereço completo não vai para outros sites e só HTTPS.
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
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
