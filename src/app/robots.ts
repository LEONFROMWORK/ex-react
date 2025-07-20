import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://exhell.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tools', '/pricing', '/help', '/auth/*'],
        disallow: [
          '/admin/*',
          '/api/*',
          '/dashboard/*',
          '/tmp/*',
          '/.env*',
          '/logs/*'
        ],
      },
      {
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        userAgent: 'ChatGPT-User',
        disallow: ['/'],
      },
      {
        userAgent: 'CCBot',
        disallow: ['/'],
      },
      {
        userAgent: 'anthropic-ai',
        disallow: ['/'],
      }
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}