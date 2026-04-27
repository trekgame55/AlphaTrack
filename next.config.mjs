/** @type {import('next').NextConfig} */
const nextConfig = {
  serverActions: {
    allowedOrigins: ['*'],
  },
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  output: 'standalone',
};

export default nextConfig;
