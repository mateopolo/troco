#!/usr/bin/env node
/**
 * Script pour corriger les chemins d'import de logger
 * Calculate le bon chemin relatif depuis chaque fichier
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const LOGGER_PATH = path.join(SRC_DIR, 'utils', 'logger.js');

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
 * Calcule le chemin relatif correct pour importer logger.js
 */
function getRelativePath(filePath) {
  const dir = path.dirname(filePath);
  const relative = path.relative(dir, LOGGER_PATH);
  
  // Convertir en chemin avec ./ et sans extension .js
  let result = './' + relative.replace(/\\/g, '/');
  
  // Si le chemin commence par ./utils, c'est bon
  // Sinon, ajouter ../
  if (relative.startsWith('..')) {
    result = relative.replace(/\\/g, '/') + '';
  }
  
  // Supprimer l'extension .js
  if (result.endsWith('.js')) {
    result = result.substring(0, result.length - 3);
  }
  
  return result;
}

/**
 * Corrige l'import logger dans un fichier
 */
function fixLoggerImport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Vérifier si le fichier a un import logger
  if (!content.includes("from './utils/logger'") && 
      !content.includes("from '../utils/logger'") &&
      !content.includes("from '../../utils/logger'")) {
    return false;
  }
  
  const correctPath = getRelativePath(filePath);
  
  // Remplacer toutes les variantes incorrectes
  let newContent = content;
  
  // Remplacer les imports logger incorrects
  newContent = newContent.replace(
    /from '\.\/utils\/logger'/g,
    `from '${correctPath}'`
  );
  
  newContent = newContent.replace(
    /from '\.\.\/utils\/logger'/g,
    `from '${correctPath}'`
  );
  
  // Si le chemin a changé, écrire le fichier
  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  
  return false;
}

/**
 * Main
 */
function main() {
  console.log('Correction des chemins d\'import logger...');
  
  let fixedCount = 0;
  
  walkDir(SRC_DIR, (filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      if (fixLoggerImport(filePath)) {
        const relativePath = path.relative(SRC_DIR, filePath);
        console.log(`  ✓ Corrigé: ${relativePath}`);
        fixedCount++;
      }
    }
  });
  
  console.log(`\n${fixedCount} fichiers corrigés.`);
}

main();
