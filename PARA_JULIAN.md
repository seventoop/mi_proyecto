# Guía de Proyecto — Seventoop

## ¿Qué es?
Plataforma de gestión y exhibición de proyectos inmobiliarios. Conecta desarrolladores con inversores/clientes.

## Tecnologías principales
- **Next.js 14** (App Router)
- **TypeScript**
- **Prisma** (ORM)
- **PostgreSQL** (Railway)
- **NextAuth** (auth con Google y credenciales)
- **Tailwind CSS** + Shadcn/ui
- **Vercel** (deploy)

## Ramas principales
- `main` → producción (`seventoop.com`)
- `merge-juani-dani` → integración de landing + dashboard
- `julian-fix-traduccion-mobile` → tu rama (correcciones)

## Base de datos
- **Producción:** `insightful-trust` (Railway)
- **Desarrollo:** `incredible-cat` (Railway, clon de prod)

## Cómo arrancar
1. Clonar el repo: `git clone https://github.com/seventoop/mi_proyecto.git`
2. Cambiar a tu rama: `git checkout julian-fix-traduccion-mobile`
3. Instalar: `npm install`
4. Crear `.env` con la URL de desarrollo (pedirla a Juani)
5. Correr: `npm run dev` → http://localhost:5000

## Tareas a hacer
- Revisar traducciones en toda la web
- Corregir vista responsive en dispositivos móviles
- Revisar componentes en `components/public/` y `app/(public)/`

## Estructura clave
- `app/(public)/` → landing, proyectos públicos
- `app/(dashboard)/` → dashboard admin/developer
- `components/public/` → componentes de la landing
- `lib/` → lógica compartida (auth, db, acciones)
- `prisma/` → schema y migraciones

## Commit y push
- Commits en español, descriptivos
- `git push origin julian-fix-traduccion-mobile`
- No pushear a `main` ni `merge-juani-dani`

## Contacto
- Juani: para dudas de DB, auth, merge
- Dani: para dudas de dashboard, proyectos, tour 360
