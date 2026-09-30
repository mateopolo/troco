/**
 * workspaceHelpers.js — Utilitaires de formatage et de sécurisation pour les outils Workspace.
 * Évite l'affichage des identifiants Firestore/UID alphanumériques bruts.
 */

/**
 * Détecte si une chaîne est un identifiant alphanumérique brut (UID Firebase, documentId, doc_xxx)
 * plutôt qu'un titre lisible destiné aux utilisateurs.
 */
export function isAlphanumericId(str) {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (trimmed.length === 0) return false;

  // 1. Identifiants Firebase classiques : chaîne de 16+ caractères sans espaces (ex: NaOVoz8nCfX6soAo1DCVAXeHDKZ2)
  if (/^[A-Za-z0-9_-]{16,}$/.test(trimmed)) return true;

  // 2. Préfixes automatiques de documents / boards générés
  if (/^(doc_|board-|ws_|chat_)[A-Za-z0-9_-]+$/i.test(trimmed)) return true;

  // 3. Préfixes de projet concaténés avec un ID brut (ex: "Notes - NaOVoz8nCfX6soAo1DCVAXeHDKZ2")
  if (/^(?:Notes|Spécifications & Notes|Budget & Planning|Présentation)\s*-\s*[A-Za-z0-9_-]{16,}$/i.test(trimmed)) {
    return true;
  }

  return false;
}

// Registre mémoire pour garantir une numérotation stable et déterministe par document ID
const docIdRegistry = new Map();
const typeCounters = {
  docs: 0,
  sheets: 0,
  slides: 0,
  notes: 0,
  whiteboard: 0,
};

/**
 * Formate un identifiant ou un titre brut en nom de document lisible.
 * Exemples :
 * - "Troco Docs"   → "Document 1" / "Document 2"
 * - "Troco Sheets" → "Tableur 1"
 * - "Troco Slides" → "Présentation 1"
 * - "Troco Notes"  → "Note rapide"
 */
export function formatDocumentName(idOrTitle, type = 'docs') {
  const normType = String(type || 'docs').toLowerCase();

  // Détermination du type canonique
  let canonicalType = 'docs';
  if (normType.includes('sheet') || normType.includes('tableur')) {
    canonicalType = 'sheets';
  } else if (normType.includes('slide') || normType.includes('présentation') || normType.includes('presentation')) {
    canonicalType = 'slides';
  } else if (normType.includes('note')) {
    canonicalType = 'notes';
  } else if (normType.includes('whiteboard') || normType.includes('board') || normType.includes('tableau')) {
    canonicalType = 'whiteboard';
  }

  // Si c'est déjà un vrai titre humain lisible (pas un ID alphanumérique brut)
  if (idOrTitle && typeof idOrTitle === 'string') {
    const trimmed = idOrTitle.trim();
    if (!isAlphanumericId(trimmed) && trimmed !== 'Sans titre' && trimmed !== 'Document sans titre') {
      return trimmed;
    }
  }

  // Identifiant de référence pour le cache
  const docKey = idOrTitle ? `${canonicalType}:${String(idOrTitle).trim()}` : null;
  if (docKey && docIdRegistry.has(docKey)) {
    return docIdRegistry.get(docKey);
  }

  let formatted = '';
  if (canonicalType === 'docs') {
    typeCounters.docs += 1;
    formatted = `Document ${typeCounters.docs}`;
  } else if (canonicalType === 'sheets') {
    typeCounters.sheets += 1;
    formatted = `Tableur ${typeCounters.sheets}`;
  } else if (canonicalType === 'slides') {
    typeCounters.slides += 1;
    formatted = `Présentation ${typeCounters.slides}`;
  } else if (canonicalType === 'notes') {
    typeCounters.notes += 1;
    formatted = typeCounters.notes === 1 ? 'Note rapide' : `Note rapide ${typeCounters.notes}`;
  } else if (canonicalType === 'whiteboard') {
    typeCounters.whiteboard += 1;
    formatted = typeCounters.whiteboard === 1 ? 'Tableau Blanc' : `Tableau Blanc ${typeCounters.whiteboard}`;
  }

  if (docKey) {
    docIdRegistry.set(docKey, formatted);
  }

  return formatted;
}
