#!/usr/bin/env node
/**
 * Script V2 pour configurer logger proprement
 * 1. Ajoute l'import logger au TOUT DEBUT du fichier (ligne 0)
 * 2. Remplace console.warn/console.error
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const EXCLUDE_FILES = ['logger.js', 'sentry.js', 'index.js'];

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

function processFile(filePath) {
  const fileName = path.basename(filePath);
  const relativePath = path.relative(SRC_DIR, filePath);
  
  // Exclure certains fichiers
  if (EXCLUDE_FILES.includes(fileName)) {
    return { skipped: true, reason: 'excluded' };
  }
  
  // Exclure les tests
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) {
    return { skipped: true, reason: 'test file' };
  }
  
  // Ne traiter que .js et .jsx
  if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) {
    return { skipped: true, reason: 'not js/jsx' };
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Vérifier si le fichier a console.warn ou console.error
  if (!content.includes('console.warn') && !content.includes('console.error')) {
    return { skipped: true, reason: 'no console.warn/error' };
  }
  
  // Calculer le chemin
  const loggerPath = calculateLoggerPath(filePath);
  const importLine = `import logger from '${loggerPath}';`;
  
  // Vérifier si l'import existe déjà
  if (content.includes(importLine) || content.includes("import logger from")) {
    return { skipped: true, reason: 'already has logger import' };
  }
  
  // Ajouter l'import au TOUT DEBUT du fichier
  const lines = content.split('\n');
  lines.unshift(importLine);
  const newContent = lines.join('\n');
  
  fs.writeFileSync(filePath, newContent, 'utf8');
  
  // Maintenant remplacer console.warn et console.error
  let replacedContent = newContent;
  replacedContent = replacedContent.replace(/console\.warn\(/g, 'logger.warn(');
  replacedContent = replacedContent.replace(/console\.warn /g, 'logger.warn ');
  replacedContent = replacedContent.replace(/console\.error\(/g, 'logger.error(');
  replacedContent = replacedContent.replace(/console\.error /g, 'logger.error ');
  
  if (replacedContent !== newContent) {
    fs.writeFileSync(filePath, replacedContent, 'utf8');
  }
  
  return { processed: true };
}

function main() {
  console.log('Configuration logger V2...');
  
  const filesToProcess = [];
  walkDir(SRC_DIR, (filePath) => {
    const relativePath = path.relative(SRC_DIR, filePath);
    if (relativePath && !relativePath.startsWith('..')) {
      filesToProcess.push(filePath);
    }
  });
  
  let processed = 0;
  let skipped = 0;
  
  for (const filePath of filesToProcess) {
    const relativePath = path.relative(SRC_DIR, filePath);
    try {
      const result = processFile(filePath);
      if (result.processed) {
        console.log(`  ✓ ${relativePath}`);
        processed++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`  ✗ ${relativePath}: ${err.message}`);
    }
  }
  
  console.log(`\nTraités: ${processed}, Ignorés: ${skipped}`);
}

main();
