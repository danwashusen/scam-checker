import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Enable strict mode for better development experience
  reactStrictMode: true,
  // Optimize images
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Output configuration for serverless deployment
  output: 'standalone',
  // Redirect configuration
  async redirects() {
    return []
  },
  // Rewrites for API routes
  async rewrites() {
    return []
  },
}

export default nextConfig