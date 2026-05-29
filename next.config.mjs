/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    webpackBuildWorker: false,
    serverActions: {
      bodySizeLimit: '4mb'
    }
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/setu-guru/org-search',
          destination: '/api/setu-guru/org-search-v2',
        },
      ],
    };
  },
};

export default nextConfig;
