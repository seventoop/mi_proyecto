$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "seed-projects.sql"

if (-not (Test-Path $sqlFile)) {
    throw "No se encontro el archivo SQL del seed: $sqlFile"
}

Write-Host "Aplicando seed de proyectos locales..."
Get-Content -Raw $sqlFile | docker exec -i seventoop_postgres psql -U usuario -d seventoop -v ON_ERROR_STOP=1

Write-Host ""
Write-Host "Aplicando enriquecimiento historico de datos publicos..."
npx ts-node --transpile-only --project prisma/tsconfig.seed.json scripts/seed-recovery-phase12.ts

Write-Host ""
Write-Host "Resumen:"
docker exec seventoop_postgres psql -U usuario -d seventoop -c "select count(*) as proyectos from proyectos;"
docker exec seventoop_postgres psql -U usuario -d seventoop -c "select nombre, slug, estado from proyectos order by nombre;"
