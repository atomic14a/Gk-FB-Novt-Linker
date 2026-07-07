/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable webpack file caching in development mode to prevent chunk/stylesheet corruption
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
