#!/usr/bin/env node
/**
 * Corrige le placement des imports logger
 * Place tous les imports logger au début du fichier avec les autres imports
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

function fixLoggerPlacement(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Trouver toutes les lignes qui importent logger
  const loggerImportIndices = [];
  const loggerImportLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('import logger from') || line.includes("import logger from")) {
      loggerImportIndices.push(i);
      loggerImportLines.push(line);
    }
  }
  
  if (loggerImportIndices.length === 0) {
    return false;
  }
  
  // Supprimer tous les imports logger
  for (const index of loggerImportIndices.reverse()) {
    lines.splice(index, 1);
  }
  
  // Trouver le bon endroit pour les placer
  // 1. Après les commentaires de tête
  // 2. Après les autres imports
  let insertIndex = 0;
  let inImportSection = false;
  let lastImportIndex = -1;
  let hasCodeAfterImport = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Sauter les lignes vides au début
    if (line === '' && insertIndex === 0) {
      insertIndex = i + 1;
      continue;
    }
    
    // Sauter les commentaires au début
    if (line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      if (insertIndex === 0) {
        insertIndex = i + 1;
      }
      continue;
    }
    
    // Si on trouve un import, noter sa position
    if (line.startsWith('import ') || line.startsWith('export ')) {
      lastImportIndex = i;
      inImportSection = true;
    } else if (line && !line.startsWith('//') && inImportSection) {
      // On a trouvé du code après les imports
      hasCodeAfterImport = true;
      inImportSection = false;
      break;
    }
  }
  
  // Déterminer l'index d'insertion
  if (lastImportIndex >= 0) {
    // Si le fichier a des imports, placer après le dernier import
    insertIndex = lastImportIndex + 1;
  }
  
  // Insérer tous les imports logger
  for (const importLine of loggerImportLines) {
    lines.splice(insertIndex, 0, importLine);
    insertIndex++;
  }
  
  const newContent = lines.join('\n');
  
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('Correction du placement des imports logger...');
  
  let count = 0;
  walkDir(SRC_DIR, (filePath) => {
    if ((filePath.endsWith('.js') || filePath.endsWith('.jsx')) &&
        filePath.includes('src')) {
      if (fixLoggerPlacement(filePath)) {
        count++;
        console.log(`  Fixed: ${path.relative(SRC_DIR, filePath)}`);
      }
    }
  });
  
  console.log(`\n${count} fichiers corrigés.`);
}

main();
