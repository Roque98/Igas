/**
 * Script para corregir las rutas de importación de environment
 * Uso: node scripts/fix-env-imports.js
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
const envDir = path.join(process.cwd(), 'src', 'environments');
const files = findTsFiles(srcDir);

let totalFixed = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Buscar imports de environment con rutas incorrectas
  const envImportRegex = /import\s*\{\s*environment\s*\}\s*from\s*['"]([^'"]+environments\/environment)['"]/g;

  const match = content.match(envImportRegex);
  if (!match) return;

  // Calcular la ruta correcta
  const fileDir = path.dirname(filePath);
  const relativePath = path.relative(fileDir, envDir).replace(/\\/g, '/');
  const correctImportPath = relativePath + '/environment';

  // Reemplazar con la ruta correcta
  const newContent = content.replace(envImportRegex, `import { environment } from '${correctImportPath}'`);

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
    console.log(`   → ${correctImportPath}`);
    totalFixed++;
  }
});

console.log('\n========================================');
console.log(`✅ Archivos corregidos: ${totalFixed}`);
console.log('========================================');
