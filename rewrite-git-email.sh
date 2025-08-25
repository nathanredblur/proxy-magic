#!/bin/bash

# Script para reescribir todos los commits de git con el nuevo email
# Este script cambia tanto el author como el committer email de todos los commits

set -e

# Configuración
NEW_EMAIL="jon.nathan.rich@gmail.com"
REPO_PATH="/Users/nathanredblur/my-projects/proxy-magic"

echo "🔧 Reescribiendo el email de todos los commits en el repositorio..."
echo "📧 Nuevo email: $NEW_EMAIL"
echo "📁 Repositorio: $REPO_PATH"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -d ".git" ]; then
    echo "❌ Error: No se encontró el directorio .git. Asegúrate de estar en la raíz del repositorio."
    exit 1
fi

# Mostrar información del estado actual
echo "📊 Estado actual del repositorio:"
git log --oneline -5
echo ""

# Crear backup del branch actual
CURRENT_BRANCH=$(git branch --show-current)
echo "💾 Creando backup del branch actual ($CURRENT_BRANCH)..."
git branch backup-before-email-rewrite 2>/dev/null || echo "⚠️  El branch backup-before-email-rewrite ya existe"
echo ""

# Advertencia y confirmación
echo "⚠️  ADVERTENCIA: Este proceso reescribirá toda la historia de git."
echo "   - Se cambiarán TODOS los commits existentes"
echo "   - Los hashes de commit cambiarán"
echo "   - Se ha creado un backup en el branch 'backup-before-email-rewrite'"
echo ""
read -p "¿Continuar con la reescritura? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operación cancelada."
    exit 1
fi

echo ""
echo "🚀 Iniciando reescritura de la historia..."

# Reescribir la historia usando git filter-branch
git filter-branch --env-filter '
    # Cambiar tanto author como committer email en todos los commits
    export GIT_AUTHOR_EMAIL="'$NEW_EMAIL'"
    export GIT_COMMITTER_EMAIL="'$NEW_EMAIL'"
' --tag-name-filter cat -- --branches --tags

echo ""
echo "✅ Historia reescrita exitosamente!"

# Configurar git para futuros commits en este repositorio
echo "⚙️  Configurando git para futuros commits..."
git config user.email "$NEW_EMAIL"

# Verificar la configuración
echo ""
echo "🔍 Verificando la configuración:"
echo "📧 Email configurado para este repositorio: $(git config user.email)"
echo "👤 Nombre configurado: $(git config user.name || echo 'No configurado')"
echo ""

# Mostrar los últimos commits para verificar
echo "📊 Últimos 5 commits después de la reescritura:"
git log --pretty=format:"%h - %an <%ae> : %s" -5
echo ""
echo ""

echo "✅ ¡Proceso completado exitosamente!"
echo ""
echo "📋 Resumen de cambios:"
echo "  ✓ Todos los commits existentes ahora usan: $NEW_EMAIL"
echo "  ✓ Futuros commits en este repositorio usarán: $NEW_EMAIL"
echo "  ✓ Backup disponible en branch: backup-before-email-rewrite"
echo ""
echo "🔄 Próximos pasos recomendados:"
echo "  1. Verificar que los commits se ven correctos: git log --oneline -10"
echo "  2. Si todo está bien, hacer push forzado: git push --force-with-lease origin main"
echo "  3. Si hay problemas, restaurar desde backup: git reset --hard backup-before-email-rewrite"
echo ""
echo "⚠️  IMPORTANTE: Si este repositorio es compartido con otros,"
echo "   todos los colaboradores necesitarán hacer 'git clone' de nuevo"
echo "   debido a que la historia ha cambiado."
