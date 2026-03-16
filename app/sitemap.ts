import { MetadataRoute } from 'next';
import prisma from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://seventoop.com';

  // Static routes
  const routes = [
    '',
    '/login',
    '/register',
    '/nosotros',
    '/contacto',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  // Dynamic routes: Proyectos (Public ones only if we had an isPublic flag, usually all are public for SEO)
  try {
    const proyectos = await prisma.proyecto.findMany({
      select: { id: true, updatedAt: true },
      where: { estado: 'ACTIVO' } // Assuming ACTIVO means public
    });

    const proyectoRoutes = proyectos.map((p) => ({
      url: `${baseUrl}/proyectos/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    return [...routes, ...proyectoRoutes];
  } catch (error) {
    console.warn('[Sitemap] Failed to fetch proyectos:', error);
    return routes;
  }
}
