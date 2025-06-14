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
        // Frontend will call this path
        source: '/api/python/extract-bmps',
        // Next.js will proxy it to the FastAPI server's actual endpoint path
        destination: 'http://localhost:8000/api/extract-bmps-py',
      }
      // Remove or comment out the old proxy to Node.js server if no longer used.
      // {
      //   source: '/api/extract-bmps',
      //   destination: 'http://localhost:3001/api/extract-bmps',
      // },
    ];
  },
};

module.exports = nextConfig;
