/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true, // ⚠️ ignores TS warnings/errors in build
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  distDir: 'out',
  // Remove rewrites for desktop app since we'll communicate directly with local server
};

module.exports = nextConfig;