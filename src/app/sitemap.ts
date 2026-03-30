import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dodam.life'
  const now = new Date().toISOString()

  return [
    // 메인
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1.0 },

    // 핵심 기능 페이지
    { url: `${baseUrl}/pregnant`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/preparing`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/record`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/waiting`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },

    // 콘텐츠 페이지
    { url: `${baseUrl}/babyfood`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/vaccination`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/gov-support`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/name`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/lullaby`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },

    // 도구 페이지
    { url: `${baseUrl}/emergency`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/troubleshoot`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/mental-check`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/fortune`, lastModified: now, changeFrequency: 'daily', priority: 0.5 },
    { url: `${baseUrl}/map`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/town`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },

    // 정보 페이지
    { url: `${baseUrl}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
