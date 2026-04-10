# SevenToop

> **Antes de modificar configuración de entorno, puertos, credenciales o red Docker: leer [`REPO_RULES.md`](./REPO_RULES.md).**

## Entorno canonico local

La unica fuente de verdad para desarrollo local es `.env.local`.

- App local: `http://localhost:5000`
- Postgres expuesto en host: `5433`
- Puerto interno del contenedor Postgres: `5432`
- Base de datos: `seventoop`
- Usuario: `usuario`
- Password: `password`
- Contenedor DB: `seventoop-db`
- Red Docker: `seventoop-net`

`docker-compose.yml`, Prisma, scripts y documentacion deben respetar esta misma convencion.

## Inicio rapido local

1. Levantar Postgres:

```bash
docker-compose up -d
```

2. Aplicar migraciones:

```bash
npm run db:migrate:dev
```

3. Levantar la app:

```bash
npm run dev
```

4. Abrir:

```text
http://localhost:5000
```

## Variables de entorno

- Local: `.env.local`
- Plantilla: `.env.example`
- Preview: variables configuradas en Vercel
- Produccion: variables configuradas en Vercel

No uses otro `.env` como fuente principal para desarrollo local salvo que se pida explicitamente.

## Variables requeridas

| Variable | Uso |
|---|---|
| `DATABASE_URL` | En local sale de `.env.local`. En Vercel debe configurarse en Project Settings > Environment Variables. |
| `DIRECT_URL` | En local sale de `.env.local`. En cloud solo si tu proveedor la requiere para conexiones directas. |
| `NEXTAUTH_SECRET` | Secreto de autenticacion. |
| `NEXTAUTH_URL` | URL base de la app. En local debe ser `http://localhost:5000`. |

## Vercel

Vercel no debe reutilizar valores de localhost ni credenciales locales.

- `Preview`: variables propias de preview/staging
- `Production`: variables reales de produccion

No mezclar:

- `localhost`
- `5433`
- `usuario`
- `password`
- URLs o credenciales de Docker local

## Base de datos local

La base local se levanta con:

```yaml
POSTGRES_USER=usuario
POSTGRES_PASSWORD=password
POSTGRES_DB=seventoop
ports:
  - "5433:5432"
network:
  - seventoop-net
```

## Notas de Prisma

Prisma lee `DATABASE_URL` desde variables de entorno.

- Local: `.env.local`
- Vercel: Project Settings > Environment Variables

Para desarrollo usar:

```bash
npm run db:migrate:dev
```

Para deploy:

```bash
npm run db:migrate:deploy
```
