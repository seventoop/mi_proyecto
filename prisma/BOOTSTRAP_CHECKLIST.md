# SevenToop - Bootstrap Checklist

## Contexto

Este checklist inicializa el tenant principal de forma segura e idempotente.

## Convencion de entorno

- Local canonico: `.env.local`
- Base local Docker: `seventoop-db`
- Red Docker: `seventoop-net`
- Postgres host: `5433`
- App local: `http://localhost:5000`

## Opcion A - Fresh install (DB vacia / local)

```bash
# 1. Levantar la DB local
docker-compose up -d

# 2. Aplicar migrations
npm run db:migrate:deploy

# 3. Ejecutar seed
npm run db:seed

# 4. Agregar la variable local canonica
echo "SEVENTOOP_MAIN_ORG_ID=seventoop-main" >> .env.local

# 5. Verificar
npm run db:studio
```

## Opcion B - DB existente (Preview / Produccion)

Usar variables y credenciales propias del entorno remoto. No reutilizar localhost ni credenciales locales.

```bash
psql $DATABASE_URL -f prisma/bootstrap-neon.sql
```

## Variables por entorno

### Local

```bash
# .env.local
SEVENTOOP_MAIN_ORG_ID=seventoop-main
```

### Vercel

Configurar en `Project Settings > Environment Variables`:

- `SEVENTOOP_MAIN_ORG_ID=seventoop-main`
- Entornos: `Preview` y `Production`

## Reinicio

```bash
# local
npm run dev
```

En Vercel, hacer redeploy despues de cargar o cambiar variables.

## Rollback

Ejecutar solo si estas seguro de que no hay datos de negocio ligados al tenant:

```sql
DELETE FROM "PipelineEtapa" WHERE "orgId" = 'seventoop-main';
UPDATE "Proyecto" SET "orgId" = NULL, "creadoPorId" = NULL WHERE "orgId" = 'seventoop-main';
UPDATE "User" SET "orgId" = NULL WHERE "orgId" = 'seventoop-main';
DELETE FROM "Organization" WHERE id = 'seventoop-main';
```

## Estado final esperado

```text
Organization:   1  (id=seventoop-main, slug=seventoop)
Users:          con orgId=seventoop-main
Proyectos:      con orgId=seventoop-main
PipelineEtapas: creadas
Env local:      .env.local
```
