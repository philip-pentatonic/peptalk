/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@peptalk/ui', '@peptalk/schemas'],

  // Cloudflare Pages compatibility
  output: 'export',
  images: {
    unoptimized: true,
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  },

  // Trailing slashes for static export
  trailingSlash: true,
}

module.exports = nextConfig
