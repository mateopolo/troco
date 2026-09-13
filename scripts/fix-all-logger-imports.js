#!/usr/bin/env node
/**
 * Script ultime pour corriger tous les imports logger
 * 1. Supprime TOUS les imports logger (même dans les fonctions)
 * 2. Ajoute un seul import logger au bon endroit
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

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

function calculateLoggerPath(filePath) {
  const relative = path.relative(SRC_DIR, filePath);
  const depth = (relative.match(/[\\/]/g) || []).length;
  if (depth === 0) {
    return './utils/logger';
  } else {
    return '../'.repeat(depth) + 'utils/logger';
  }
}

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Si le fichier n'a pas d'import logger, skip
  if (!content.includes('import logger from')) {
    return false;
  }
  
  const lines = content.split('\n');
  
  // Supprimer toutes les lignes qui contiennent 'import logger from'
  const filteredLines = [];
  let hasLoggerImport = false;
  
  for (const line of lines) {
    if (line.trim().includes('import logger from')) {
      hasLoggerImport = true;
      continue; // Supprimer cette ligne
    }
    filteredLines.push(line);
  }
  
  if (!hasLoggerImport) {
    return false;
  }
  
  // Calculer le bon chemin
  const loggerPath = calculateLoggerPath(filePath);
  const importLine = `import logger from '${loggerPath}';`;
  
  // Trouver où insérer l'import
  let insertIndex = 0;
  let lastImportOrEmptyIndex = 0;
  let foundNonCommentNonEmpty = false;
  
  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i].trim();
    
    if (line === '') {
      // Ligne vide, potentiel point d'insertion
      if (!foundNonCommentNonEmpty) {
        lastImportOrEmptyIndex = i;
      }
      continue;
    }
    
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      // Commentaire, continuer
      if (!foundNonCommentNonEmpty) {
        lastImportOrEmptyIndex = i;
      }
      continue;
    }
    
    if (line.startsWith('import ') || line.startsWith('export ')) {
      // Autre import/export, continuer à chercher
      lastImportOrEmptyIndex = i;
      foundNonCommentNonEmpty = true;
      continue;
    }
    
    // On a trouvé du code qui n'est ni import ni export
    if (!foundNonCommentNonEmpty) {
      foundNonCommentNonEmpty = true;
    }
    break;
  }
  
  // Insérer l'import après le dernier import ou après les commentaires
  if (lastImportOrEmptyIndex >= 0 && 
      (filteredLines[lastImportOrEmptyIndex].trim().startsWith('import ') ||
       filteredLines[lastImportOrEmptyIndex].trim().startsWith('export ') ||
       filteredLines[lastImportOrEmptyIndex].trim() === '')) {
    insertIndex = lastImportOrEmptyIndex + 1;
  } else {
    insertIndex = 0;
  }
  
  // Insérer l'import
  filteredLines.splice(insertIndex, 0, importLine);
  
  const newContent = filteredLines.join('\n');
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('Correction de TOUS les imports logger...');
  
  let count = 0;
  walkDir(SRC_DIR, (filePath) => {
    if ((filePath.endsWith('.js') || filePath.endsWith('.jsx')) &&
        filePath.includes('src')) {
      if (fixFile(filePath)) {
        count++;
        console.log(`  Fixed: ${path.relative(SRC_DIR, filePath)}`);
      }
    }
  });
  
  console.log(`\n${count} fichiers corrigés.`);
}

main();
