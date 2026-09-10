#!/usr/bin/env bash
# ==============================================================================
# 🛡️ TROCO — Script de Sauvegarde / Export Firestore avant Migration [VERIF-02]
# ==============================================================================
set -euo pipefail

# Configuration
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "troco-app-production")
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_BUCKET="${BACKUP_BUCKET:-gs://${PROJECT_ID}-firestore-backups}"
TARGET_PATH="${BACKUP_BUCKET}/pre_migration_${TIMESTAMP}"

echo "======================================================================"
echo "📦 Début de la sauvegarde d'urgence Firestore — Projet: ${PROJECT_ID}"
echo "📍 Destination : ${TARGET_PATH}"
echo "⏰ Horodatage  : ${TIMESTAMP}"
echo "======================================================================"

# 1. Vérification des prérequis gcloud
if ! command -v gcloud &> /dev/null; then
  echo "❌ ERREUR : La CLI gcloud est requise pour effectuer l'export Firestore."
  exit 1
fi

# 2. Vérification / création du bucket de stockage
echo "🔍 Vérification du bucket de sauvegarde..."
if ! gsutil ls -b "${BACKUP_BUCKET}" &> /dev/null; then
  echo "⚠️ Bucket ${BACKUP_BUCKET} inexistant. Tentative de création..."
  gsutil mb -p "${PROJECT_ID}" -c standard -l europe-west1 "${BACKUP_BUCKET}" || {
    echo "❌ Échec de la création du bucket de sauvegarde."
    exit 1
  }
fi

# 3. Déclenchement de l'export Firestore pour les collections sensibles
echo "🚀 Exportation des collections critiques ('chats', 'users', 'calls')..."
gcloud firestore export "${TARGET_PATH}" \
  --project="${PROJECT_ID}" \
  --collection-ids='chats,users,calls'

echo "======================================================================"
echo "✅ Sauvegarde Firestore terminée avec succès !"
echo "📁 Emplacement : ${TARGET_PATH}"
echo "🔄 Commande de rollback en cas d'incident :"
echo "   gcloud firestore import \"${TARGET_PATH}\" --project=\"${PROJECT_ID}\""
echo "======================================================================"
