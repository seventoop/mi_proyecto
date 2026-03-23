#!/bin/bash
# Este script configura las variables de entorno para la publicación
export DATABASE_URL="postgresql://postgres:password@helium/heliumdb?sslmode=disable"
echo "✓ DATABASE_URL configurada"
