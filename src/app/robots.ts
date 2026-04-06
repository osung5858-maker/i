import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/settings/', '/auth/', '/invite/'],
      },
    ],
    sitemap: 'https://i.dodam.life/sitemap.xml',
  }
}
