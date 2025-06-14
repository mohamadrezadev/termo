/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  serverActions: {
    bodySizeLimit: '10mb', // Keep this, as Next.js still needs to handle the body before proxying
  },
  async rewrites() {
    return [
      {
        source: '/api/extract-bmps',
        destination: 'http://localhost:3001/api/extract-bmps', // Proxy to the Express server
      },
    ];
  },
};

module.exports = nextConfig;
