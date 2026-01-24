/**
 * Script completo para arreglar todos los imports de environment
 * 1. Elimina cualquier import de environment roto
 * 2. Añade el import correcto al final de los imports
 * Uso: node scripts/fix-all-imports.js
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
  let modified = false;

  // Verificar si usa 'environment.'
  const usesEnvironment = /\benvironment\./g.test(content);
  if (!usesEnvironment) return;

  // Paso 1: Eliminar cualquier import de environment roto o mal ubicado
  // Patrón para imports rotos dentro de otros imports
  const brokenPattern = /\nimport { environment } from '[^']+';(?=\n\s+\w)/g;
  if (brokenPattern.test(content)) {
    content = content.replace(brokenPattern, '');
    modified = true;
  }

  // Paso 2: Eliminar todos los imports de environment existentes
  const envImportPattern = /import\s*\{\s*environment\s*\}\s*from\s*['"][^'"]+['"];\s*\n?/g;
  content = content.replace(envImportPattern, '');

  // Paso 3: Calcular la ruta correcta
  const fileDir = path.dirname(filePath);
  const relativePath = path.relative(fileDir, envDir).replace(/\\/g, '/');
  const importPath = relativePath + '/environment';
  const importStatement = `import { environment } from '${importPath}';\n`;

  // Paso 4: Encontrar el final de todos los imports (incluyendo multi-línea)
  const lines = content.split('\n');
  let lastImportEnd = -1;
  let inMultiLineImport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detectar inicio de import
    if (trimmed.startsWith('import ')) {
      // Verificar si es multi-línea (no termina con ';')
      if (!trimmed.endsWith(';')) {
        inMultiLineImport = true;
      } else {
        lastImportEnd = i;
      }
    }

    // Detectar fin de import multi-línea
    if (inMultiLineImport && trimmed.includes('} from ')) {
      lastImportEnd = i;
      inMultiLineImport = false;
    }
  }

  // Paso 5: Insertar el import después del último import
  if (lastImportEnd >= 0) {
    lines.splice(lastImportEnd + 1, 0, importStatement.trim());
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)}`);
    console.log(`   → ${importPath}`);
    totalFixed++;
  }
});

console.log('\n========================================');
console.log(`✅ Archivos corregidos: ${totalFixed}`);
console.log('========================================');
