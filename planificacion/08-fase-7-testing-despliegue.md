# Fase 7: Testing, Optimización y Despliegue

## Objetivo
Realizar pruebas integrales del sistema, optimizar performance, preparar documentación y desplegar a producción.

---

## Tareas

### 1. Testing

#### 1.1 Tests Unitarios (Frontend)

```typescript
// Ejemplo con Jasmine/Karma
describe('TicketService', () => {
  it('should create ticket', async () => {
    const ticket = await service.createTicket({...});
    expect(ticket).toBeDefined();
    expect(ticket.folio).toMatch(/TKT-\d{4}-\d{4}/);
  });
});
```

- [ ] Configurar ambiente de testing
- [ ] Tests de servicios:
  - [ ] SupabaseService
  - [ ] TicketService
  - [ ] CasoService
  - [ ] ClienteService
  - [ ] UserService
  - [ ] NotificationService
- [ ] Tests de componentes críticos:
  - [ ] Login/Registro
  - [ ] Creación de tickets
  - [ ] Dashboard
- [ ] Coverage mínimo del 60%

#### 1.2 Tests de Integración (E2E)

```typescript
// Cypress o Playwright
describe('Flujo de Ticket', () => {
  it('Crear, asignar y cerrar ticket', () => {
    cy.login('user@igas.mx', 'password');
    cy.visit('/tickets/nuevo');
    cy.get('#cliente').select('Cliente Test');
    cy.get('#descripcion').type('Problema de prueba');
    cy.get('button[type=submit]').click();
    cy.url().should('include', '/tickets/');
    // ... más pasos
  });
});
```

- [ ] Configurar Cypress o Playwright
- [ ] Tests E2E críticos:
  - [ ] Flujo de autenticación
  - [ ] Creación de ticket completo
  - [ ] Escalamiento a caso
  - [ ] Creación de cliente
  - [ ] Ejecución de mantenimiento
  - [ ] Ejecución de instalación con firma
- [ ] Tests en diferentes navegadores

#### 1.3 Tests de Base de Datos

```sql
-- Tests de funciones y triggers
DO $$
BEGIN
  -- Test generar folio ticket
  PERFORM generar_folio_ticket();
  ASSERT EXISTS (SELECT 1 FROM tickets WHERE folio LIKE 'TKT-2026-%');

  -- Test cálculo SLA
  -- ...
END $$;
```

- [ ] Tests de funciones SQL
- [ ] Tests de triggers
- [ ] Tests de RLS policies
- [ ] Tests de performance de queries

#### 1.4 Tests de Seguridad

- [ ] Verificar RLS en todas las tablas críticas
- [ ] Test de inyección SQL
- [ ] Test de XSS
- [ ] Test de autenticación y autorización
- [ ] Test de permisos por rol
- [ ] Validar que no hay endpoints expuestos sin auth
- [ ] Validar encriptación de datos sensibles

### 2. Optimización de Performance

#### 2.1 Base de Datos

```sql
-- Analizar queries lentos
EXPLAIN ANALYZE
SELECT * FROM tickets_con_sla WHERE cliente_id = '...';

-- Crear índices faltantes
CREATE INDEX CONCURRENTLY idx_tickets_cliente_estatus
  ON tickets(cliente_id, estatus_id);

-- Optimizar views
CREATE MATERIALIZED VIEW tickets_dashboard AS
SELECT ...;
```

- [ ] Identificar queries lentos con Supabase Dashboard
- [ ] Crear índices faltantes
- [ ] Optimizar joins complejos
- [ ] Considerar materialized views para reportes
- [ ] Configurar connection pooling
- [ ] Analizar uso de storage

#### 2.2 Frontend

