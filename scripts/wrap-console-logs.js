/**
 * Script para envolver console.log/error/warn con verificación de producción
 * Uso: node scripts/wrap-console-logs.js
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

let totalUpdated = 0;
let totalReplaced = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let replacements = 0;

  // Verificar si ya tiene el import de environment
  const hasEnvImport = content.includes("from '../../../environments/environment'") ||
                       content.includes("from '../../../../environments/environment'") ||
                       content.includes("from '../environments/environment'") ||
                       content.includes('from "src/environments/environment"') ||
                       content.includes("from 'src/environments/environment'");

  // Patrones de console que NO están ya envueltos
  // Buscar console.log/error/warn que no estén precedidos por !environment.production
  const consolePatterns = [
    // console.log(...);
    /(?<!\!environment\.production\s*(?:&&|\?\s*)?\s*)(\bconsole\.log\s*\([^;]+\);?)/g,
    // console.error(...);
    /(?<!\!environment\.production\s*(?:&&|\?\s*)?\s*)(\bconsole\.error\s*\([^;]+\);?)/g,
    // console.warn(...);
    /(?<!\!environment\.production\s*(?:&&|\?\s*)?\s*)(\bconsole\.warn\s*\([^;]+\);?)/g,
  ];

  // Función para determinar la profundidad de directorio desde src/app
  function getEnvImportPath(filePath) {
    const relativePath = path.relative(srcDir, filePath);
    const depth = relativePath.split(path.sep).length;
    return '../'.repeat(depth) + '../environments/environment';
  }

  // Primero, identificar líneas con console que necesitan ser envueltas
  const lines = content.split('\n');
  const newLines = [];
  let needsEnvImport = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Verificar si la línea tiene console.log/error/warn
    const hasConsole = /\bconsole\.(log|error|warn)\s*\(/.test(line);

    // Verificar si ya está envuelta
    const isAlreadyWrapped = /!environment\.production/.test(line) ||
                             /if\s*\(\s*!environment\.production\s*\)/.test(lines[i-1] || '');

    if (hasConsole && !isAlreadyWrapped) {
      // Obtener la indentación actual
      const indent = line.match(/^(\s*)/)[1];

      // Envolver la línea
      const wrappedLine = `${indent}if (!environment.production) { ${line.trim()} }`;
      newLines.push(wrappedLine);
      needsEnvImport = true;
      replacements++;
      modified = true;
    } else {
      newLines.push(line);
    }
  }

  // Si hubo modificaciones y no tiene import de environment, agregarlo
  if (needsEnvImport && !hasEnvImport) {
    const envImportPath = getEnvImportPath(filePath);
    const importStatement = `import { environment } from '${envImportPath}';\n`;

    // Encontrar la última línea de imports
    let lastImportIndex = -1;
    for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }

    if (lastImportIndex >= 0) {
      newLines.splice(lastImportIndex + 1, 0, importStatement.trim());
    } else {
      newLines.unshift(importStatement.trim());
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
    console.log(`✅ ${path.relative(process.cwd(), filePath)} - ${replacements} console(s) envueltos`);
    totalUpdated++;
    totalReplaced += replacements;
  }
});

console.log('\n========================================');
console.log(`✅ Archivos actualizados: ${totalUpdated}`);
console.log(`📝 Console statements envueltos: ${totalReplaced}`);
console.log('========================================');
