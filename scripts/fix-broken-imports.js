/**
 * Script para arreglar imports rotos donde el import de environment
 * fue insertado en medio de un import multi-línea
 * Uso: node scripts/fix-broken-imports.js
 */

const fs = require('fs');
const path = require('path');

// Buscar archivos TypeScript recursivamente
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory() && !item.includes('node_modules')) {
      findTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.spec.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

const srcDir = path.join(process.cwd(), 'src', 'app');
const files = findTsFiles(srcDir);

let totalFixed = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Patrón para encontrar imports rotos:
  // import {
  // import { environment } from '...';
  //   SomeType,
  // } from 'module';
  const brokenImportPattern = /import\s*\{\s*\n\s*import\s*\{\s*environment\s*\}\s*from\s*['"][^'"]+['"];\s*\n([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"];/g;

  let match;
  while ((match = brokenImportPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    const types = match[1];
    const modulePath = match[2];

    // Reconstruir el import correctamente
    const fixedImport = `import {\n${types}} from '${modulePath}';`;

    content = content.replace(fullMatch, fixedImport);
    modified = true;
  }

  // Si hay import duplicado de environment después de arreglar, eliminar duplicados
  const envImportRegex = /import\s*\{\s*environment\s*\}\s*from\s*['"][^'"]+['"];\s*\n/g;
  const envMatches = content.match(envImportRegex);
  if (envMatches && envMatches.length > 1) {
    // Mantener solo el primer import de environment
    let firstFound = false;
    content = content.replace(envImportRegex, (match) => {
      if (!firstFound) {
        firstFound = true;
        return match;
      }
      return '';
    });
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
    totalFixed++;
  }
});

console.log('\n========================================');
console.log(`✅ Archivos corregidos: ${totalFixed}`);
console.log('========================================');
