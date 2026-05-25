/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This repo uses TypeScript-only verification through npm run lint/typecheck.
    // Disable Next's build-time ESLint integration so production builds do not
    // emit the missing ESLint package error when ESLint is intentionally absent.
    ignoreDuringBuilds: true,
  },
  experimental: {
    webpackBuildWorker: false,
    serverActions: {
      bodySizeLimit: '4mb'
    }
  }
};

export default nextConfig;
