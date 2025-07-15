/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    domains: ['utfs.io'], // for uploadthing
  },
}

export default nextConfig