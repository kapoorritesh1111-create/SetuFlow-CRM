/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: false,
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
};

export default nextConfig;
