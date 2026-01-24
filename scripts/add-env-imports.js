/**
 * Script para añadir imports de environment donde faltan
 * Uso: node scripts/add-env-imports.js
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

let totalAdded = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Verificar si usa 'environment' pero no tiene el import
  const usesEnvironment = /\benvironment\./g.test(content);
  const hasEnvImport = /import\s*\{\s*environment\s*\}\s*from/.test(content);

  if (usesEnvironment && !hasEnvImport) {
    // Calcular la ruta correcta
    const fileDir = path.dirname(filePath);
    const relativePath = path.relative(fileDir, envDir).replace(/\\/g, '/');
    const importPath = relativePath + '/environment';
    const importStatement = `import { environment } from '${importPath}';`;

    // Encontrar la última línea de imports
    const lines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importStatement);
    } else {
      lines.unshift(importStatement);
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
    console.log(`   → ${importPath}`);
    totalAdded++;
  }
});

console.log('\n========================================');
console.log(`✅ Imports añadidos: ${totalAdded}`);
console.log('========================================');
