/** @type {import('next').NextConfig} */
// GitHub Pages project sites serve the export under /<repo>. CI sets
// NEXT_PUBLIC_BASE_PATH accordingly; local dev/export stays at the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH

const nextConfig = {
  // Enable static export
  output: 'export',

  // Sub-path hosting (GitHub Pages project sites)
  ...(basePath ? { basePath } : {}),

  // Disable server-side features
  images: {
    unoptimized: true,
  },

  // Configure trailing slashes for static export
  trailingSlash: true,

  // Disable server components (all client-side)
  experimental: {
    // No server components
  },

  // Webpack configuration
  webpack: config => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
}

module.exports = nextConfig
