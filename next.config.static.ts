import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
  images: { unoptimized: true },
  // Não inclui API routes no export
};
export default nextConfig;
