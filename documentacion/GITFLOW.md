# 🔄 GitFlow - Flujo de Trabajo

Este proyecto utiliza GitFlow como estrategia de branching para mantener un desarrollo organizado y profesional.

## 📊 Estructura de Ramas

```
master (producción)
  ↑
  └── dev (desarrollo)
       ↑
       ├── feature/nombre-caracteristica
       ├── bugfix/nombre-fix
       └── hotfix/nombre-hotfix
```

### Ramas Principales

#### **master**
- Rama de producción
- Solo código estable y probado
- Nunca hacer push directo
- Solo recibe merges desde `dev` o `hotfix`

#### **dev**
- Rama de desarrollo
- Integración de todas las features
- Código funcional pero puede no estar listo para producción
- Base para crear nuevas features

### Ramas Temporales

#### **feature/**
- Para nuevas características
- Se crean desde `dev`
- Se mergean de vuelta a `dev`
- Se eliminan después del merge

#### **bugfix/**
- Para arreglar bugs en desarrollo
- Se crean desde `dev`
- Se mergean de vuelta a `dev`

#### **hotfix/**
- Para bugs críticos en producción
- Se crean desde `master`
- Se mergean a `master` y `dev`

## 🚀 Flujo de Trabajo

### Crear una nueva feature

```bash
# 1. Asegúrate de estar en dev actualizado
git checkout dev
git pull origin dev

# 2. Crea la rama feature
git checkout -b feature/nombre-descriptivo

# 3. Trabaja en tu feature
# ... haz tus cambios ...
git add .
git commit -m "feat: descripción del cambio"

# 4. Pushea tu feature (opcional, para colaboración)
git push origin feature/nombre-descriptivo

# 5. Mergea a dev cuando esté lista
git checkout dev
git merge feature/nombre-descriptivo --no-ff

# 6. Pushea dev
git push origin dev

# 7. Elimina la feature branch
git branch -d feature/nombre-descriptivo
git push origin --delete feature/nombre-descriptivo
```

### Arreglar un bug

```bash
# Similar a feature, pero usa bugfix/
git checkout dev
git checkout -b bugfix/nombre-del-bug

# ... arregla el bug ...
git add .
git commit -m "fix: descripción del arreglo"

# Merge a dev
git checkout dev
git merge bugfix/nombre-del-bug --no-ff
git push origin dev

# Limpia
git branch -d bugfix/nombre-del-bug
```

### Hotfix en producción

```bash
# 1. Crea hotfix desde master
git checkout master
git checkout -b hotfix/nombre-critico

# 2. Arregla el problema
git add .
git commit -m "hotfix: descripción urgente"

# 3. Merge a master
git checkout master
git merge hotfix/nombre-critico --no-ff
git tag -a v1.0.1 -m "Hotfix versión 1.0.1"
git push origin master --tags

# 4. Merge también a dev
git checkout dev
git merge hotfix/nombre-critico --no-ff
git push origin dev

# 5. Limpia
git branch -d hotfix/nombre-critico
```

### Subir a producción

```bash
# Solo cuando dev está probado y listo
git checkout master
git merge dev --no-ff -m "Release: versión X.X.X"
git tag -a vX.X.X -m "Versión X.X.X"
git push origin master --tags
```

## 📝 Convenciones de Nombres

### Branches
- `feature/login-supabase`
- `feature/dashboard-charts`
- `bugfix/login-redirect`
- `hotfix/critical-auth-bug`

### Commits
Ver [COMMITS.md](./COMMITS.md) para convenciones de commits.

## ⚠️ Reglas Importantes

1. ❌ **NUNCA** hacer push directo a `master`
2. ❌ **NUNCA** hacer push directo a `dev` (usa features)
3. ✅ **SIEMPRE** usar `--no-ff` al mergear (mantiene historial)
4. ✅ **SIEMPRE** eliminar branches después del merge
5. ✅ **SIEMPRE** pull antes de crear una nueva feature
6. ✅ **SIEMPRE** testear antes de mergear a dev

## 🔍 Comandos Útiles

```bash
# Ver todas las ramas
git branch -a

# Ver ramas remotas
git branch -r

# Eliminar rama local
git branch -d nombre-rama

# Eliminar rama remota
git push origin --delete nombre-rama

# Ver historial gráfico
git log --graph --oneline --all

# Ver estado de ramas
git status
```

## 📚 Recursos

- [Git Flow Cheatsheet](https://danielkummer.github.io/git-flow-cheatsheet/)
- [Atlassian Git Flow](https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow)
