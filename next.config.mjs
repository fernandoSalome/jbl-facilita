/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: "8mb" }, serverComponentsExternalPackages: ["playwright-core"] },
};

export default nextConfig;
