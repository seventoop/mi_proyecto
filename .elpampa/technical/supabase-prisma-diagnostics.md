# Playbook Tecnico - Supabase Y Prisma

## Regla Principal

No inferir nombres fisicos de tablas desde los modelos TypeScript o Prisma Client. Usar una de estas fuentes:

- `@@map` en `prisma/schema.prisma`.
- `information_schema.tables`.
- `information_schema.columns`.

Ejemplo: el modelo Prisma `Tour360` usa la tabla fisica `tours_360`, y `Hotspot` usa `tour_hotspots`.

## Consulta Base Recomendada

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

## Conteo Compacto Seguro

```sql
select
  (select count(*) from public.organizations)::int as organizations_count,
  (select count(*) from public.users)::int as users_count,
  (select count(*) from public.proyectos)::int as proyectos_count,
  (select count(*) from public.unidades)::int as unidades_count,
  (select count(*) from public.tours_360)::int as tours_360_count,
  (select count(*) from public.tour_hotspots)::int as tour_hotspots_count;
```

## Diagnostico De Visibilidad Publica

```sql
select
  count(*)::int as total,
  count(*) filter (where "deletedAt" is null)::int as not_deleted,
  count(*) filter (where "visibilityStatus" = 'PUBLICADO')::int as publicado,
  count(*) filter (where estado not in ('SUSPENDIDO','CANCELADO','ELIMINADO','DESACTIVADO'))::int as estado_visible,
  count(*) filter (
    where "isDemo" = false
       or ("isDemo" = true and "demoExpiresAt" > now())
  )::int as demo_visible,
  count(*) filter (
    where "deletedAt" is null
      and "visibilityStatus" = 'PUBLICADO'
      and estado not in ('SUSPENDIDO','CANCELADO','ELIMINADO','DESACTIVADO')
      and ("isDemo" = false or ("isDemo" = true and "demoExpiresAt" > now()))
  )::int as public_visible
from public.proyectos;
```
