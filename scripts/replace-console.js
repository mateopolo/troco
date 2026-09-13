#!/usr/bin/env node
/**
 * Script pour remplacer console.warn et console.error par logger.warn et logger.error
 * dans tous les fichiers src/ (hors tests, hors logger.js, hors sentry.js)
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const EXCLUDE_FILES = ['logger.js', 'logger.test.js', 'sentry.js', 'sentry.test.js'];
const EXCLUDE_DIRS = ['node_modules'];

// Fichiers déjà traités (pour éviter les doublons)
const processedFiles = new Set();

/**
 * Vérifie si un fichier doit être traité
 */
function shouldProcessFile(filePath) {
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Exclure les tests
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return false;
  }
  
  // Exclure les fichiers spécifiques
  const fileName = path.basename(filePath);
  if (EXCLUDE_FILES.includes(fileName)) {
    return false;
  }
  
  // Exclure les node_modules
  if (relativePath.includes('node_modules')) {
    return false;
  }
  
  // Ne traiter que .js et .jsx
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return false;
  }
  
  return true;
}

/**
 * Vérifie si un fichier contient console.warn ou console.error
 */
function hasConsoleWarningsOrErrors(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes('console.warn') || content.includes('console.error');
}

/**
 * Vérifie si un fichier contient déjà l'import de logger
 */
function hasLoggerImport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes("from './utils/logger'") || 
         content.includes("from './utils/logger.js'") ||
         content.includes('import logger') ||
         content.includes("import { logger }");
}

/**
 * Ajoute l'import de logger
 */
function addLoggerImport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Trouver la position d'insertion (après les autres imports)
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Trouver la dernière ligne d'import
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('export ')) {
      insertIndex = i + 1;
    } else if (line === '' && insertIndex > 0) {
      // Si ligne vide après un import, l'utiliser
      insertIndex = i + 1;
      break;
    } else if (line && !line.startsWith('//') && insertIndex > 0) {
      // Si on trouve du code après les imports, s'arrêter
      break;
    }
  }
  
  // Insérer l'import de logger
  const importLine = "import logger from './utils/logger';";
  lines.splice(insertIndex, 0, importLine);
  
  const newContent = lines.join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  return true;
}

/**
 * Remplace console.warn par logger.warn
 */
function replaceConsoleWarn(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Remplacer console.warn( par logger.warn(
  let newContent = content.replace(/console\.warn\(/g, 'logger.warn(');
  
  // Gérer les cas où il y a un espace avant la parenthèse
  newContent = newContent.replace(/console\.warn /g, 'logger.warn ');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
}

/**
 * Remplace console.error par logger.error
 */
function replaceConsoleError(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Remplacer console.error( par logger.error(
  let newContent = content.replace(/console\.error\(/g, 'logger.error(');
  
  // Gérer les cas où il y a un espace avant la parenthèse
  newContent = newContent.replace(/console\.error /g, 'logger.error ');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
}

/**
 * Traite un fichier
 */
function processFile(filePath) {
  if (!shouldProcessFile(filePath)) {
    return { skipped: true, reason: 'excluded' };
  }
  
  if (!hasConsoleWarningsOrErrors(filePath)) {
    return { skipped: true, reason: 'no console.warn/error' };
  }
  
  // Ajouter l'import si nécessaire
  if (!hasLoggerImport(filePath)) {
    addLoggerImport(filePath);
  }
  
  // Remplacer les appels
  replaceConsoleWarn(filePath);
  replaceConsoleError(filePath);
  
  return { processed: true };
}

/**
 * Parcourt récursivement les fichiers
 */
function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else {
      callback(filePath);
    }
  }
}

/**
 * Main
 */
function main() {
  console.log('Recherche des fichiers à traiter...');
  
  const filesToProcess = [];
  walkDir(SRC_DIR, (filePath) => {
    if (shouldProcessFile(filePath) && hasConsoleWarningsOrErrors(filePath)) {
      filesToProcess.push(filePath);
    }
  });
  
  console.log(`Fichiers trouvés: ${filesToProcess.length}`);
  
  for (const filePath of filesToProcess) {
    const relativePath = path.relative(SRC_DIR, filePath);
    console.log(`Traitement de: ${relativePath}`);
    
    try {
      const result = processFile(filePath);
      if (result.processed) {
        console.log(`  ✓ Traité`);
      } else {
        console.log(`  - Ignoré: ${result.reason}`);
      }
    } catch (err) {
      console.error(`  ✗ Erreur: ${err.message}`);
    }
  }
  
  console.log('\nTraitement terminé!');
}

main();
