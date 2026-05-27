/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @react-pdf/renderer and exceljs are server-only; keep them external to the
  // server bundle so their Node deps resolve at runtime instead of being bundled.
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "exceljs"],
  },
};

export default nextConfig;
