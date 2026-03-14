# Fix A4 — Rate Limiting: Estado actual y plan de upgrade

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Estado:** ⚠️ Parche en producción — diseño final documentado

---

## Estado actual de rate limiting

| Endpoint | Límite | Implementación |
|----------|--------|---------------|
| `crearLeadLanding()` | 5 / 10min / IP | in-memory ✅ |
| `crearConsultaContacto()` | 5 / 10min / IP | in-memory ✅ |
| `POST /api/crm/leads` | 10 / 10min / IP | in-memory ✅ (nuevo) |
| `POST /api/leads/public` | 10 / 10min / IP | in-memory ✅ (preexistente) |
| `POST /api/auth/callback/credentials` | 10 / 15min / IP | in-memory middleware ✅ |
| `POST /api/auth/register` | 5 / 1h / IP | in-memory ✅ (preexistente) |

---

## Problema del in-memory rate limit en producción

En Vercel/serverless con múltiples instancias (especialmente con tráfico moderado-alto):
- Cada instancia tiene su propio `Map<string, RateLimitEntry>`
- Un atacante puede distribuir 5 requests entre N instancias (límite efectivo = 5 × N)
- Con cold starts frecuentes, el Map se resetea constantemente

**Severidad en producción actual:** Media-baja (sin Upstash configurado, esto es lo mejor disponible).

---

## Diseño final: Redis/Upstash rate limiting

### Opción recomendada: `@upstash/ratelimit`

**Ventajas:**
- HTTP-based (funciona con Vercel Edge/Serverless sin conexión TCP larga)
- Sliding window nativo
- Sin cold start penalty (HTTP request, no TCP pool)
- SDK oficial con TypeScript

### Implementación target (`lib/rate-limit.ts` futuro)

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Singleton Redis client
let ratelimitClient: Ratelimit | null = null;

export function getRatelimiter(limit: number, window: string) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        return null; // graceful degradation to in-memory
    }
    return new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, window),
        ephemeralCache: new Map(), // in-memory cache for edge deduplication
    });
}

export async function checkRateLimitUpstash(
    identifier: string,
    limit: number,
    window: string
): Promise<{ allowed: boolean }> {
    const limiter = getRatelimiter(limit, window);
    if (!limiter) {
        // Fallback to in-memory
        return checkRateLimit(identifier, { limit, windowMs: parseWindowMs(window) });
    }
    const { success } = await limiter.limit(identifier);
    return { allowed: success };
}
```

### Variables de entorno necesarias

```env
UPSTASH_REDIS_REST_URL=https://your-upstash-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### Puntos de integración (en orden de prioridad)

1. `crearLeadLanding()` — 5/10min (actualmente in-memory)
2. `crearConsultaContacto()` — 5/10min (actualmente in-memory)
3. `POST /api/crm/leads` — 10/10min (actualmente in-memory)
4. `POST /api/auth/callback/credentials` — 10/15min (actualmente middleware in-memory)
5. `POST /api/auth/register` — 5/1h (actualmente in-memory)

### Pasos de migración

```bash
# 1. Instalar dependencias
npm install @upstash/ratelimit @upstash/redis

# 2. Configurar Upstash (crear DB en upstash.com)
# 3. Agregar variables de entorno
# 4. Reemplazar checkRateLimit → checkRateLimitUpstash en cada punto de uso
# 5. Deploy con rollback automático si las variables no están configuradas (graceful fallback)
```

---

## Endpoints sensibles sin rate limit hoy

| Endpoint | Riesgo | Prioridad |
|----------|--------|-----------|
| `PUT /api/crm/leads/[id]` | MEDIO — flood de updates | Alta |
| `GET /api/crm/leads` | BAJO — solo lectura autenticada | Media |
| Workflow run | ALTO — puede ejecutar AI/webhooks | Alta |
| `POST /api/pusher/auth` (legacy) | BAJO — requiere sesión | Baja |

Para workflow run, agregar rate limit de 30 ejecuciones/min/org antes de conectar 7TP7.

---

## Estado: Parche temporal activo

El in-memory rate limit es la primera línea de defensa efectiva. Para single-instance dev o staging, es suficiente. Para producción con tráfico real, implementar Upstash como se describe arriba.

**No bloquea la integración de 7TP7**, pero debe resolverse antes de poner 7TP7 en producción con carga real.
