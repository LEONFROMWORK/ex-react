/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Optimize for production builds
  experimental: {
    optimizeCss: true,
  },
  // Set build-time environment variable
  env: {
    BUILDING: 'true',
  },
  // Exclude unnecessary files from production
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve 'fs' module on the client to prevent this error on build
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      }
    }
    
    // ChromaDB는 빌드 시에만 제외 (런타임에는 동적 import 사용)
    config.externals = config.externals || []
    config.externals.push('chromadb')
    
    return config
  },
}

module.exports = nextConfig