# 📝 Convenciones de Commits

Este proyecto sigue la especificación de [Conventional Commits](https://www.conventionalcommits.org/) para mantener un historial de commits limpio y semántico.

## 📋 Formato

```
<tipo>(<alcance>): <descripción>

[cuerpo opcional]

[footer opcional]
```

### Ejemplos:

```bash
feat(auth): add login with Google OAuth
fix(dashboard): resolve chart rendering issue
docs(readme): update installation instructions
style(button): adjust primary button padding
refactor(user-service): simplify data fetching logic
perf(dashboard): lazy load dashboard widgets
test(auth): add unit tests for login component
chore(deps): update Angular to v21.0.5
```

## 🎯 Tipos de Commits

### **feat** - Nueva funcionalidad
```bash
feat(auth): implement password reset functionality
feat(dashboard): add user analytics widget
```

### **fix** - Arreglo de bug
```bash
fix(login): resolve infinite redirect loop
fix(table): correct pagination calculations
```

### **docs** - Documentación
```bash
docs(api): add endpoint documentation
docs(contributing): update contribution guidelines
```

### **style** - Estilos (formato, no CSS)
```bash
style(app): fix indentation in app.component.ts
style: add missing semicolons
```

### **refactor** - Refactorización
```bash
refactor(auth): extract validation logic to separate service
refactor(dashboard): simplify component structure
```

### **perf** - Mejoras de rendimiento
```bash
perf(list): implement virtual scrolling for large lists
perf(images): add lazy loading for images
```

### **test** - Tests
```bash
test(auth): add e2e tests for login flow
test(utils): add unit tests for date helpers
```

### **build** - Sistema de build
```bash
build: upgrade to webpack 5
build(docker): update Dockerfile configuration
```

### **ci** - Integración continua
```bash
ci: add GitHub Actions workflow
ci(jenkins): update pipeline configuration
```

### **chore** - Tareas de mantenimiento
```bash
chore(deps): update dependencies
chore: update .gitignore
```

### **revert** - Revertir commits
```bash
revert: revert "feat(auth): add OAuth login"
```

## 🏷️ Alcance (Scope)

El alcance es opcional pero recomendado. Indica qué parte del código se afectó:

```bash
feat(auth): ...         # Módulo de autenticación
fix(dashboard): ...     # Dashboard
docs(api): ...          # Documentación de API
style(button): ...      # Componente de botón
refactor(user): ...     # Módulo de usuario
```

### Alcances comunes en este proyecto:
- `auth` - Autenticación
- `dashboard` - Dashboard
- `ui` - Componentes UI
- `api` - Integración con API
- `supabase` - Supabase
- `forms` - Formularios
- `tables` - Tablas
- `charts` - Gráficos
- `routing` - Rutas
- `guards` - Guards
- `services` - Servicios

## ✍️ Descripción

### Reglas:
- Usar imperativo presente ("add" no "added" ni "adds")
- No capitalizar la primera letra
- No usar punto final
- Máximo 72 caracteres
- Ser específico y descriptivo

### ✅ Buenos ejemplos:
```bash
add user profile component
fix memory leak in dashboard
update installation guide
remove deprecated auth method
```

### ❌ Malos ejemplos:
```bash
Added stuff
Fixed it
Updated things
Changes
WIP
```

## 📄 Cuerpo (Body)

El cuerpo es opcional y debe explicar el **qué** y **por qué**, no el **cómo**.

```bash
feat(auth): implement two-factor authentication

Add support for 2FA using TOTP (Time-based One-Time Password).
Users can now enable 2FA in their profile settings for enhanced
security. QR code generation is handled by the qrcode library.

Closes #123
```

### Cuándo usar el cuerpo:
- Cambios complejos que necesitan contexto
- Breaking changes
- Referencia a issues o tickets
- Explicar decisiones de diseño

## 🦶 Footer

El footer es opcional y se usa para:

### Referencias a Issues:
```bash
Closes #123
Fixes #456
Resolves #789
```

### Breaking Changes:
```bash
BREAKING CHANGE: remove deprecated login method

The old login method using username has been removed.
Use email-based login instead.
```

### Co-authorship:
```bash
Co-authored-by: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## 📚 Ejemplos Completos

### Feature simple:
```bash
feat(dashboard): add revenue chart widget
```

### Feature con cuerpo:
```bash
feat(auth): implement OAuth login with Google

Add Google OAuth integration using Supabase auth.
Users can now sign in with their Google account.
The OAuth flow handles token refresh automatically.

Closes #45
```

### Fix con breaking change:
```bash
fix(api)!: change user endpoint response format

BREAKING CHANGE: user endpoint now returns data in a different structure

Before:
{
  "user": { "id": 1, "name": "John" }
}

After:
{
  "data": { "id": 1, "name": "John" },
  "meta": { "timestamp": "..." }
}
```

### Refactor:
```bash
refactor(services): extract common HTTP logic to base service

Create a BaseHttpService that handles common HTTP operations,
error handling, and loading states. All API services now extend
this base service to reduce code duplication.
```

## 🔍 Verificar tus Commits

### Antes de commitear, pregúntate:
1. ✅ ¿El tipo es correcto?
2. ✅ ¿El alcance es apropiado?
3. ✅ ¿La descripción es clara?
4. ✅ ¿Está en imperativo presente?
5. ✅ ¿Es menor a 72 caracteres?
6. ✅ ¿Necesita un cuerpo explicativo?

### Ver historial de commits:
```bash
# Ver últimos commits
git log --oneline -10

# Ver commits con detalles
git log -5

# Ver commits de un archivo
git log --follow path/to/file
```

## 🛠️ Herramientas

### Commitizen (Opcional)
Para ayudarte a crear commits convencionales:

```bash
npm install -g commitizen
npm install -g cz-conventional-changelog

# Luego usa
git cz
```

### Commitlint (Opcional)
Para validar commits automáticamente:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

## ❌ Commits a Evitar

```bash
# Muy vago
fix: fixed bug
chore: updates

# Muy largo
feat(auth): add the new authentication system with login signup password reset email verification and OAuth integration with Google Facebook and GitHub

# Mezcla de tipos
feat: add login page, fix dashboard bug, update readme

# Mal formato
Add login page
FEAT: Add login
feat(auth) add login
```

## ✅ Mejores Prácticas

1. **Un commit, un cambio**: Cada commit debe representar una unidad lógica de cambio
2. **Commits atómicos**: El código debe funcionar después de cada commit
3. **Commits frecuentes**: Mejor muchos commits pequeños que uno gigante
4. **Mensajes descriptivos**: Alguien debe entender qué hiciste sin ver el código
5. **Referencias a issues**: Siempre que sea posible, referencia el issue relacionado

## 📖 Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
- [Semantic Versioning](https://semver.org/)

---

**Recuerda**: Buenos commits = mejor historial = más fácil mantener el proyecto
