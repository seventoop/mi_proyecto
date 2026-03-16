#!/usr/bin/env pwsh
# =============================================================================
# check-lead-create.ps1
#
# Guardrail: Verify there are no unauthorized `lead.create` calls outside of
# the canonical pipeline defined in lib/crm-pipeline.ts.
#
# Usage:
#   .\scripts\check-lead-create.ps1
#
# Exit codes:
#   0 — No violations found. System is clean.
#   1 — Unauthorized lead.create calls detected. Review output above.
#
# Reference:
#   docs/architecture/mutation-and-lead-ingestion-rules.md
# =============================================================================

$ErrorActionPreference = "Stop"

# Files allowed to contain `lead.create` directly (relative paths from repo root)
$ALLOWED_PATHS = @(
    "lib\crm-pipeline.ts"
    "lib/crm-pipeline.ts"
)

# Patterns to detect (treated as simple string patterns for Select-String)
$PATTERNS = @(
    "prisma.lead.create",
    "db.lead.create",
    "prisma.lead.createMany",
    "db.lead.createMany"
)

# Directories to exclude
$EXCLUDE_DIRS = @(".next", "node_modules", ".git", "dist", "out", "scripts")

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Guardrail: Lead Creation Authorization Check" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Searching for unauthorized lead.create calls..." -ForegroundColor Gray
Write-Host ""

$violations = @()

# Collect all .ts and .tsx files, excluding ignored directories
$files = Get-ChildItem -Recurse -Include "*.ts","*.tsx" -File | Where-Object {
    $path = $_.FullName
    $skip = $false
    foreach ($excl in $EXCLUDE_DIRS) {
        if ($path -match [regex]::Escape("\$excl\") -or $path -match [regex]::Escape("/$excl/")) {
            $skip = $true
            break
        }
    }
    -not $skip
}

foreach ($file in $files) {
    foreach ($pattern in $PATTERNS) {
        $matches = Select-String -Path $file.FullName -Pattern ([regex]::Escape($pattern)) -SimpleMatch
        
        foreach ($match in $matches) {
            $lineContent = $match.Line.Trim()
            
            # Skip pure comments
            if ($lineContent -match "^//") { continue }
            if ($lineContent -match "^\*") { continue }
            if ($lineContent -match "^#") { continue }
            
            # Normalize path for comparison
            $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\").TrimStart("/")
            $normalizedPath = $relativePath -replace "\\", "/"
            
            # Check if authorized
            $isAllowed = $false
            foreach ($allowed in $ALLOWED_PATHS) {
                $normalizedAllowed = $allowed -replace "\\", "/"
                if ($normalizedPath -like "*$normalizedAllowed*") {
                    $isAllowed = $true
                    break
                }
            }
            
            if (-not $isAllowed) {
                $violations += [PSCustomObject]@{
                    File    = $normalizedPath
                    Line    = $match.LineNumber
                    Content = $lineContent
                    Pattern = $pattern
                }
            }
        }
    }
}

# --- Report ------------------------------------------------------------------

if ($violations.Count -eq 0) {
    Write-Host "✅  No violations found." -ForegroundColor Green
    Write-Host ""
    Write-Host "All lead creation is properly routed through:" -ForegroundColor Gray
    Write-Host "  -> lib/crm-pipeline.ts :: executeLeadReception()" -ForegroundColor Gray
    Write-Host ""
    exit 0
} else {
    Write-Host "VIOLATIONS DETECTED: $($violations.Count) unauthorized lead.create call(s)" -ForegroundColor Red
    Write-Host ""
    Write-Host "The following files bypass the central pipeline:" -ForegroundColor Yellow
    Write-Host ""

    foreach ($v in $violations) {
        Write-Host "  FILE   : $($v.File)" -ForegroundColor Red
        Write-Host "  LINE   : $($v.Line)" -ForegroundColor Red
        Write-Host "  MATCH  : $($v.Content)" -ForegroundColor DarkRed
        Write-Host "  PATTERN: $($v.Pattern)" -ForegroundColor Gray
        Write-Host ""
    }

    Write-Host "Resolution: Route all lead creation through:" -ForegroundColor Yellow
    Write-Host "  executeLeadReception() in lib/crm-pipeline.ts" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Reference: docs/architecture/mutation-and-lead-ingestion-rules.md" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
