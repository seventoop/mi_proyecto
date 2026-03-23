#!/bin/bash

echo "🔄 Preparando deployment con DATABASE_URL..."

# Exportar la variable de entorno
export DATABASE_URL="postgresql://postgres:password@helium/heliumdb?sslmode=disable"

echo "✓ DATABASE_URL = $DATABASE_URL"
echo ""
echo "🔨 Corriendo build de Next.js..."

# Limpiar build anterior
rm -rf .next

# Build con las variables correctas
NODE_OPTIONS="--max-old-space-size=4096" npm run build 2>&1 | tail -30

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completado exitosamente"
    echo "✓ DATABASE_URL está configurada para la publicación"
else
    echo ""
    echo "❌ Error en el build"
    exit 1
fi
