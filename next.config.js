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
  // GitHub Pages configuration (only when NEXT_EXPORT=true, not on every production build)
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,
  trailingSlash: process.env.NEXT_EXPORT === 'true',
  images: {
    unoptimized: true,
  },
  // Set base path for GitHub Pages
  basePath: process.env.NEXT_EXPORT === 'true' ? '/orbitr' : '',
  assetPrefix: process.env.NEXT_EXPORT === 'true' ? '/orbitr/' : '',
}

module.exports = nextConfig