```typescript
// Lazy loading de módulos
const routes: Routes = [
  {
    path: 'tickets',
    loadChildren: () => import('./features/tickets/tickets.module').then(m => m.TicketsModule)
  }
];

// OnPush change detection
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

- [ ] Implementar lazy loading en todas las rutas
- [ ] Usar OnPush change detection donde sea posible
- [ ] Optimizar bundle size:
  - [ ] Analizar con webpack-bundle-analyzer
  - [ ] Tree shaking
  - [ ] Eliminar dependencias no usadas
- [ ] Implementar virtual scrolling en listas largas
- [ ] Optimizar imágenes y assets:
  - [ ] Comprimir imágenes
  - [ ] Usar WebP cuando sea posible
  - [ ] Lazy loading de imágenes
- [ ] Implementar caché de datos:
  - [ ] Service workers (PWA)
  - [ ] LocalStorage/IndexedDB para datos estáticos
- [ ] Medir y mejorar Core Web Vitals:
  - [ ] LCP (Largest Contentful Paint)
  - [ ] FID (First Input Delay)
  - [ ] CLS (Cumulative Layout Shift)

#### 2.3 Supabase

- [ ] Optimizar políticas RLS (evitar queries complejos)
- [ ] Configurar caché de Supabase
- [ ] Implementar indexes compuestos
- [ ] Revisar límites de rate limiting
- [ ] Configurar backups automáticos

### 3. PWA (Progressive Web App) - Opcional

#### 3.1 Configuración PWA

```json
// manifest.json
{
  "name": "iGAS Mesa de Ayuda",
  "short_name": "iGAS",
  "theme_color": "#F9B000",
  "background_color": "#FFFFFF",
  "display": "standalone",
  "icons": [...]
}
```

- [ ] Configurar manifest.json con branding iGAS
- [ ] Configurar service worker
- [ ] Implementar estrategia de caché offline
- [ ] Agregar íconos PWA (diferentes tamaños)
- [ ] Implementar modo offline para consultas
- [ ] Sincronización en background cuando vuelve online

### 4. Documentación

#### 4.1 Documentación Técnica

- [ ] Crear README.md del proyecto:
  - [ ] Descripción del proyecto
  - [ ] Stack tecnológico
  - [ ] Requisitos previos
  - [ ] Instalación
  - [ ] Configuración
  - [ ] Scripts disponibles
  - [ ] Estructura de carpetas
- [ ] Documentar arquitectura:
  - [ ] Diagrama de arquitectura
  - [ ] Diagrama de base de datos (ER)
  - [ ] Flujo de datos
- [ ] Documentar API/Servicios:
  - [ ] Endpoints principales
  - [ ] Modelos de datos
  - [ ] Ejemplos de uso
- [ ] Crear CONTRIBUTING.md
- [ ] Crear CHANGELOG.md

#### 4.2 Manual de Usuario

- [ ] Crear manual de usuario (PDF):
  - [ ] Introducción al sistema
  - [ ] Login y registro
  - [ ] Gestión de tickets paso a paso
  - [ ] Gestión de casos
  - [ ] Gestión de clientes
  - [ ] Mantenimientos e instalaciones
  - [ ] Reportes
  - [ ] Notificaciones
  - [ ] Preguntas frecuentes
- [ ] Incluir capturas de pantalla
- [ ] Videos tutoriales (opcional):
  - [ ] Crear ticket
  - [ ] Escalar a caso
  - [ ] Ejecutar mantenimiento
  - [ ] Hacer instalación con firma

#### 4.3 Documentación de Despliegue

- [ ] Crear guía de despliegue:
  - [ ] Configuración de Supabase
  - [ ] Variables de entorno
  - [ ] Build de producción
  - [ ] Despliegue en hosting
  - [ ] Configuración de dominio
  - [ ] SSL/HTTPS
  - [ ] Backups

### 5. Seguridad Final

#### 5.1 Checklist de Seguridad

- [ ] Todas las variables sensibles en .env (no en código)
- [ ] .env en .gitignore
- [ ] HTTPS en producción
- [ ] RLS habilitado en todas las tablas
- [ ] Validación de datos en frontend y backend
- [ ] Protección contra CSRF
- [ ] Headers de seguridad configurados
- [ ] Rate limiting activo
- [ ] Logs de seguridad implementados
- [ ] Encriptación de datos sensibles
- [ ] Backup automático configurado
- [ ] Plan de recuperación ante desastres

### 6. Despliegue

#### 6.1 Preparación

- [ ] Crear proyecto de producción en Supabase
- [ ] Migrar esquema de BD a producción:
  - [ ] Ejecutar todas las migraciones SQL
  - [ ] Crear índices
  - [ ] Insertar datos iniciales (catálogos)
- [ ] Configurar variables de entorno de producción
- [ ] Configurar dominio personalizado
- [ ] Configurar SSL

#### 6.2 Build de Producción

```bash
# Build optimizado
ng build --configuration production

