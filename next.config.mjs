import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Required for server components with next-intl
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
};
 
export default withNextIntl(nextConfig);