/**
 * Script para agregar ChangeDetectionStrategy.OnPush a todos los componentes
 * Uso: node scripts/add-onpush.js
 */

const fs = require('fs');
const path = require('path');

// Lista de archivos a actualizar
const files = [
  'src/app/app.component.ts',
  'src/app/core/components/toast-container/toast-container.component.ts',
  'src/app/demo/dashboard/dashboard.component.ts',
  'src/app/demo/extra/sample-page/sample-page.component.ts',
  'src/app/demo/pages/authentication/auth-forgot-password/auth-forgot-password.component.ts',
  'src/app/demo/pages/authentication/auth-reset-password/auth-reset-password.component.ts',
  'src/app/demo/pages/authentication/auth-signin/auth-signin.component.ts',
  'src/app/demo/pages/authentication/auth-signup/auth-signup.component.ts',
  'src/app/demo/pages/core-chart/apex-chart/apex-chart.component.ts',
  'src/app/demo/pages/tables/tbl-bootstrap/tbl-bootstrap.component.ts',
  'src/app/demo/ui-elements/ui-basic/basic-badge/basic-badge.component.ts',
  'src/app/demo/ui-elements/ui-basic/basic-button/basic-button.component.ts',
  'src/app/demo/ui-elements/ui-basic/basic-collapse/basic-collapse.component.ts',
  'src/app/demo/ui-elements/ui-basic/basic-tabs-pills/basic-tabs-pills.component.ts',
  'src/app/demo/ui-elements/ui-basic/basic-typography/basic-typography.component.ts',
  'src/app/demo/ui-elements/ui-basic/breadcrumb-paging/breadcrumb-paging.component.ts',
  'src/app/features/auditoria/pages/audit-log/audit-log.component.ts',
  'src/app/features/casos/pages/caso-dashboard/caso-dashboard.component.ts',
  'src/app/features/casos/pages/caso-detail/caso-detail.component.ts',
  'src/app/features/casos/pages/caso-list/caso-list.component.ts',
  'src/app/features/clientes/pages/cliente-detail/cliente-detail.component.ts',
  'src/app/features/clientes/pages/cliente-form/cliente-form.component.ts',
  'src/app/features/clientes/pages/cliente-list/cliente-list.component.ts',
  'src/app/features/equipos/pages/equipo-detail/equipo-detail.component.ts',
  'src/app/features/equipos/pages/equipo-form/equipo-form.component.ts',
  'src/app/features/equipos/pages/equipo-list/equipo-list.component.ts',
  'src/app/features/horarios/pages/horario-detail/horario-detail.component.ts',
  'src/app/features/horarios/pages/horario-form/horario-form.component.ts',
  'src/app/features/horarios/pages/horario-list/horario-list.component.ts',
  'src/app/features/instalaciones/components/firma-digital/firma-digital.component.ts',
  'src/app/features/instalaciones/components/pendientes-list/pendientes-list.component.ts',
  'src/app/features/instalaciones/pages/instalacion-detail/instalacion-detail.component.ts',
  'src/app/features/instalaciones/pages/instalacion-form/instalacion-form.component.ts',
  'src/app/features/instalaciones/pages/instalacion-list/instalacion-list.component.ts',
  'src/app/features/mantenimientos/components/checklist-execution/checklist-execution.component.ts',
  'src/app/features/mantenimientos/components/evidencias-upload/evidencias-upload.component.ts',
  'src/app/features/mantenimientos/pages/mantenimiento-calendar/mantenimiento-calendar.component.ts',
  'src/app/features/mantenimientos/pages/mantenimiento-detail/mantenimiento-detail.component.ts',
  'src/app/features/mantenimientos/pages/mantenimiento-form/mantenimiento-form.component.ts',
  'src/app/features/mantenimientos/pages/mantenimiento-list/mantenimiento-list.component.ts',
  'src/app/features/notificaciones/pages/notification-center/notification-center.component.ts',
  'src/app/features/notificaciones/pages/notification-preferences/notification-preferences.component.ts',
  'src/app/features/reportes/pages/reporte-casos/reporte-casos.component.ts',
  'src/app/features/reportes/pages/reporte-tickets/reporte-tickets.component.ts',
  'src/app/features/tickets/components/estatus-badge/estatus-badge.component.ts',
  'src/app/features/tickets/components/prioridad-badge/prioridad-badge.component.ts',
  'src/app/features/tickets/components/progress-bar-sla/progress-bar-sla.component.ts',
  'src/app/features/tickets/components/semaforo-badge/semaforo-badge.component.ts',
  'src/app/features/tickets/pages/ticket-dashboard/ticket-dashboard.component.ts',
  'src/app/features/tickets/pages/ticket-detail/ticket-detail.component.ts',
  'src/app/features/tickets/pages/ticket-form/ticket-form.component.ts',
  'src/app/features/tickets/pages/ticket-list/ticket-list.component.ts',
  'src/app/features/users/pages/user-detail/user-detail.component.ts',
  'src/app/features/users/pages/user-form/user-form.component.ts',
  'src/app/features/users/pages/user-list/user-list.component.ts',
  'src/app/features/users/pages/user-profile/user-profile.component.ts',
  'src/app/theme/layout/admin/admin.component.ts',
  'src/app/theme/layout/admin/configuration/configuration.component.ts',
  'src/app/theme/layout/admin/nav-bar/nav-bar.component.ts',
  'src/app/theme/layout/admin/nav-bar/nav-left/nav-search/nav-search.component.ts',
  'src/app/theme/layout/admin/nav-bar/nav-right/nav-right.component.ts',
  'src/app/theme/layout/admin/navigation/nav-content/nav-collapse/nav-collapse.component.ts',
  'src/app/theme/layout/admin/navigation/nav-content/nav-content.component.ts',
  'src/app/theme/layout/admin/navigation/nav-content/nav-group/nav-group.component.ts',
  'src/app/theme/layout/admin/navigation/nav-content/nav-item/nav-item.component.ts',
  'src/app/theme/layout/admin/navigation/nav-logo/nav-logo.component.ts',
  'src/app/theme/layout/admin/navigation/navigation.component.ts',
  'src/app/theme/layout/guest/guest.component.ts',
  'src/app/theme/shared/components/breadcrumbs/breadcrumbs.component.ts',
  'src/app/theme/shared/components/card/card.component.ts',
  'src/app/theme/shared/components/spinner/spinner.component.ts'
];

