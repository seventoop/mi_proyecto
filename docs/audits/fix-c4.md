# Fix C4 — Spam/Rate-Limit en Lead Capture Público

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Riesgo original:** ALTO — cualquier bot podía hacer POST ilimitado al formulario VIP de la landing, inundando la DB y el CRM con leads basura.

---

## Diagnóstico

`crearLeadLanding()` y `crearConsultaContacto()` eran Server Actions públicas sin ningún rate limit. El formulario en `/` las llama directamente desde el cliente. No requieren sesión.

Un atacante podía hacer:
```bash
for i in $(seq 1 1000); do
  # POST directo a Next.js server action endpoint
  curl -X POST / -H "Next-Action: <hash>" -d '...'
done
```

---

## Cambio aplicado

**Archivo:** `lib/actions/leads.ts`

Agregado al inicio de `crearLeadLanding` y `crearConsultaContacto`:

```typescript
import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";

// Rate limiting: 5 submissions per IP per 10 minutes
const headersList = headers();
const ip = headersList.get("x-forwarded-for")?.split(",")[0].trim()
    || headersList.get("x-real-ip")
    || "unknown";
const { allowed } = checkRateLimit(ip, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
    keyPrefix: "lead_landing:", // "lead_contacto:" para crearConsultaContacto
});
if (!allowed) {
    return { success: false, error: "Demasiadas solicitudes. Intentá de nuevo en unos minutos." };
}
```

---

## Riesgo residual — PARCHE TEMPORAL

> **⚠️ PARCHE TEMPORAL:** El rate limiter usa `lib/rate-limit.ts` que es in-memory (`Map`). En Vercel con múltiples instancias de serverless functions, cada instancia tiene su propio mapa. Un atacante con suficientes requests puede superar el límite distribuyendo peticiones entre instancias.

**Solución correcta final:** Upstash Redis rate limiting con `@upstash/ratelimit`. Implementación:
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
});

const { success } = await ratelimit.limit(ip);
```

Para el entorno actual (single instance o bajo volumen de tráfico), el in-memory rate limit es suficiente como primera línea de defensa.

---

## Test Manual

### Pre-requisito
- Dev local corriendo (`npm run dev`)

### Caso 1: Primer submit → éxito
```
1. Abrir http://localhost:3000/#oportunidades
2. Completar formulario con datos válidos
3. Submit
→ Esperado: mensaje de éxito
```

### Caso 2: Rate limit tras 5 envíos
```
1. Enviar el formulario 5 veces con datos diferentes
2. En el 6° intento:
→ Esperado: error "Demasiadas solicitudes. Intentá de nuevo en unos minutos."
```

### Caso 3: Reset tras ventana
```
1. Esperar 10 minutos (o reiniciar dev server para limpiar el Map)
2. Enviar el formulario
→ Esperado: éxito nuevamente
```

### Caso 4: Validar que usuarios legítimos no se bloqueen entre sí
En dev, todos los requests tienen IP `127.0.0.1`. En producción, cada IP tiene su propio contador.
Para pruebas de multi-IP, usar el `keyPrefix` diferente o mocking.

---

## Impacto sobre navegador/cookies/sesión

**Ninguno.** La función es stateless desde el punto de vista del cliente. El rate limit vive 100% en el servidor. El usuario ve un mensaje de error en el formulario si está rate-limited. El estado del formulario (`isSuccess`, `error`) se maneja en React state del cliente.

---

## Resultado

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run build` | ✅ exitoso |
| Rate limit funcional | ✅ 5 req / 10min por IP |
| UX en error | ✅ mensaje claro al usuario |
| Leads legítimos no bloqueados | ✅ (límite razonable) |
| Multi-instancia prod | ⚠️ Parche temporal (in-memory) |
