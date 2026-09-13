#!/usr/bin/env node
/**
 * Supprime TOUS les imports logger
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

function removeLoggerImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const newLines = [];
  let changed = false;
  
  for (const line of lines) {
    if (line.trim().includes('import logger from')) {
      changed = true;
      continue; // Supprimer cette ligne
    }
    newLines.push(line);
  }
  
  if (changed) {
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('Suppression de tous les imports logger...');
  
  let count = 0;
  walkDir(SRC_DIR, (filePath) => {
    if ((filePath.endsWith('.js') || filePath.endsWith('.jsx')) &&
        filePath.includes('src')) {
      if (removeLoggerImports(filePath)) {
        count++;
        console.log(`  Supprimé: ${path.relative(SRC_DIR, filePath)}`);
      }
    }
  });
  
  console.log(`\n${count} fichiers modifiés.`);
}

main();
