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
    return {
      beforeFiles: [
        {
          source: '/academy',
          has: [
            {
              type: 'host',
              value: 'packaging\\.setuflowcrm\\.com',
            },
          ],
          destination: '/guides/setu_flow_packaging_workspace_guide.html',
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
