# Fase 0: Configuración Inicial y Base

## Objetivo
Establecer la infraestructura base del proyecto, configurar el entorno de desarrollo y definir la arquitectura técnica.

---

## Stack Tecnológico Definido

- **Frontend**: Angular 21 con TypeScript
- **Backend/BaaS**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **UI Framework**: Bootstrap 5.3.8
- **Estilos**: SCSS
- **Gráficas**: ApexCharts
- **Template Base**: Datta-Able Admin Template
- **Autenticación**: Supabase Auth (JWT)

---

## Tareas

### 1. Setup del Proyecto

#### 1.1 Configuración del Repositorio
- [x] Crear repositorio Git
- [x] Configurar .gitignore apropiado
- [ ] Definir estructura de ramas (main/dev/feature)
- [ ] Configurar README.md con documentación del proyecto iGAS

#### 1.2 Configuración del Frontend (Angular)
- [x] Inicializar proyecto Angular 21
- [x] Configurar estructura de carpetas (components, pages, services, guards)
- [x] Configurar variables de entorno (.env)
- [x] Instalar y configurar Bootstrap 5
- [x] Configurar SCSS
- [x] Configurar ApexCharts
- [x] Implementar template base Datta-Able
- [ ] Limpiar componentes demo no necesarios
- [ ] Configurar manejo de errores global

#### 1.3 Configuración de Supabase
- [x] Crear cuenta y proyecto en Supabase
- [x] Configurar variables de entorno (URL + anonKey)
- [x] Instalar @supabase/supabase-js
- [x] Crear servicio SupabaseService básico
- [ ] Diseñar esquema de base de datos inicial
- [ ] Crear migraciones SQL en Supabase
- [ ] Configurar Row Level Security (RLS) policies
- [ ] Configurar Storage buckets (para adjuntos)

#### 1.4 Configuración del Routing
- [x] Configurar routing principal
- [x] Crear layout Admin
- [x] Crear layout Guest
- [x] Configurar guards básicos (authGuard, publicGuard)
- [ ] Configurar lazy loading para módulos

### 2. Look & Feel - Sistema de Diseño iGAS

#### 2.1 Paleta de Colores Corporativa
- [ ] Actualizar variables SCSS con paleta iGAS:

```scss
// Colores Corporativos iGAS
$igas-yellow-primary: #F9B000;    // Amarillo/Dorado Principal
$igas-yellow-alt: #FDB913;        // Amarillo alternativo
$igas-gray-dark: #58585A;         // Gris Oscuro
$igas-gray-text: #3E3E3E;         // Textos secundarios
$igas-black: #000000;             // Footer y textos principales
$igas-white: #FFFFFF;             // Backgrounds y contrastes

// Colores Funcionales (Semáforo SLA)
$sla-green: #4CAF50;              // 0-70% SLA (OK)
$sla-green-alt: #00A651;          // Verde alternativo
$sla-yellow: #FFC107;             // 70-100% SLA (Advertencia)
$sla-yellow-alt: #FFEB3B;         // Amarillo alternativo
$sla-red: #F44336;                // >100% SLA (Crítico)
$sla-red-alt: #E53935;            // Rojo alternativo

// Mapeo a variables del tema
$primary-color: $igas-yellow-primary;
$warning-color: $sla-yellow;
$danger-color: $sla-red;
$success-color: $sla-green;
```

#### 2.2 Branding y Logo
- [ ] Agregar logo iGAS a assets
- [ ] Actualizar logo en nav-logo component
- [ ] Configurar favicon con logo iGAS
- [ ] Definir uso de logo (versión blanca/color/sin texto)

#### 2.3 Tipografía
- [x] Fuente base: Open Sans (ya configurada)
- [ ] Definir jerarquía de títulos con colores corporativos
- [ ] Configurar tamaños y weights para UI

#### 2.4 Componentes UI Base con Branding
- [ ] Configurar botones primarios con amarillo iGAS
- [ ] Crear badges de semáforo SLA (verde/amarillo/rojo)
- [ ] Crear badges de prioridad
- [ ] Configurar cards con estilos corporativos
- [ ] Crear componentes de estado (activo/inactivo)

#### 2.5 Layout Personalizado
- [ ] Personalizar nav-bar con colores corporativos
- [ ] Configurar sidebar/navigation con branding
- [ ] Personalizar footer con información iGAS
- [ ] Agregar información de contacto (443 227 2217, rroque.mor@igas.mx)

### 3. Arquitectura y Patrones

#### 3.1 Estructura de Carpetas Angular
```
src/app/
├── core/                    [x] Creada
│   ├── guards/             [x] Auth guards implementados
│   ├── services/           [x] Supabase service
│   ├── interceptors/       [ ] HTTP interceptors
│   ├── models/             [ ] Interfaces y tipos
│   └── constants/          [ ] Constantes globales
├── shared/                 [x] Creada
│   ├── components/         [x] Componentes reutilizables
│   ├── directives/         [ ] Directivas custom
│   ├── pipes/              [ ] Pipes personalizados
│   └── utils/              [ ] Utilidades
├── features/               [ ] Crear - módulos de funcionalidad
│   ├── tickets/
│   ├── casos/
│   ├── clientes/
│   ├── usuarios/
│   ├── mantenimientos/
│   └── instalaciones/
└── theme/                  [x] Layout y tema
```

#### 3.2 Servicios Base
- [x] SupabaseService (autenticación básica)
- [ ] Extender SupabaseService con métodos CRUD genéricos
- [ ] Crear BaseService para lógica común
- [ ] Implementar ErrorHandlerService
- [ ] Implementar NotificationService
- [ ] Implementar LoadingService

