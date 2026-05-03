/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    webpackBuildWorker: false,
    serverActions: {
      bodySizeLimit: '4mb'
    }
  }
};

export default nextConfig;
