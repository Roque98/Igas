/**
 * Script para reemplazar nombres de tablas hardcodeados con constantes
 * Uso: node scripts/replace-table-names.js
 */

const fs = require('fs');
const path = require('path');

// Mapeo de strings a constantes
const TABLE_MAPPINGS = {
  // Usuarios y Autenticación
  "'profiles'": 'TABLES.PROFILES',
  "'roles'": 'TABLES.ROLES',
  "'equipos'": 'TABLES.EQUIPOS',
  "'horarios'": 'TABLES.HORARIOS',
  "'avatars'": 'TABLES.AVATARS',
  "'blocked_users'": 'TABLES.BLOCKED_USERS',

  // Tickets
  "'tickets'": 'TABLES.TICKETS',
  "'ticket_bitacora'": 'TABLES.TICKET_BITACORA',
  "'ticket_adjuntos'": 'TABLES.TICKET_ADJUNTOS',
  "'ticket_historial_asignaciones'": 'TABLES.TICKET_HISTORIAL_ASIGNACIONES',
  "'estatus_tickets'": 'TABLES.ESTATUS_TICKETS',

  // Casos
  "'casos'": 'TABLES.CASOS',
  "'caso_bitacora'": 'TABLES.CASO_BITACORA',
  "'caso_adjuntos'": 'TABLES.CASO_ADJUNTOS',
  "'caso_historial_asignaciones'": 'TABLES.CASO_HISTORIAL_ASIGNACIONES',
  "'estatus_casos'": 'TABLES.ESTATUS_CASOS',
  "'areas_destino'": 'TABLES.AREAS_DESTINO',

  // Clientes
  "'clientes'": 'TABLES.CLIENTES',
  "'sucursales'": 'TABLES.SUCURSALES',
  "'contactos_cliente'": 'TABLES.CONTACTOS_CLIENTE',
  "'datos_fiscales'": 'TABLES.DATOS_FISCALES',

  // Licencias y Pólizas
  "'licencias_hasp'": 'TABLES.LICENCIAS_HASP',
  "'licencias_renovaciones'": 'TABLES.LICENCIAS_RENOVACIONES',
  "'polizas_soporte'": 'TABLES.POLIZAS_SOPORTE',
  "'alertas_vencimiento'": 'TABLES.ALERTAS_VENCIMIENTO',

  // Instalaciones
  "'instalaciones'": 'TABLES.INSTALACIONES',
  "'instalacion_checklist'": 'TABLES.INSTALACION_CHECKLIST',
  "'instalacion_evidencias'": 'TABLES.INSTALACION_EVIDENCIAS',
  "'instalacion_pendientes'": 'TABLES.INSTALACION_PENDIENTES',
  "'instalacion_modulos'": 'TABLES.INSTALACION_MODULOS',
  "'estatus_instalaciones'": 'TABLES.ESTATUS_INSTALACIONES',

  // Mantenimientos
  "'mantenimientos'": 'TABLES.MANTENIMIENTOS',
  "'mantenimiento_checklist'": 'TABLES.MANTENIMIENTO_CHECKLIST',
  "'mantenimiento_evidencias'": 'TABLES.MANTENIMIENTO_EVIDENCIAS',
  "'estatus_mantenimientos'": 'TABLES.ESTATUS_MANTENIMIENTOS',
  "'tipos_mantenimiento'": 'TABLES.TIPOS_MANTENIMIENTO',

  // Catálogos
  "'categorias_servicio'": 'TABLES.CATEGORIAS_SERVICIO',
  "'canales_contacto'": 'TABLES.CANALES_CONTACTO',
  "'modulos_sistema'": 'TABLES.MODULOS_SISTEMA',
  "'checklist_templates'": 'TABLES.CHECKLIST_TEMPLATES',
  "'checklist_items_template'": 'TABLES.CHECKLIST_ITEMS_TEMPLATE',
  "'cat_uso_cfdi'": 'TABLES.CAT_USO_CFDI',
  "'cat_regimen_fiscal'": 'TABLES.CAT_REGIMEN_FISCAL',

  // Notificaciones
  "'notificaciones'": 'TABLES.NOTIFICACIONES',
  "'tipos_notificacion'": 'TABLES.TIPOS_NOTIFICACION',

  // Auditoría
  "'audit_log'": 'TABLES.AUDIT_LOG',
  "'sesiones_log'": 'TABLES.SESIONES_LOG'
};

