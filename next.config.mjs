/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['*'],
    },
  },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  output: 'standalone',
};

export default nextConfig;