let updatedCount = 0;
let skippedCount = 0;
let errorCount = 0;

files.forEach(filePath => {
  try {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  No existe: ${filePath}`);
      skippedCount++;
      return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    // Verificar si ya tiene OnPush
    if (content.includes('ChangeDetectionStrategy.OnPush')) {
      console.log(`⏭️  Ya tiene OnPush: ${filePath}`);
      skippedCount++;
      return;
    }

    let modified = false;

    // 1. Agregar ChangeDetectionStrategy al import de @angular/core
    // Patrón: import { ... } from '@angular/core';
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@angular\/core['"]/;
    const importMatch = content.match(importRegex);

    if (importMatch) {
      const imports = importMatch[1];
      if (!imports.includes('ChangeDetectionStrategy')) {
        const newImports = imports.trimEnd() + ', ChangeDetectionStrategy';
        content = content.replace(importRegex, `import {${newImports}} from '@angular/core'`);
        modified = true;
      }
    } else {
      // Si no hay import de @angular/core, agregarlo
      const firstImport = content.indexOf('import ');
      if (firstImport !== -1) {
        content = content.slice(0, firstImport) +
          "import { ChangeDetectionStrategy } from '@angular/core';\n" +
          content.slice(firstImport);
        modified = true;
      }
    }

    // 2. Agregar changeDetection: ChangeDetectionStrategy.OnPush al @Component
    // Buscar el decorador @Component y agregar antes del cierre
    const componentRegex = /@Component\(\{([^}]*(?:\{[^}]*\}[^}]*)*)\}\)/s;
    const componentMatch = content.match(componentRegex);

    if (componentMatch) {
      const decoratorContent = componentMatch[1];

      // Verificar que no tenga ya changeDetection
      if (!decoratorContent.includes('changeDetection')) {
        // Encontrar la última propiedad y agregar después
        // Buscar el último ] o ' o " seguido de posibles espacios y }
        let newDecoratorContent = decoratorContent.trimEnd();

        // Agregar coma si no termina en coma
        if (!newDecoratorContent.endsWith(',')) {
          newDecoratorContent += ',';
        }

        newDecoratorContent += '\n  changeDetection: ChangeDetectionStrategy.OnPush';

        content = content.replace(componentRegex, `@Component({${newDecoratorContent}\n})`);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Actualizado: ${filePath}`);
      updatedCount++;
    } else {
      console.log(`⏭️  Sin cambios necesarios: ${filePath}`);
      skippedCount++;
    }

  } catch (err) {
    console.error(`❌ Error en ${filePath}:`, err.message);
    errorCount++;
  }
});

console.log('\n========================================');
console.log(`✅ Actualizados: ${updatedCount}`);
console.log(`⏭️  Omitidos: ${skippedCount}`);
console.log(`❌ Errores: ${errorCount}`);
console.log('========================================');
