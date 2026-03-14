# Identifier Strategy / Enumeration Defense

SevenToop employs a non-sequential identifier strategy to mitigate ID enumeration and scraping risks.

## Identifier Strategy (CUID)
The platform uses **CUID (Collision-resistant Unique Identifier)** for all primary entities in the database. Unlike sequential integer IDs, CUIDs are non-predictable and large enough to prevent brute-force guessing.

### Entities using CUID
- **Organization**
- **User**
- **Proyecto**
- **Etapa** / **Manzana** / **Unidad**
- **Lead** / **Reserva**
- **AuditLog**

## Compensating Controls
**Crucial Security Invariant**: 
> "Even if a valid identifier is guessed, tenant validation and ownership checks prevent cross-organization access."

The system does NOT rely solely on the "secrecy" of identifiers. Even if an attacker discovers a valid CUID for a resource belonging to another tenant:

1. **Authentication Guard**: `requireAuth()` ensures the user is identified.
2. **Tenant Isolation**: `orgFilter(user)` is applied to all queries, including `findUnique` and `findMany`, forcing the query to only return results belonging to the user's `orgId`.
3. **Ownership Validation**: Resource-specific guards like `requireProjectOwnership(projectId)` verify that the authenticated user has explicit permissions over that specific object.
4. **404 vs 403 Response**: If a valid ID exists but belongs to a different tenant, the system returns a `404 Not Found` rather than a `403 Forbidden` to avoid leaking the existence of the resource.

## Recommendations
- **Avoid exposure in URLs**: For highly sensitive public links (e.g., specific lead-only exports), consider temporary signed URLs or access tokens.
- **Maintain CUID consistency**: Ensure all new tables follow the `@default(cuid())` standard.
