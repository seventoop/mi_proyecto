import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/api/',
        '/onboarding/',
        '/_next/',
        '/static/',
      ],
    },
    sitemap: `${process.env.NEXTAUTH_URL || 'https://seventoop.com'}/sitemap.xml`,
  };
}
