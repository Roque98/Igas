# Plan de Desarrollo - APP Mesa de Ayuda iGAS

## Resumen Ejecutivo

Este documento organiza el desarrollo del proyecto en fases secuenciales, basado en la especificación técnica v1.00 del 11 de enero 2026.

## Fases del Proyecto

### Fase 0: Configuración Inicial y Base
**Objetivo**: Establecer la infraestructura base del proyecto
**Documento**: `01-fase-0-configuracion-inicial.md`

### Fase 1: Autenticación y Gestión de Usuarios
**Objetivo**: Implementar el sistema de usuarios, roles y autenticación
**Documento**: `02-fase-1-usuarios-autenticacion.md`

### Fase 2: Módulo Core - Tickets de Soporte
**Objetivo**: Desarrollar el módulo principal de tickets con SLA y semáforos
**Documento**: `03-fase-2-tickets-soporte.md`

### Fase 3: Escalamiento - Módulo de Casos
**Objetivo**: Implementar el sistema de escalamiento a otras áreas
**Documento**: `04-fase-3-casos-escalamiento.md`

### Fase 4: Gestión de Clientes
**Objetivo**: Crear el maestro de clientes con datos operativos, fiscales, licencias y pólizas
**Documento**: `05-fase-4-gestion-clientes.md`

### Fase 5: Mantenimientos e Instalaciones
**Objetivo**: Desarrollar módulos de mantenimientos mensuales e instalaciones con checklist
**Documento**: `06-fase-5-mantenimientos-instalaciones.md`

### Fase 6: Notificaciones, Alertas y Reportes
**Objetivo**: Implementar sistema de notificaciones y reportes operativos
**Documento**: `07-fase-6-notificaciones-reportes.md`

### Fase 7: Testing, Optimización y Despliegue
**Objetivo**: Pruebas integrales, optimización y puesta en producción
**Documento**: `08-fase-7-testing-despliegue.md`

---

## Arquitectura Técnica Implementada

### Stack Tecnológico
- **Frontend**: Angular 21 con TypeScript
- **Backend/BaaS**: Supabase (Backend as a Service)
- **Base de datos**: PostgreSQL (Supabase)
- **UI Framework**: Bootstrap 5.3.8
- **Estilos**: SCSS
- **Gráficas**: ApexCharts
- **Autenticación**: Supabase Auth (JWT)
- **Storage**: Supabase Storage (para adjuntos)
- **Realtime**: Supabase Realtime (actualizaciones en vivo)
- **Template Base**: Datta-Able Admin Template

### Paleta de Colores iGAS
**Colores Corporativos:**
- Amarillo/Dorado Principal: #F9B000 o #FDB913
- Gris Oscuro: #58585A o #3E3E3E
- Negro: #000000
- Blanco: #FFFFFF

**Semáforo SLA:**
- Verde (0-70% SLA): #4CAF50 o #00A651
- Amarillo (70-100% SLA): #FFC107 o #FFEB3B
- Rojo (>100% SLA): #F44336 o #E53935

### Componentes Principales
1. Aplicación Web Angular Responsiva
2. Supabase como Backend (Auth + Database + Storage + Realtime)
3. Panel Web Admin para configuración y catálogos
4. Sistema de notificaciones con Supabase
5. Generador de reportes y dashboards con ApexCharts
6. Row Level Security (RLS) para seguridad de datos

---

**Referencia**: Especificación técnica en `claude/iGAs v1.0_1101226.pdf`
**Cliente**: ING. RAFAEL ROQUE ROMÁN
**Desarrollador**: ING. ANGEL DAVID ROQUE AYALA
**Contacto**: rroque.mor@igas.mx | 443 227 2217