#### 3.3 Seguridad Base
- [ ] Configurar CORS en Supabase
- [ ] Implementar rate limiting (Supabase tiene built-in)
- [ ] Validar tokens JWT en requests
- [ ] Implementar XSS protection
- [ ] Configurar Content Security Policy

### 4. Sistema de Autenticación (Base)

#### 4.1 Supabase Auth - Implementado
- [x] Servicio de autenticación (signIn, signUp, signOut)
- [x] Recuperación de contraseña (resetPassword)
- [x] Actualización de contraseña (updatePassword)
- [x] Manejo de sesión (getSession)
- [x] Observable de usuario actual (currentUser$)
- [x] Auth guards (authGuard, publicGuard)

#### 4.2 Páginas de Autenticación
- [x] Página de Login
- [x] Página de Registro
- [x] Página de Forgot Password
- [x] Página de Reset Password
- [ ] Personalizar páginas con branding iGAS
- [ ] Agregar validaciones mejoradas
- [ ] Implementar mensajes de error amigables

#### 4.3 Mejoras Pendientes
- [ ] Implementar auto-logout por inactividad
- [ ] Agregar "Remember me" en login
- [ ] Implementar protección contra fuerza bruta
- [ ] Agregar loading states en formularios
- [ ] Implementar 2FA (opcional - fase futura)

### 5. Modelo de Datos Base en Supabase

#### 5.1 Tablas Core (Crear en Supabase SQL Editor)
- [ ] Diseñar esquema ER completo del sistema
- [ ] Crear tabla: profiles (extensión de auth.users)
  - user_id (FK a auth.users)
  - nombre_completo
  - telefono
  - rol_id
  - area_equipo
  - turno_horario
  - estatus
  - avatar_url
  - created_at, updated_at
- [ ] Crear tabla: roles
- [ ] Crear tabla: permisos
- [ ] Crear tabla: roles_permisos
- [ ] Crear tabla: audit_log
- [ ] Crear tabla: configuracion_sistema

#### 5.2 Catálogos Base
- [ ] Crear tabla: catalogo_estatus
- [ ] Crear tabla: catalogo_prioridades
- [ ] Crear tabla: catalogo_categorias
- [ ] Crear tabla: catalogo_areas_departamentos
- [ ] Insertar datos iniciales (seeds)

#### 5.3 Row Level Security (RLS)
- [ ] Configurar policies para tabla profiles
- [ ] Configurar policies para audit_log
- [ ] Configurar policies por roles
- [ ] Documentar políticas de seguridad

### 6. Utilidades y Helpers

#### 6.1 Helpers Angular
- [ ] Crear validadores custom de formularios
- [ ] Implementar helper de formato de fechas
- [ ] Implementar helper de formato de folios
- [ ] Crear utilidad de formateo de moneda
- [ ] Implementar validadores de RFC/CURP

#### 6.2 Pipes Custom
- [ ] DateFormat pipe
- [ ] Currency pipe (MXN)
- [ ] Status badge pipe
- [ ] Semáforo SLA pipe

#### 6.3 Directivas
- [ ] Directiva de permisos (hasPermission)
- [ ] Directiva de roles (hasRole)
- [ ] Directiva de loading state

### 7. Configuración de Desarrollo

#### 7.1 Linting y Formato
- [x] ESLint configurado
- [ ] Prettier configurado y en uso
- [ ] Configurar pre-commit hooks (Husky)
- [ ] Definir convenciones de código

#### 7.2 Scripts de Desarrollo
- [x] Script de start (ng serve)
- [x] Script de build
- [ ] Script de lint:fix
- [ ] Documentar comandos en README

### 8. Testing Base

#### 8.1 Configuración de Tests
- [ ] Configurar Jasmine/Karma (viene con Angular)
- [ ] Establecer estructura de carpetas de tests
- [ ] Configurar coverage reports
- [ ] Crear tests de ejemplo para SupabaseService

---

## Entregables

- [x] Proyecto Angular inicializado y funcionando
- [x] Supabase conectado y autenticación básica
- [x] Template Datta-Able integrado
- [x] Páginas de autenticación funcionales
- [ ] Variables SCSS actualizadas con paleta iGAS
- [ ] Base de datos con esquema inicial en Supabase
- [ ] Documentación técnica inicial del proyecto
- [ ] README actualizado con instrucciones específicas

## Dependencias

Ninguna (fase inicial)

## Estado Actual

**Progreso estimado: 60%**

✅ **Completado:**
- Proyecto Angular 21 inicializado
- Supabase integrado con autenticación básica
- Template Datta-Able funcionando
- Routing con guards implementado
- Páginas de autenticación creadas

⏳ **En Proceso / Pendiente:**
- Personalización de branding iGAS
- Esquema de base de datos en Supabase
- Limpieza de componentes demo
- Sistema de diseño corporativo
- Servicios base y utilidades

## Notas Técnicas

- **Supabase** maneja el backend, no necesitamos implementar API REST separada
- **PostgreSQL** es la base de datos de Supabase
- **Row Level Security (RLS)** de Supabase proporciona seguridad a nivel de fila
- Usar **Supabase Storage** para archivos adjuntos (fotos, PDFs, logs)
- Considerar **Supabase Realtime** para actualizaciones en vivo de tickets
- **Edge Functions** de Supabase pueden usarse para lógica de negocio compleja (SLA, notificaciones)
- Mantener la mayor parte de lógica en el cliente (Angular) para aprovechar Supabase como BaaS
