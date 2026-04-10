# REPO_RULES.md — Fuente de verdad de entorno

> **OBLIGATORIO**: Antes de modificar cualquier configuración de entorno, red Docker, puertos, credenciales o variables de entorno, leer este archivo completo.
>
> Aplica a todos los agentes y colaboradores: Claude Code, Codex, Antigravity y cualquier herramienta de desarrollo automatizada.

---

## Entorno local canónico

| Parámetro | Valor canónico |
|---|---|
| App local URL | `http://localhost:5000` |
| Postgres host port | `5433` |
| Postgres container port | `5432` |
| DB name | `seventoop` |
| DB user | `usuario` |
| DB password | `password` |
| Docker container | `seventoop-db` |
| Docker network | `seventoop-net` |

---

## Fuente de verdad por entorno

| Entorno | Fuente |
|---|---|
| Desarrollo local | `.env.local` — única fuente canónica |
| Plantilla | `.env.example` — debe reflejar siempre el canon local |
| Vercel Preview | Variables configuradas en Vercel Project Settings |
| Vercel Production | Variables configuradas en Vercel Project Settings |

**No existe otro archivo `.env` local alternativo.** `.env` en la raíz puede contener credenciales de servicio (Neon, Pusher, etc.) pero `.env.local` siempre lo sobreescribe para DB y URL de app.

---

## Reglas de docker-compose.yml

`docker-compose.yml` debe coincidir **exactamente** con `.env.local`:

```yaml
services:
  db:
    environment:
      - POSTGRES_USER=usuario
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=seventoop
    ports:
      - '5433:5432'
    networks:
      - seventoop-net

networks:
  seventoop-net:
    name: seventoop-net
```

Cualquier divergencia entre `docker-compose.yml` y `.env.local` es un error que debe corregirse hacia este canon.

---

## Reglas de Prisma

- Prisma siempre lee `DATABASE_URL` desde variables de entorno.
- No hardcodear connection strings en el código.
- `prisma/schema.prisma` debe declarar `url = env("DATABASE_URL")`.
- Para migraciones locales: `npm run db:migrate:dev`
- Para deploy: `npm run db:migrate:deploy`

---

## Reglas de Vercel

- Vercel **nunca** debe recibir valores locales: `localhost`, `5433`, `usuario`, `password`, `seventoop-net`, ni ninguna URL o credencial de Docker.
- `DATABASE_URL` en Vercel debe apuntar a Neon u otro proveedor cloud.
- `NEXTAUTH_URL` en Vercel debe ser el dominio real (sin trailing slash).
- Preview y Production tienen sus propias variables independientes.

---

## Prohibiciones absolutas

Los siguientes valores están prohibidos en cualquier configuración que no sea local:

| Valor prohibido en Vercel/prod | Motivo |
|---|---|
| `localhost` (cualquier puerto) | Es una dirección local |
| `5433` | Puerto del host Docker local |
| `usuario` / `password` | Credenciales del contenedor local |
| `seventoop-net` | Red Docker local |

Los siguientes valores están prohibidos en **cualquier** entorno (local o no):

| Valor prohibido en cualquier entorno | Motivo |
|---|---|
| Puerto `3000` para la app | Canon es `5000` |
| `POSTGRES_USER=postgres` | Credenciales viejas, reemplazadas |
| `POSTGRES_PASSWORD=postgres` | Credenciales viejas, reemplazadas |
| Puerto host `5432` para Postgres | El mapeo correcto es `5433:5432` |
| Múltiples `.env.local` alternativos | Un solo archivo canónico |

---

## Procedimiento de corrección de inconsistencias

Si se detecta una divergencia entre cualquier archivo de config y este canon:

1. Corregir el archivo divergente hacia este canon.
2. No proponer alternativas ni convenciones paralelas.
3. Documentar el cambio en el commit.

---

## Inicio rápido local (referencia)

```bash
# 1. Levantar Postgres local
docker-compose up -d

# 2. Aplicar migraciones
npm run db:migrate:dev

# 3. (Opcional) Seed inicial
npm run db:seed

# 4. Levantar la app
npm run dev
# → http://localhost:5000
```

---

## Archivos relacionados

- `docker-compose.yml` — debe coincidir con este canon
- `.env.local` — fuente de verdad local (gitignored)
- `.env.example` — plantilla completa y correcta (commiteada)
- `README.md` — documentación de inicio rápido
- `CLAUDE.md` — guía para Claude Code
- `prisma/BOOTSTRAP_CHECKLIST.md` — inicialización del tenant principal
