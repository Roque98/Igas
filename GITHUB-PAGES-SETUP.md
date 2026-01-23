# 📤 Configuración de GitHub Pages para APP Mesa de Ayuda iGAS

## ✅ Archivos Preparados

La versión compilada de producción de la aplicación Angular está lista en la carpeta `docs/`:

```
docs/
├── index.html          # Aplicación Angular compilada
├── 404.html           # Manejo de rutas de Angular
├── .nojekyll          # Deshabilita Jekyll en GitHub Pages
├── assets/            # Recursos estáticos
├── *.js               # JavaScript optimizado
└── *.css              # Estilos compilados
```

---

## 🚀 Pasos para Activar GitHub Pages

### 1. Ve al Repositorio en GitHub

Abre: https://github.com/Roque98/Igas

### 2. Accede a Configuración

- Haz clic en **Settings** (⚙️) en la parte superior del repositorio

### 3. Configura GitHub Pages

En el menú lateral izquierdo:
- Busca y haz clic en **"Pages"**

En la sección **"Build and deployment"**:
- **Source:** Deploy from a branch
- **Branch:** `dev` (o `main` si fusionas primero)
- **Folder:** `/docs`
- Haz clic en **Save**

### 4. Espera el Despliegue

- GitHub Pages procesará los archivos (1-2 minutos)
- Una vez listo, verás una notificación verde con la URL

### 5. Accede a la Aplicación

Tu aplicación estará disponible en:

```
🌐 https://roque98.github.io/Igas/
```

---

## 🔧 Compilar Nuevas Versiones

Cuando actualices el código y quieras publicar una nueva versión:

```bash
# 1. Compilar para producción
npm run build

# 2. Agregar cambios a git
git add docs/

# 3. Hacer commit
git commit -m "Update production build"

# 4. Subir a GitHub
git push origin dev
```

GitHub Pages se actualizará automáticamente en 1-2 minutos.

---

## 📝 Notas Técnicas

### Configuración Actual

- **baseHref:** `/Igas/` (configurado en `angular.json`)
- **outputPath:** `docs` (carpeta de salida)
- **Optimización:** Habilitada en modo producción
- **404 Handling:** Configurado para rutas de Angular

### Archivo .nojekyll

Este archivo desactiva el procesamiento de Jekyll en GitHub Pages, permitiendo que archivos que empiezan con `_` se sirvan correctamente.

### Manejo de Rutas

El archivo `404.html` es una copia de `index.html` para manejar rutas de Angular. Cuando GitHub Pages no encuentra una ruta (ej: `/dashboard`), sirve `404.html` que contiene la aplicación Angular, y Angular maneja la navegación.

---

## ⚠️ Seguridad - Variables de Entorno

**IMPORTANTE:** Asegúrate de que las credenciales de Supabase en `environment.prod.ts` sean para producción y **NO** expongan datos sensibles.

La aplicación usará las variables de entorno de producción:

```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  supabaseUrl: 'TU_URL_DE_SUPABASE',
  supabaseKey: 'TU_ANON_KEY_DE_SUPABASE'
};
```

⚠️ **Nunca** incluyas el `service_role_key` en el frontend.

---

## 🔐 Restricción de Acceso (Opcional)

GitHub Pages en repositorios públicos es de acceso público. Si necesitas restringir el acceso:

### Opción 1: Repositorio Privado (Requiere GitHub Pro)
- Cambiar el repositorio a privado
- GitHub Pages funcionará solo para usuarios autorizados

### Opción 2: Autenticación en la App
- La app ya tiene autenticación con Supabase
- Los usuarios necesitan credenciales para acceder al contenido
- La página de login es pública, pero el contenido está protegido

---

## 🐛 Solución de Problemas

### Error 404 en rutas

Si ves errores 404 al navegar:
1. Verifica que existe `404.html` en la carpeta docs
2. Asegúrate de que `baseHref` en `angular.json` sea `/Igas/`

### Estilos no cargan

Si los estilos no se ven:
1. Verifica que la compilación fue exitosa
2. Revisa las rutas en las herramientas de desarrollador del navegador
3. Asegúrate de que `baseHref` es correcto

### La app no carga

1. Abre la consola del navegador (F12)
2. Revisa errores de JavaScript
3. Verifica que las variables de entorno de Supabase sean correctas
4. Asegúrate de que GitHub Pages esté habilitado en la rama correcta

---

## 📊 Métricas de Build

```
Initial Chunk Files:
- main.js:     850.62 kB (210.53 kB gzipped)
- scripts.js:  576.04 kB (129.28 kB gzipped)
- styles.css:  369.98 kB (43.29 kB gzipped)
- runtime.js:    3.14 kB (1.50 kB gzipped)

Total Size:      1.80 MB (384.94 kB gzipped)
```

---

## 🔗 Enlaces Útiles

- **Repositorio:** https://github.com/Roque98/Igas
- **Documentación Detallada:** https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/
- **GitHub Pages Docs:** https://docs.github.com/en/pages

---

**Última actualización:** 11 de enero de 2026
