/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // images: {
  //   unoptimized: true,
  // },
  // experimental: {
  //   serverActions: {
  //     bodySizeLimit: '10mb', // Only define it here
  //   },
  // },
  async rewrites() {
    return [
      {
        // Frontend will call this path
        source: '/api/extract-bmps-py',
        // Proxy to FastAPI backend
        destination: 'http://localhost:8000//api/extract-bmps-py',
      }
    ];
  },
};

module.exports = nextConfig;
