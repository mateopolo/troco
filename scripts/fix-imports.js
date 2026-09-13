#!/usr/bin/env node
/**
 * Corrige les imports de logger pour utiliser le bon chemin relatif
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

function fixImport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Compter combien de niveaux on doit remonter
  const relative = path.relative(SRC_DIR, filePath);
  const depth = (relative.match(/\\/g) || []).length;
  
  if (depth === 0) {
    // Fichier dans src/ directement
    return content.replace(
      /from '\.\/utils\/logger'/g,
      "from './utils/logger'"
    );
  } else {
    // Fichier dans un sous-dossier
    const prefix = '../'.repeat(depth);
    return content.replace(
      /from '\.\/utils\/logger'/g,
      `from '${prefix}utils/logger'`
    );
  }
}

function main() {
  console.log('Correction des imports logger...');
  
  let count = 0;
  walkDir(SRC_DIR, (filePath) => {
    if ((filePath.endsWith('.js') || filePath.endsWith('.jsx')) &&
        filePath.includes('src')) {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes("from './utils/logger'")) {
        const newContent = fixImport(filePath);
        if (newContent !== content) {
          fs.writeFileSync(filePath, newContent, 'utf8');
          count++;
          console.log(`  Fixed: ${path.relative(SRC_DIR, filePath)}`);
        }
      }
    }
  });
  
  console.log(`\n${count} fichiers corrigés.`);
}

main();
