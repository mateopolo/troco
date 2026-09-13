#!/usr/bin/env node
/**
 * Script pour corriger tous les imports logger mal placés
 * Déplace TOUS les imports logger au tout début du fichier
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
  const lines = content.split('\n');
  
  // Trouver toutes les lignes qui contiennent 'import logger from'
  const loggerImportIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().includes('import logger from')) {
      loggerImportIndices.push(i);
    }
  }
  
  if (loggerImportIndices.length === 0) {
    return false;
  }
  
  // Supprimer toutes les lignes d'import logger
  for (const index of loggerImportIndices.reverse()) {
    lines.splice(index, 1);
  }
  
  // Calculer le bon chemin
  const loggerPath = calculateLoggerPath(filePath);
  const importLine = `import logger from '${loggerPath}';`;
  
  // Trouver où insérer : après les commentaires de tête, mais avant tout autre code
  let insertIndex = 0;
  let inCommentBlock = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Si on est dans un bloc de commentaire multi-ligne
    if (inCommentBlock) {
      if (line.includes('*/')) {
        inCommentBlock = false;
        insertIndex = i + 1;
      }
      continue;
    }
    
    // Détecter le début d'un bloc de commentaire
    if (line.startsWith('/*') && !line.includes('*/')) {
      inCommentBlock = true;
      continue;
    }
    
    // Si la ligne est vide ou un commentaire simple, continuer
    if (line === '' || line.startsWith('//')) {
      insertIndex = i + 1;
      continue;
    }
    
    // Si c'est un import/export, continuer
    if (line.startsWith('import ') || line.startsWith('export ')) {
      insertIndex = i + 1;
      continue;
    }
    
    // On a trouvé du code, s'arrêter
    break;
  }
  
  // Insérer l'import
  lines.splice(insertIndex, 0, importLine);
  
  const newContent = lines.join('\n');
  
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
