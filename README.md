# 🚀 IGAS - Sistema de Gestión

[![Angular](https://img.shields.io/badge/Angular-21-red.svg)](https://angular.io/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Sistema de gestión administrativo construido con Angular 21 y Supabase, basado en el template Datta Able Admin Dashboard.

## ✨ Características

- 🎨 **UI Moderna**: Template Datta Able con Bootstrap 5
- 🔐 **Autenticación**: Sistema completo con Supabase
- 📱 **Responsive**: Diseño adaptable a todos los dispositivos
- 🎯 **TypeScript**: Código type-safe y mantenible
- 🔄 **GitFlow**: Flujo de trabajo profesional
- 📚 **Documentación**: Wiki completa para desarrolladores

## 🚀 Inicio Rápido

```bash
# Clonar repositorio
git clone https://github.com/Roque98/Igas.git
cd Igas

# Instalar dependencias
npm install

# Configurar Supabase (ver documentacion/SUPABASE.md)
cp .env.example .env
# Edita .env con tus credenciales

# Iniciar servidor de desarrollo
npm start
```

La aplicación estará disponible en `http://localhost:4200`

## 📚 Documentación Completa

Toda la documentación del proyecto está en la carpeta `documentacion/`:

### 📖 Guías Principales
- **[📚 Wiki Principal](./documentacion/README.md)** - Índice de toda la documentación
- **[🚀 Instalación](./documentacion/INSTALACION.md)** - Guía detallada de instalación y configuración
- **[🏗️ Arquitectura](./documentacion/ARQUITECTURA.md)** - Estructura del proyecto y patrones
- **[🤝 Contribución](./documentacion/CONTRIBUCION.md)** - Cómo contribuir al proyecto

### 🔧 Configuración
- **[🔐 Supabase](./documentacion/SUPABASE.md)** - Configuración de backend y autenticación
- **[🔑 Autenticación](./documentacion/AUTENTICACION.md)** - Sistema de login/logout y guards
- **[🔄 GitFlow](./documentacion/GITFLOW.md)** - Flujo de trabajo con Git
- **[📝 Commits](./documentacion/COMMITS.md)** - Convenciones de commits

## 💻 Comandos Principales

```bash
# Desarrollo
npm start              # Servidor de desarrollo
npm run build          # Build de producción
npm run lint           # Ejecutar linter
npm run lint:fix       # Arreglar problemas de lint
npm run prettier       # Formatear código
```

## 🛠️ Stack Tecnológico

- **Frontend**: Angular 21
- **UI Framework**: Bootstrap 5
- **Template**: Datta Able Free Angular Admin
- **Backend**: Supabase
- **Estilos**: SCSS
- **Control de Versiones**: Git + GitFlow

## 🌳 Estructura de Ramas

```
master (producción)
  ↑
  └── dev (desarrollo)
       ↑
       ├── feature/nombre-caracteristica
       ├── bugfix/nombre-fix
       └── hotfix/nombre-hotfix
```

- **master**: Código en producción (estable)
- **dev**: Rama de desarrollo (integración)
- **feature/**: Nuevas características
- **bugfix/**: Arreglo de bugs
- **hotfix/**: Fixes críticos en producción

## 🤝 Contribuir

¿Quieres contribuir al proyecto? ¡Genial!

1. Lee la [Guía de Contribución](./documentacion/CONTRIBUCION.md)
2. Familiarízate con [GitFlow](./documentacion/GITFLOW.md)
3. Revisa las [Convenciones de Commits](./documentacion/COMMITS.md)
4. Crea tu feature branch desde `dev`
5. Haz tus cambios siguiendo los estándares
6. Haz merge a `dev`

## 📋 Prerequisitos

- Node.js >= v18
- npm >= v9
- Git
- Cuenta en Supabase (para backend)

## 🔐 Variables de Entorno

El proyecto usa variables de entorno para configuración sensible:

```env
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
```

**Importante**: Nunca commitees archivos `.env` al repositorio.

## 📦 Deployment

Para hacer deploy del proyecto:

1. Asegúrate de que `dev` esté probado y estable
2. Merge `dev` a `master`
3. Crea un tag de versión
4. Build de producción: `npm run build`
5. Deploy la carpeta `dist/` a tu servidor

Ver más detalles en la documentación de deployment (próximamente).

## 🐛 Reportar Bugs

Si encuentras un bug:

1. Verifica que no exista ya en [Issues](https://github.com/Roque98/Igas/issues)
2. Crea un nuevo issue con:
   - Descripción clara del problema
   - Pasos para reproducirlo
   - Screenshots (si aplica)
   - Información del entorno

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🙏 Créditos

- **Template Base**: [Datta Able Free Angular](https://github.com/codedthemes/datta-able-free-angular-admin-template) por CodedThemes
- **Backend**: [Supabase](https://supabase.com/)

## 📞 Soporte

- 📚 [Wiki de Documentación](./documentacion/README.md)
- 🐛 [Reportar Issues](https://github.com/Roque98/Igas/issues)
- 💬 Contacta al equipo de desarrollo

---

**Desarrollado con** ❤️ **por el equipo IGAS**

**Última actualización**: 2026-01-11
