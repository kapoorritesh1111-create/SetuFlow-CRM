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
    // S24-BUG-217: /investors, /investor-overview, /preseed are now served
    // natively by the App Router (src/app/investors). The proxy rewrites to
    // setu-flow-landing.vercel.app (and the /assets/:path* catch-all that
    // shadowed local static assets) have been removed.
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
