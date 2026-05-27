/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server build for lean Docker images (Coolify etc.).
  output: "standalone",
  // @react-pdf/renderer and exceljs are server-only; keep them external to the
  // server bundle so their Node deps resolve at runtime instead of being bundled.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "exceljs"],
  },
};

export default nextConfig;
