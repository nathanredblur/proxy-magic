#!/bin/bash

# Script para verificar el estado actual de los emails en git

set -e

echo "🔍 Verificando estado actual del repositorio git..."
echo ""

echo "⚙️  Configuración actual:"
echo "📧 Email configurado para este repositorio: $(git config user.email 2>/dev/null || echo 'No configurado')"
echo "👤 Nombre configurado para este repositorio: $(git config user.name 2>/dev/null || echo 'No configurado')"
echo ""

echo "📊 Últimos 10 commits y sus emails:"
git log --pretty=format:"%C(yellow)%h%C(reset) - %C(blue)%ae%C(reset) : %s" -10 2>/dev/null || {
    echo "⚠️  No se pudo obtener el log de git. Verificando si estamos en un repositorio git..."
    if [ ! -d ".git" ]; then
        echo "❌ Error: No se encontró el directorio .git"
        exit 1
    fi
}
echo ""
echo ""

echo "🔍 Emails únicos encontrados en el repositorio:"
git log --pretty=format:"%ae" | sort | uniq -c | sort -nr 2>/dev/null || echo "⚠️  No se pudo obtener información de emails"
echo ""

echo "📋 Información del branch actual:"
echo "🌿 Branch: $(git branch --show-current 2>/dev/null || echo 'No disponible')"
echo "🔗 Remote: $(git remote -v 2>/dev/null | head -1 || echo 'No configurado')"
echo ""

if git show-ref --verify --quiet refs/heads/backup-before-email-rewrite; then
    echo "💾 Backup disponible: backup-before-email-rewrite"
else
    echo "⚠️  No hay backup disponible"
fi
