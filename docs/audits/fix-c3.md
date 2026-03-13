# Fix C3 — Race Condition en Reservas: Auditoría

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Estado:** ✅ Ya mitigado — sin cambio de código requerido

---

## Diagnóstico

La función `createReserva` en `lib/actions/reservas.ts` usa este patrón:

```typescript
const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.unidad.updateMany({
        where: { id: data.unidadId, estado: "DISPONIBLE" },
        data:  { estado: "RESERVADA_PENDIENTE" }
    });
    if (updated.count === 0) throw new Error("La unidad ya no está disponible");
    const newReserva = await tx.reserva.create({ ... });
    return newReserva;
});
```

La preocupación original: ¿pueden dos requests concurrentes pasar el check simultáneamente?

---

## Análisis del patrón

**Respuesta: NO en PostgreSQL con READ COMMITTED (aislamiento por defecto de Prisma).**

Comportamiento de `UPDATE ... WHERE estado = 'DISPONIBLE'`:

1. Transaction A ejecuta el `UPDATE` → PostgreSQL adquiere un **exclusive row lock** en la fila de la unidad.
2. Transaction B ejecuta el mismo `UPDATE` simultáneamente → PostgreSQL **bloquea B** hasta que A finalice.
3. A hace commit → el estado es ahora `RESERVADA_PENDIENTE`.
4. B obtiene el lock → **re-evalúa el WHERE** con los datos commiteados → `estado = 'DISPONIBLE'` ya no matchea → `count = 0`.
5. B lanza la excepción "La unidad ya no está disponible".

Este patrón de "conditional UPDATE como lock atómico" es correcto y ampliamente usado en sistemas de reservas con PostgreSQL. No requiere `SELECT ... FOR UPDATE` explícito.

---

## Hallazgos residuales (no son race conditions, son deuda técnica)

### 1. `iniciarReserva` usa `(tx.reserva as any).create`
```typescript
const reserva = await (tx.reserva as any).create({
    data: { compradorNombre, compradorEmail, ... }
});
```
El `as any` indica que `compradorNombre`/`compradorEmail` pueden no estar en el schema Prisma tipado (pero sí en la DB vía `db push`). La race condition es igual de segura, pero el cast es deuda técnica.

**Riesgo:** Si alguien corre `prisma migrate reset` sin los campos, el runtime fallará con error no tipado.

**Plan correcto:** Agregar los campos al schema Prisma y crear una migración formal.

### 2. `avanzarEstadoReserva` no valida ownership del vendedor
El handler acepta cualquier `nuevoEstado` string arbitrario sin validar contra un enum.

**Riesgo:** Un usuario podría pasar `nuevoEstado = "VENDIDA"` saltando el flujo de aprobación.

**Plan correcto:** Validar `nuevoEstado` contra valores permitidos según el rol del usuario.

---

## Conclusión

**C3 como race condition: RESUELTO por el código existente.**

No se requiere cambio de código. El `updateMany` con `WHERE estado = 'DISPONIBLE'` dentro de `$transaction` es la solución correcta para PostgreSQL.

Los items residuales quedan registrados como deuda técnica para resolución futura.
