# Fix C2 — GET+PUT /api/crm/leads/[id]: IDOR via Org Check

**Rama:** `daniel/landing-audit`
**Fecha:** 2026-03-13
**Riesgo original:** CRÍTICO — cualquier usuario autenticado podía leer o modificar el lead de otra organización con solo conocer su CUID.

---

## Cambio

**Archivo:** `app/api/crm/leads/[id]/route.ts`

### Helper agregado (top-level)
```ts
function hasLeadAccess(sessionUser: any, leadOrgId: string | null): boolean {
    if (sessionUser.role === "ADMIN" || sessionUser.role === "SUPERADMIN") return true;
    if (!leadOrgId) return true; // lead legacy sin org
    return (sessionUser as any).orgId === leadOrgId;
}
```

### GET
Después de obtener el lead de la DB, antes de retornarlo:
```ts
if (!hasLeadAccess(session.user, lead.orgId)) {
    return NextResponse.json({ message: "Lead no encontrado" }, { status: 404 });
}
```

### PUT
Antes de parsear el body (para no ejecutar trabajo innecesario antes del check):
```ts
const existingLead = await db.lead.findUnique({
    where: { id: params.id },
    select: { orgId: true },
});
if (!existingLead) return 404;
if (!hasLeadAccess(session.user, existingLead.orgId)) return 404;
```

**Decisión de diseño:** Se retorna `404` en lugar de `403` para no revelar la existencia del lead a usuarios de otras organizaciones.

**Leads sin orgId:** Mantenidos accesibles para compatibilidad con leads legacy creados antes de la migración multi-tenant.

---

## Test Manual

### Pre-requisitos
- Dev local corriendo (`npm run dev`)
- Lead L1 con `orgId = ORG_A`
- Usuarios:
  - `admin@test.com` — ADMIN
  - `vendedor1@org-a.com` — VENDEDOR, `orgId = ORG_A`
  - `vendedor2@org-b.com` — VENDEDOR, `orgId = ORG_B`

### Casos GET

#### 1. ADMIN puede leer lead de cualquier org → 200
```bash
curl http://localhost:3000/api/crm/leads/<L1_ID> \
  -H "Cookie: next-auth.session-token=<ADMIN_TOKEN>"
# Esperado: 200 + datos del lead
```

#### 2. Vendedor de la misma org puede leer su lead → 200
```bash
curl http://localhost:3000/api/crm/leads/<L1_ID> \
  -H "Cookie: next-auth.session-token=<VENDEDOR1_TOKEN>"
# Esperado: 200 + datos del lead
```

#### 3. Vendedor de otra org recibe 404
```bash
curl http://localhost:3000/api/crm/leads/<L1_ID> \
  -H "Cookie: next-auth.session-token=<VENDEDOR2_TOKEN>"
# Esperado: 404 {"message":"Lead no encontrado"}
```

#### 4. Sin sesión → 401
```bash
curl http://localhost:3000/api/crm/leads/<L1_ID>
# Esperado: 401 {"message":"No autorizado"}
```

### Casos PUT

#### 5. ADMIN puede editar lead de cualquier org → 200
```bash
curl -X PUT http://localhost:3000/api/crm/leads/<L1_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<ADMIN_TOKEN>" \
  -d '{"nombre": "Test Admin Edit"}'
# Esperado: 200 + lead actualizado
```

#### 6. Vendedor de otra org no puede editar → 404
```bash
curl -X PUT http://localhost:3000/api/crm/leads/<L1_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<VENDEDOR2_TOKEN>" \
  -d '{"nombre": "IDOR Hack"}'
# Esperado: 404 {"message":"Lead no encontrado"}
```

#### 7. Vendedor mismo org puede editar → 200
```bash
curl -X PUT http://localhost:3000/api/crm/leads/<L1_ID> \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<VENDEDOR1_TOKEN>" \
  -d '{"nota": "Seguimiento realizado"}'
# Esperado: 200 + lead con nota agregada
```

---

## Resultado

| Check | Estado |
|-------|--------|
| `npm run typecheck` | ✅ 0 errores |
| `npm run build` | ✅ exitoso |
| ADMIN bypass | ✅ |
| Mismo org → acceso | ✅ |
| Otro org → 404 (no leak) | ✅ |
| Sin sesión → 401 | ✅ (check preexistente) |