# Verificar build
npm run build-prod
```

- [ ] Ejecutar build de producción
- [ ] Verificar que no hay errores
- [ ] Verificar tamaño del bundle
- [ ] Probar build localmente

#### 6.3 Hosting

**Opciones de hosting:**
1. **Vercel** (Recomendado para Angular)
   - Deploy automático desde Git
   - CDN global
   - SSL gratis
   - Fácil configuración

2. **Netlify**
   - Similar a Vercel
   - Build automático

3. **Firebase Hosting**
   - Integración con Google
   - CDN rápido

4. **Servidor propio**
   - Nginx + PM2
   - Mayor control

- [ ] Seleccionar plataforma de hosting
- [ ] Configurar deployment automático
- [ ] Configurar dominio (ejemplo: app.igas.mx)
- [ ] Verificar SSL activo
- [ ] Configurar redirects (HTTP → HTTPS, www → non-www)

#### 6.4 Post-Despliegue

- [ ] Smoke tests en producción:
  - [ ] Login funciona
  - [ ] Crear ticket funciona
  - [ ] Notificaciones funcionan
  - [ ] Reportes cargan correctamente
- [ ] Configurar monitoreo:
  - [ ] Uptime monitoring (UptimeRobot)
  - [ ] Error tracking (Sentry)
  - [ ] Analytics (Google Analytics o similar)
- [ ] Configurar alertas de downtime
- [ ] Realizar backup inicial de producción

### 7. Capacitación

#### 7.1 Capacitación a Usuarios

- [ ] Preparar presentación del sistema
- [ ] Sesión de capacitación para admins:
  - [ ] Gestión de usuarios y roles
  - [ ] Configuración de SLA
  - [ ] Configuración de catálogos
  - [ ] Reportes y análisis
- [ ] Sesión de capacitación para técnicos:
  - [ ] Gestión de tickets
  - [ ] Escalamiento a casos
  - [ ] Mantenimientos
  - [ ] Instalaciones
- [ ] Sesión de capacitación para coordinadores:
  - [ ] Supervisión de equipo
  - [ ] Reportes de productividad
  - [ ] Gestión de alertas
- [ ] Material de capacitación entregado

### 8. Migración de Datos (Si aplica)

- [ ] Exportar datos del sistema anterior
- [ ] Limpiar y normalizar datos
- [ ] Crear scripts de migración
- [ ] Migrar en etapas:
  - [ ] Clientes
  - [ ] Sucursales
  - [ ] Contactos
  - [ ] Datos fiscales
  - [ ] Licencias y pólizas
  - [ ] Tickets históricos (opcional)
- [ ] Validar integridad de datos migrados
- [ ] Generar reporte de migración

### 9. Plan de Mantenimiento

#### 9.1 Mantenimiento Preventivo

- [ ] Documentar plan de mantenimiento:
  - [ ] Backups diarios automáticos
  - [ ] Revisión semanal de logs
  - [ ] Actualización mensual de dependencias
  - [ ] Revisión trimestral de seguridad
  - [ ] Optimización semestral de BD
- [ ] Configurar backups automáticos
- [ ] Configurar rotación de logs
- [ ] Documentar procedimientos de restauración

#### 9.2 Monitoreo Continuo

- [ ] Configurar dashboard de monitoreo
- [ ] Alertas de uso de recursos
- [ ] Alertas de errores críticos
- [ ] Métricas de uso (MAU, DAU)
- [ ] Métricas de performance

### 10. Entrega Final

#### 10.1 Checklist de Entrega

- [ ] Código fuente en repositorio Git
- [ ] Aplicación desplegada en producción
- [ ] Base de datos migrada y funcional
- [ ] Documentación técnica completa
- [ ] Manual de usuario entregado
- [ ] Capacitación realizada
- [ ] Credenciales de acceso entregadas:
  - [ ] Supabase Dashboard
  - [ ] Hosting
  - [ ] Dominio
  - [ ] Email service
- [ ] Usuario admin creado
- [ ] Datos de prueba o reales cargados

#### 10.2 Post-Entrega

- [ ] Período de soporte post-lanzamiento (30 días)
- [ ] Corrección de bugs críticos
- [ ] Ajustes menores según feedback
- [ ] Reunión de cierre del proyecto

---

## Entregables

- [ ] Suite de tests completa (unitarios + E2E)
- [ ] Aplicación optimizada
- [ ] PWA configurada (opcional)
- [ ] Documentación técnica completa
- [ ] Manual de usuario en PDF
- [ ] Videos tutoriales (opcional)
- [ ] Aplicación desplegada en producción
- [ ] Capacitación realizada
- [ ] Plan de mantenimiento documentado

## Dependencias

- Todas las fases anteriores (0-6) completadas

## Criterios de Aceptación

- [ ] Tests cubren funcionalidad crítica
- [ ] Performance LCP < 2.5s, FID < 100ms
- [ ] Bundle size optimizado (< 2MB initial)
- [ ] Sin errores en consola en producción
- [ ] RLS policies verificadas
- [ ] SSL activo en producción
- [ ] Documentación completa entregada
- [ ] Usuarios capacitados
- [ ] Sistema funcionando en producción sin errores críticos
- [ ] Backups configurados

## Notas Técnicas

- Usar **Lighthouse** para auditoría de performance
- **Sentry** o similar para error tracking en producción
- **Vercel** es ideal para Angular con deploy automático
- Configurar **Supabase Edge Functions** como scheduled para jobs automáticos
- Implementar **health check endpoint** para monitoreo
- Usar **semantic versioning** para releases
- Mantener **CHANGELOG.md** actualizado

---

## Stack Final del Proyecto

**Frontend:**
- Angular 21
- TypeScript
- Bootstrap 5.3.8
- SCSS
- ApexCharts
- Signature Pad (firmas)

**Backend/BaaS:**
- Supabase (Auth, Database, Storage, Realtime, Edge Functions)
- PostgreSQL

**Despliegue:**
- Vercel / Netlify (Frontend)
- Supabase Cloud (Backend)

**Servicios Externos:**
- Resend / SendGrid (Emails)
- UptimeRobot (Monitoreo)
- Sentry (Error tracking)

**Herramientas:**
- Git / GitHub
- VS Code
- Postman / Thunder Client
- Supabase Studio

---

**🎉 Fin del Plan de Desarrollo iGAS Mesa de Ayuda v1.0**

**Cliente:** ING. RAFAEL ROQUE ROMÁN
**Desarrollador:** ING. ANGEL DAVID ROQUE AYALA
**Contacto:** rroque.mor@igas.mx | 443 227 2217
