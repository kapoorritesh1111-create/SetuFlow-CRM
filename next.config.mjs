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
  async headers() {
    return [
      {
        source: '/academy',
        headers: [
          {
            key: 'Link',
            value: '<https://packaging.setuflowcrm.com/academy>; rel="canonical"',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/marketing/guides/setu_flow_packaging_workspace_guide.html',
        destination: 'https://packaging.setuflowcrm.com/academy',
        permanent: true,
      },
      {
        source: '/guides/setu_flow_packaging_workspace_guide.html',
        destination: 'https://packaging.setuflowcrm.com/academy',
        permanent: true,
      },
      {
        source: '/marketing/guides/setu-flow-packaging-workspace-guide.html',
        destination: 'https://packaging.setuflowcrm.com/academy',
        permanent: true,
      },
      {
        source: '/guides/packaging-academy',
        destination: 'https://packaging.setuflowcrm.com/academy',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    // S24-BUG-217: /investors, /investor-overview, /preseed are now served
    // natively by the App Router (src/app/investors). The proxy rewrites to
    // setu-flow-landing.vercel.app (and the /assets/:path* catch-all that
    // shadowed local static assets) have been removed.
    return {
      beforeFiles: [
        {
          source: '/academy',
          destination: '/marketing/guides/setu_flow_packaging_workspace_guide.html',
        },
        {
          source: '/api/setu-guru/org-search',
          destination: '/api/setu-guru/org-search-v2',
        },
      ],
    };
  },
};

export default nextConfig;
