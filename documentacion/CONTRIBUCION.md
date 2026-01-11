# 🤝 Guía de Contribución

Gracias por tu interés en contribuir al proyecto IGAS. Esta guía te ayudará a hacerlo de manera efectiva.

## 🚀 Primeros Pasos

### 1. Configurar el entorno

```bash
# Clonar el repositorio
git clone https://github.com/Roque98/Igas.git
cd Igas

# Instalar dependencias
npm install

# Configurar Supabase (ver documentacion/SUPABASE.md)
# Copia .env.example a .env y configura tus credenciales

# Iniciar servidor de desarrollo
npm start
```

### 2. Familiarizarte con el proyecto

- Lee la [Arquitectura](./ARQUITECTURA.md)
- Revisa el [GitFlow](./GITFLOW.md)
- Conoce los [Estándares de Código](./ESTANDARES.md)

## 📝 Proceso de Contribución

### 1. Crear una Issue (Opcional pero recomendado)

Antes de empezar a trabajar, crea una issue describiendo:
- ¿Qué problema resuelve?
- ¿Qué funcionalidad añade?
- ¿Cómo planeas implementarlo?

### 2. Crear una rama feature

```bash
git checkout dev
git pull origin dev
git checkout -b feature/descripcion-breve
```

### 3. Hacer tus cambios

- Sigue los [Estándares de Código](./ESTANDARES.md)
- Escribe commits descriptivos (ver [COMMITS.md](./COMMITS.md))
- Mantén los cambios enfocados y pequeños
- Agrega tests si aplica

### 4. Testear tus cambios

```bash
# Ejecutar el proyecto
npm start

# Ejecutar build
npm run build

# Ejecutar linter
npm run lint

# Ejecutar tests (cuando estén disponibles)
npm test
```

### 5. Commit y Push

```bash
git add .
git commit -m "feat: descripción clara del cambio"
git push origin feature/tu-rama
```

### 6. Crear Pull Request (si aplica)

Si estás colaborando externamente:
1. Ve a GitHub
2. Crea un Pull Request desde tu feature hacia `dev`
3. Describe los cambios realizados
4. Espera el code review

Si tienes acceso directo:
```bash
git checkout dev
git merge feature/tu-rama --no-ff
git push origin dev
git branch -d feature/tu-rama
```

## ✅ Checklist antes de hacer merge

- [ ] El código sigue los estándares del proyecto
- [ ] Los commits siguen las convenciones
- [ ] El build pasa sin errores
- [ ] El linter pasa sin errores
- [ ] Has probado la funcionalidad manualmente
- [ ] Has actualizado la documentación si es necesario
- [ ] Has revisado que no introduces vulnerabilidades de seguridad

## 🎯 Tipos de Contribuciones

### Features (Nuevas funcionalidades)
```bash
git checkout -b feature/nombre-feature
# Ejemplo: feature/user-profile
```

### Bugfixes (Arreglo de bugs)
```bash
git checkout -b bugfix/nombre-bug
# Ejemplo: bugfix/login-redirect
```

### Documentación
```bash
git checkout -b docs/tema
# Ejemplo: docs/api-reference
```

### Mejoras de rendimiento
```bash
git checkout -b perf/mejora
# Ejemplo: perf/optimize-dashboard-load
```

### Refactoring
```bash
git checkout -b refactor/componente
# Ejemplo: refactor/auth-service
```

## 🚫 Qué NO hacer

- ❌ No hacer push directo a `master` o `dev`
- ❌ No mezclar múltiples features en un solo PR
- ❌ No commitear código sin testear
- ❌ No ignorar el linter o los warnings
- ❌ No commitear archivos de configuración local (.env)
- ❌ No usar `git commit -m "fix"` o mensajes vagos
- ❌ No dejar código comentado sin razón
- ❌ No hardcodear valores que deberían ser configurables

## 📋 Estilo de Código

### TypeScript/JavaScript
- Usar 2 espacios para indentación
- Usar comillas simples `'` en lugar de dobles `"`
- Punto y coma al final de cada línea
- Nombres descriptivos para variables y funciones
- Comentarios solo cuando sea necesario (el código debe ser auto-explicativo)

### HTML
- Usar 2 espacios para indentación
- Atributos en minúsculas
- Cerrar todos los tags

### SCSS/CSS
- Usar clases en lugar de IDs para estilos
- Seguir la metodología BEM cuando sea posible
- Variables SCSS para colores y tamaños

### Commits
Ver [COMMITS.md](./COMMITS.md)

## 🐛 Reportar Bugs

### Información necesaria:
- Descripción clara del bug
- Pasos para reproducirlo
- Comportamiento esperado vs actual
- Screenshots (si aplica)
- Versión del navegador/OS
- Console logs de errores

### Template de Issue:

```markdown
## Descripción
Breve descripción del bug

## Pasos para reproducir
1. Ir a...
2. Hacer click en...
3. Ver error...

## Comportamiento esperado
Lo que debería pasar

## Comportamiento actual
Lo que está pasando

## Screenshots
[Si aplica]

## Entorno
- OS: [Windows/Mac/Linux]
- Navegador: [Chrome/Firefox/Safari]
- Versión: [...]
```

## 💡 Sugerir Features

### Template de Feature Request:

```markdown
## Problema a resolver
¿Qué problema resuelve esta feature?

## Solución propuesta
¿Cómo funcionaría?

## Alternativas consideradas
¿Qué otras opciones hay?

## Beneficios
¿Por qué es importante?
```

## 🎓 Recursos

- [Angular Style Guide](https://angular.io/guide/styleguide)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)

## 📞 ¿Necesitas ayuda?

Si tienes dudas sobre cómo contribuir, no dudes en:
- Abrir una issue con tus preguntas
- Contactar al equipo de desarrollo
- Revisar la documentación existente

---

**¡Gracias por contribuir a IGAS!** 🎉
