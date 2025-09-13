/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
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