const VIEW_MAPPINGS = {
  "'v_tickets_con_sla'": 'VIEWS.V_TICKETS_CON_SLA',
  "'v_reporte_tickets'": 'VIEWS.V_REPORTE_TICKETS',
  "'v_casos_con_sla'": 'VIEWS.V_CASOS_CON_SLA',
  "'v_reporte_casos'": 'VIEWS.V_REPORTE_CASOS',
  "'v_clientes_resumen'": 'VIEWS.V_CLIENTES_RESUMEN',
  "'v_licencias_estado'": 'VIEWS.V_LICENCIAS_ESTADO',
  "'v_polizas_estado'": 'VIEWS.V_POLIZAS_ESTADO',
  "'v_instalaciones_completo'": 'VIEWS.V_INSTALACIONES_COMPLETO',
  "'v_mantenimientos_completo'": 'VIEWS.V_MANTENIMIENTOS_COMPLETO',
  "'v_audit_log_detail'": 'VIEWS.V_AUDIT_LOG_DETAIL',
  "'v_sesiones_log_detail'": 'VIEWS.V_SESIONES_LOG_DETAIL'
};

const STORAGE_MAPPINGS = {
  "'avatars'": 'STORAGE_BUCKETS.AVATARS',
  "'ticket-attachments'": 'STORAGE_BUCKETS.TICKET_ATTACHMENTS',
  "'caso-attachments'": 'STORAGE_BUCKETS.CASO_ATTACHMENTS',
  "'instalacion-evidencias'": 'STORAGE_BUCKETS.INSTALACION_EVIDENCIAS',
  "'mantenimiento-evidencias'": 'STORAGE_BUCKETS.MANTENIMIENTO_EVIDENCIAS',
  "'firmas-clientes'": 'STORAGE_BUCKETS.FIRMAS_CLIENTES'
};

// Combinar todos los mapeos
const ALL_MAPPINGS = { ...TABLE_MAPPINGS, ...VIEW_MAPPINGS, ...STORAGE_MAPPINGS };

// Servicios a actualizar
const servicesDir = path.join(process.cwd(), 'src', 'app', 'core', 'services');
const files = fs.readdirSync(servicesDir)
  .filter(f => f.endsWith('.service.ts'))
  .map(f => path.join(servicesDir, f));

let totalFiles = 0;
let totalReplacements = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  let replacements = 0;
  let usedTables = false;
  let usedViews = false;
  let usedStorage = false;

  // Reemplazar cada nombre de tabla/vista/bucket
  for (const [oldValue, newValue] of Object.entries(ALL_MAPPINGS)) {
    const regex = new RegExp(`\\.from\\(${oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
    const storageRegex = new RegExp(`\\.from\\(${oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');

    if (regex.test(content)) {
      content = content.replace(regex, `.from(${newValue})`);
      modified = true;
      replacements++;

      if (newValue.startsWith('TABLES.')) usedTables = true;
      if (newValue.startsWith('VIEWS.')) usedViews = true;
      if (newValue.startsWith('STORAGE_BUCKETS.')) usedStorage = true;
    }
  }

  // Si hubo modificaciones, agregar el import
  if (modified) {
    // Construir el import necesario
    const imports = [];
    if (usedTables) imports.push('TABLES');
    if (usedViews) imports.push('VIEWS');
    if (usedStorage) imports.push('STORAGE_BUCKETS');

    const importStatement = `import { ${imports.join(', ')} } from '../constants/tables';`;

    // Verificar si ya tiene el import
    if (!content.includes("from '../constants/tables'")) {
      // Encontrar la última línea de imports
      const lines = content.split('\n');
      let lastImportIndex = -1;
      let inMultiLineImport = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed.startsWith('import ')) {
          if (!trimmed.endsWith(';')) {
            inMultiLineImport = true;
          } else {
            lastImportIndex = i;
          }
        }

        if (inMultiLineImport && trimmed.includes('} from ')) {
          lastImportIndex = i;
          inMultiLineImport = false;
        }
      }

      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, importStatement);
        content = lines.join('\n');
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${path.basename(filePath)} - ${replacements} reemplazos`);
    totalFiles++;
    totalReplacements += replacements;
  }
});

console.log('\n========================================');
console.log(`✅ Archivos actualizados: ${totalFiles}`);
console.log(`📝 Total reemplazos: ${totalReplacements}`);
console.log('========================================');
