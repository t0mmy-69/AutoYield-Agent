/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enable instrumentation hook so the scheduler starts on server boot
    instrumentationHook: true,
  },
};

export default nextConfig;
