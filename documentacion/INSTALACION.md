# 🚀 Guía de Instalación

Esta guía te ayudará a configurar el proyecto IGAS en tu entorno local.

## 📋 Prerequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** v18 o superior ([Descargar](https://nodejs.org/))
- **npm** v9 o superior (viene con Node.js)
- **Git** ([Descargar](https://git-scm.com/))
- **Editor de código** (recomendado: VS Code)

### Verificar instalaciones:

```bash
node --version  # v18.x.x o superior
npm --version   # v9.x.x o superior
git --version   # cualquier versión reciente
```

## 🔽 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/Roque98/Igas.git
cd Igas
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará todas las dependencias necesarias del proyecto.

### 3. Configurar variables de entorno

#### Para desarrollo local:

Copia el archivo de ejemplo y configura tus credenciales:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus credenciales (opcional para empezar):

```env
SUPABASE_URL=tu-url-de-supabase
SUPABASE_ANON_KEY=tu-anon-key
```

**Nota**: Para desarrollo inicial, puedes usar las credenciales de ejemplo.

#### Configurar environments de Angular:

Edita `src/environments/environment.ts`:

```typescript
export const environment = {
  appVersion: packageInfo.version,
  production: false,
  supabase: {
    url: 'YOUR_SUPABASE_URL',      // Reemplaza con tu URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY'  // Reemplaza con tu key
  }
};
```

Ver [SUPABASE.md](./SUPABASE.md) para más detalles sobre configuración de Supabase.

### 4. Iniciar servidor de desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200`

El servidor se recargará automáticamente cuando hagas cambios en el código.

## 🏗️ Comandos Disponibles

### Desarrollo
```bash
npm start                # Inicia servidor de desarrollo
npm run watch            # Build en modo watch
```

### Build
```bash
npm run build            # Build para producción
npm run build-prod       # Build con configuración específica de producción
```

### Calidad de Código
```bash
npm run lint             # Ejecuta ESLint
npm run lint:fix         # Arregla problemas de lint automáticamente
npm run prettier         # Formatea código con Prettier
```

### Testing (cuando esté disponible)
```bash
npm test                 # Ejecuta tests
```

## 🔧 Configuración del Editor (VS Code)

### Extensiones recomendadas:

Instala estas extensiones en VS Code:

1. **Angular Language Service** - Soporte para Angular
2. **ESLint** - Linting de código
3. **Prettier** - Formateo de código
4. **GitLens** - Git mejorado
5. **Angular Snippets** - Snippets útiles

### Configuración de Workspace:

Crea `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.eol": "\n"
}
```

## 🌳 Configurar Git

### 1. Configurar usuario:

```bash
git config user.name "Tu Nombre"
git config user.email "tu@email.com"
```

### 2. Checkout a rama dev:

```bash
git checkout dev
git pull origin dev
```

### 3. Crear tu primera feature:

```bash
git checkout -b feature/mi-primera-feature
```

Ver [GITFLOW.md](./GITFLOW.md) para más información sobre el flujo de trabajo.

## 🔐 Configurar Supabase (Opcional)

Si quieres trabajar con autenticación y backend:

### 1. Crear cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta gratis
3. Crea un nuevo proyecto

### 2. Obtener credenciales

1. En tu proyecto Supabase, ve a `Settings` → `API`
2. Copia:
   - **Project URL**
   - **anon/public key**

### 3. Configurar en el proyecto

Actualiza `src/environments/environment.ts` con tus credenciales.

Ver [SUPABASE.md](./SUPABASE.md) para guía completa.

## ✅ Verificar Instalación

### Checklist:

- [ ] `npm install` completado sin errores
- [ ] `npm start` inicia el servidor correctamente
- [ ] Puedes acceder a `http://localhost:4200`
- [ ] La aplicación se carga sin errores en consola
- [ ] `npm run lint` pasa sin errores

### Solución de problemas comunes:

#### Error: "node version too old"
```bash
# Actualiza Node.js a v18 o superior
# Descarga desde https://nodejs.org/
```

#### Error: "EACCES: permission denied"
```bash
# En Mac/Linux, no uses sudo con npm
# En Windows, ejecuta terminal como administrador
```

#### Error: "Port 4200 already in use"
```bash
# Mata el proceso en el puerto 4200
# Windows:
netstat -ano | findstr :4200
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:4200 | xargs kill -9
```

#### Problemas con npm install
```bash
# Limpia cache y reinstala
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 🎯 Primeros Pasos Después de Instalar

1. **Explora el código**: Familiarízate con la estructura del proyecto
2. **Lee la documentación**: Revisa [ARQUITECTURA.md](./ARQUITECTURA.md)
3. **Entiende GitFlow**: Lee [GITFLOW.md](./GITFLOW.md)
4. **Crea una feature**: Sigue [CONTRIBUCION.md](./CONTRIBUCION.md)

## 📚 Recursos Adicionales

- [Documentación de Angular](https://angular.io/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Bootstrap 5](https://getbootstrap.com/docs/5.3/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 🆘 ¿Necesitas Ayuda?

Si encuentras problemas:

1. Revisa esta documentación
2. Busca en los issues del proyecto
3. Crea un nuevo issue con detalles del problema
4. Contacta al equipo de desarrollo

---

**¡Bienvenido al proyecto IGAS!** 🎉

Ahora que tienes todo instalado, estás listo para comenzar a desarrollar.
