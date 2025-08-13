/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  // GitHub Pages configuration
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Set base path for GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/orbitr' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/orbitr/' : '',
}

module.exports = nextConfig
