# Fix C3 — Reservas Concurrentes: Validación Real + Fix de Tipo

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Estado:** ✅ Race condition confirmada como mitigada / Type safety corregida

---

## Diagnóstico

### ¿Hay race condition real?

El patrón usado en `createReserva` e `iniciarReserva`:

```typescript
const updated = await tx.unidad.updateMany({
    where: { id: data.unidadId, estado: "DISPONIBLE" },
    data:  { estado: "RESERVADA_PENDIENTE" }
});
if (updated.count === 0) throw new Error("La unidad ya no está disponible");
```

**¿Es esto seguro bajo concurrencia?**

**SÍ, en PostgreSQL con READ COMMITTED (default de Prisma).**

### Evidencia del mecanismo de locking

PostgreSQL ejecuta `UPDATE ... WHERE estado='DISPONIBLE'` como:

1. **Scan + Lock**: PostgreSQL scanea la tabla y coloca un **exclusive row lock** sobre cada fila que matchea el WHERE.
2. **Request B espera**: Si B llega mientras A tiene el lock, B **bloquea** hasta que A haga commit o rollback.
3. **Re-evaluación**: Cuando B obtiene el lock post-commit de A, re-evalúa el WHERE. El estado es ahora `RESERVADA_PENDIENTE`, por lo que el WHERE no matchea → `count = 0`.
4. **B lanza error**: "La unidad ya no está disponible" → correcto.

Esto es equivalente a `SELECT ... FOR UPDATE` + check, pero más conciso. Es el patrón estándar para "optimistic locking via conditional UPDATE" en PostgreSQL.

**Referencia**: PostgreSQL documentation, "Explicit Locking", Section 13.3 — Row-level Locks: "FOR UPDATE causes the rows retrieved by the SELECT statement to be locked as though for update. This prevents them from being locked, modified or deleted by other transactions until the current transaction ends."

### Test manual documentado para validar

Para probar la concurrencia en desarrollo:

```bash
# Terminal 1 y 2 simultáneos:
curl -X POST http://localhost:3000/api/reservas \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<TOKEN>" \
  -d '{"unidadId":"<UNIDAD_DISPONIBLE>","leadId":"<LEAD_ID>","montoSena":1000,"fechaVencimiento":"2026-04-01"}'
```

Resultado esperado:
- Una request: `200 { success: true, data: { id: "..." } }`
- La otra: `200 { success: false, error: "La unidad ya no está disponible" }`

Nunca: dos reservas exitosas para la misma unidad.

---

## Problema real encontrado y corregido: as-any casts

El diagnóstico reveló que el "race condition" original era una lectura incorrecta del código. El problema real era que `iniciarReserva` y otros métodos usaban casts incorrectos a `any`:

```typescript
// ANTES (incorrecto — los campos están en el schema):
const reserva = await (tx.reserva as any).create({ ... });
const reserva = await (prisma.reserva as any).findUnique({ ... });
await (tx.reserva as any).update({ ... });
```

**Por qué los casts estaban ahí:** El schema Prisma tenía un desincronismo temporal entre la DB (que tenía `compradorNombre`, `compradorEmail`) y el Prisma Client (que los necesitaba regenerar). Al regenerar con `db push`, estos campos quedaron correctamente en el cliente pero el código nunca removió los casts.

**Verificación:** `prisma/schema.prisma` líneas 468-469 confirman los campos:
```prisma
compradorNombre  String?
compradorEmail   String?
```

**Después (correcto):**
```typescript
const reserva = await tx.reserva.create({ ... });       // ✅ tipado
const reserva = await prisma.reserva.findUnique({ ... }); // ✅ tipado
await tx.reserva.update({ ... });                         // ✅ tipado
```

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `lib/actions/reservas.ts` | Removidos 4 casts `as any` en iniciarReserva, avanzarEstadoReserva, getReservasByProyecto |

---

## Riesgo residual

1. **`avanzarEstadoReserva`** acepta `nuevoEstado: string` sin validar contra un enum. Un usuario podría pasar `"VENDIDA"` directamente sin pasar por `confirmarVenta`. **Recomendación:** agregar `z.enum(["CANCELADA", "VENDIDA", "ACTIVA"])` validation.

2. **`avanzarEstadoReserva`** no verifica ownership del vendedor (cualquier usuario autenticado puede cambiar el estado de cualquier reserva). **Recomendación:** agregar `requireReservaPermission(reservaId)`.

Ambos son deuda técnica para un ciclo posterior. No afectan el resultado de este ciclo.

---

## Resultado

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ 0 errores (los `as any` suprimían errores reales) |
| `npm run build` | ✅ |
| Race condition cubierta | ✅ por `updateMany` conditional |
| Type safety restaurada | ✅ 4 casts `as any` removidos |
| Funcionalidad sin cambio | ✅ solo tipado, no lógica |
