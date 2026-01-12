# 📊 iGAS Service Desk - Monitoreo de Progreso del Proyecto

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-brightgreen)](https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/)
[![Progreso](https://img.shields.io/badge/Progreso-12.5%25-yellow)](https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/)

Sitio web de monitoreo del progreso de desarrollo para el proyecto **APP Mesa de Ayuda iGAS v1.0** - Sistema Integral de Gestión de Soporte Técnico, Casos y Clientes.

## 🌐 Ver Sitio en Vivo

👉 **[https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/](https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/)**

## 📋 Acerca del Proyecto

Este repositorio contiene la documentación y seguimiento del desarrollo de la **APP Mesa de Ayuda iGAS v1.0**, un sistema integral de gestión de soporte técnico desarrollado para iGAS Control Volumétrico.

### Cliente
- **ING. RAFAEL ROQUE ROMÁN** - Gerente iGas Morelia
- **Contacto:** rroque.mor@igas.mx | Tel: 443 227 2217

### Desarrollador
- **ING. ANGEL DAVID ROQUE AYALA**

## 🎯 Objetivos del Sistema

El sistema permitirá:
- ✅ Registrar y controlar tickets de soporte con SLA
- ✅ Dar seguimiento con estatus y semáforo (verde/amarillo/rojo)
- ✅ Escalar a CASOS cuando el tema pasa a otra área
- ✅ Administrar clientes con datos operativos y fiscales
- ✅ Controlar vencimientos de HASP/licencias y pólizas con alertas
- ✅ Programar y registrar mantenimientos mensuales de BD
- ✅ Controlar instalaciones con checklist y firma digital
- ✅ Generar reportes y tableros operativos

## 📊 Estado Actual

| Métrica | Valor |
|---------|-------|
| **Progreso General** | 12.5% |
| **Fases Completadas** | 0 / 8 |
| **Fases en Proceso** | 2 (Fase 0 y Fase 1) |
| **Tiempo Estimado** | 12-16 semanas |

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

- **Frontend:** Angular 21 con TypeScript
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **UI Framework:** Bootstrap 5.3.8
- **Gráficas:** ApexCharts
- **Estilos:** SCSS
- **Template Base:** Datta-Able Admin Template

### Paleta de Colores Corporativa iGAS

**Colores Corporativos:**
- Amarillo Principal: `#F9B000`
- Gris Oscuro: `#58585A`
- Negro: `#000000`
- Blanco: `#FFFFFF`

**Semáforo SLA:**
- Verde (0-70%): `#4CAF50`
- Amarillo (70-100%): `#FFC107`
- Rojo (>100%): `#F44336`

## 📖 Navegación del Sitio

### Páginas Principales

- **[Inicio](index.html)** - Resumen ejecutivo del proyecto
- **[Overview](overview.html)** - Vista general del progreso

### Fases del Proyecto

1. **[Fase 0](fase-0.html)** - Configuración Inicial y Base (60% completado)
2. **[Fase 1](fase-1.html)** - Autenticación y Gestión de Usuarios (40% completado)
3. **[Fase 2](fase-2.html)** - Módulo Core - Tickets de Soporte ⭐ CRÍTICA
4. **[Fase 3](fase-3.html)** - Escalamiento - Módulo de Casos
5. **[Fase 4](fase-4.html)** - Gestión de Clientes
6. **[Fase 5](fase-5.html)** - Mantenimientos e Instalaciones
7. **[Fase 6](fase-6.html)** - Notificaciones, Alertas y Reportes
8. **[Fase 7](fase-7.html)** - Testing, Optimización y Despliegue

## 📂 Estructura del Repositorio

```
planificacion/
├── index.html                          # Página principal
├── overview.html                       # Overview del progreso
├── fase-0.html ... fase-7.html        # Detalle de cada fase
├── generar-fases.js                    # Script generador de páginas
├── README.md                           # Este archivo
└── archivos-md/                        # Documentos markdown originales
    ├── 00-resumen-fases.md
    ├── 01-fase-0-configuracion-inicial.md
    ├── 02-fase-1-usuarios-autenticacion.md
    └── ... (resto de archivos .md)
```

## 🚀 Desarrollo Local

### Prerrequisitos

- Node.js 14 o superior
- Navegador web moderno

### Ver el Sitio Localmente

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Roque98/Igas-ServiceDesk-ProgressMonitoring.git
   cd Igas-ServiceDesk-ProgressMonitoring/planificacion
   ```

2. **Abrir en el navegador:**
   ```bash
   # Windows
   start index.html

   # Mac/Linux
   open index.html
   ```

   O simplemente hacer doble clic en `index.html`

3. **Con servidor local (opcional):**
   ```bash
   # Usando Python
   python -m http.server 8000

   # Usando Node.js (http-server)
   npx http-server -p 8000
   ```

   Luego visitar: http://localhost:8000

### Regenerar Páginas desde Markdown

Si actualizas los archivos `.md`, puedes regenerar las páginas HTML:

```bash
cd planificacion
node generar-fases.js
```

## 📝 Actualizaciones

El sitio se actualiza regularmente conforme avanza el desarrollo del proyecto. Las actualizaciones incluyen:

- Progreso de cada fase
- Nuevas funcionalidades implementadas
- Capturas de pantalla del sistema
- Cambios en el cronograma
- Documentación técnica actualizada

## 🔄 GitHub Pages

Este sitio está hospedado en GitHub Pages y se actualiza automáticamente con cada push a la rama principal.

### Configuración de GitHub Pages

1. Ir a: `Settings > Pages`
2. Source: `Deploy from a branch`
3. Branch: `main` (o `master`)
4. Folder: `/planificacion` (o root `/`)
5. Guardar

## 📧 Contacto

**Cliente:**
- ING. RAFAEL ROQUE ROMÁN
- Email: rroque.mor@igas.mx
- Teléfono: 443 227 2217

**Desarrollador:**
- ING. ANGEL DAVID ROQUE AYALA

**iGAS Control Volumétrico**
- Web: www.igas.mx

## 📄 Licencia

Este es un proyecto privado para iGAS Control Volumétrico. Todos los derechos reservados.

---

**Última actualización:** 11 de enero de 2026

**Versión del Plan:** 1.0
