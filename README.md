This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database Setup (Docker)

To start the local database:

```bash
docker-compose up -d
```

Then run migrations:

```bash
npx prisma migrate dev
```

> **Pro-tip**: In development use `prisma migrate dev`. In production, always use `prisma migrate deploy`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Pre-requisitos

- Node.js (v18 o superior)
- **Docker Desktop** (Necesario para la base de datos local)
- Git

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

## Variables de Entorno Requeridas

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión al pooler (p. ej. Neon/Supabase) |
| `DIRECT_URL` | URL de conexión directa para migraciones |
| `NEXTAUTH_SECRET` | Secreto para sesiones |
| `NEXTAUTH_URL` | URL base de la app |

## Backups y Recuperación

### Automatización
- **Neon**: Los backups son automáticos y point-in-time (ver sección *Backups* en el dashboard).
- **Supabase**: Los backups se realizan diariamente.

### Recuperación ante Desastres
1. Identificar el último snapshot válido en el proveedor.
2. Restaurar a una nueva instancia si es necesario.
3. Actualizar `DATABASE_URL` y `DIRECT_URL` en la plataforma de deploy.
4. Verificar integridad con `npx prisma migrate status`.
