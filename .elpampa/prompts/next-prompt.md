Usa la skill $agente-el-pampa. Perfil: autonomo.

Estamos en Seventoop, una app Next.js + Prisma/Postgres para proyectos inmobiliarios. Ya se detecto que Supabase Seventoop tiene schema compatible pero la base conectada no tiene proyectos, usuarios ni unidades cargadas.

Objetivo del ciclo: revisar el reporte en `.elpampa/reports/2026-08-28-project-data-audit.md`, corregir la credencial de `DATABASE_URL` local que produce `P1000`, correr el script read-only `scripts/elpampa-project-data-audit.ts`, revisar el dry-run de `scripts/seed-el-pampa-projects.ts`, y decidir si aplicar ejemplos en local o en Supabase.

Reglas:
- No tocar produccion, Vercel, Supabase ni datos remotos sin confirmacion explicita adicional.
- No correr migraciones, syncs destructivos ni seeds apply sin confirmar destino.
- Si se aplican ejemplos, hacerlo primero en local o en una base de prueba.
- Usar nombres fisicos de tabla desde Prisma `@@map` o `information_schema`.
- Cerrar con reporte de ciclo en `.elpampa/`.
