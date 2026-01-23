# 📤 Instrucciones para Subir a GitHub y Activar GitHub Pages

## 📋 Resumen de lo que tenemos

✅ **Archivos listos para subir:**
- `index.html` - Página principal con plan ejecutivo
- `overview.html` - Vista general del progreso
- `fase-0.html` hasta `fase-7.html` - Detalle de cada fase
- `README.md` - Documentación del repositorio
- `.gitignore` - Archivos a ignorar
- `generar-fases.js` - Script generador
- Archivos `.md` originales (como respaldo)

✅ **Repositorio remoto creado:**
```
https://github.com/Roque98/Igas-ServiceDesk-ProgressMonitoring.git
```

---

## 🚀 Pasos para Subir al Repositorio

### Paso 1: Inicializar Git (si no está inicializado)

Abre la terminal en la carpeta del proyecto principal (no en `planificacion`):

```bash
cd D:\proyectos\perso\pro\igas\Igas
git init
```

### Paso 2: Configurar el Repositorio

Necesitas decidir qué estructura quieres:

#### Opción A: Subir SOLO la carpeta planificacion (RECOMENDADO)

Esto hará que GitHub Pages muestre directamente el sitio sin carpetas intermedias.

```bash
# Ir a la carpeta planificacion
cd planificacion

# Inicializar git aquí
git init

# Agregar el remote
git remote add origin https://github.com/Roque98/Igas-ServiceDesk-ProgressMonitoring.git

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit: iGAS ServiceDesk Progress Monitoring Site"

# Subir a GitHub
git branch -M main
git push -u origin main
```

**URL del sitio será:** `https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/`

#### Opción B: Subir todo el proyecto (con carpeta planificacion)

Si quieres mantener el código de Angular también:

```bash
# Desde la raíz del proyecto Igas
cd D:\proyectos\perso\pro\igas\Igas

# Agregar el remote (si no lo has hecho)
git remote add progress https://github.com/Roque98/Igas-ServiceDesk-ProgressMonitoring.git

# Agregar solo la carpeta planificacion
git add planificacion/

# Commit
git commit -m "Add progress monitoring site"

# Push
git push -u progress main:main
```

**URL del sitio será:** `https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/planificacion/`

---

## ⚙️ Paso 3: Configurar GitHub Pages

1. **Ve al repositorio en GitHub:**
   https://github.com/Roque98/Igas-ServiceDesk-ProgressMonitoring

2. **Haz clic en "Settings" (⚙️)**

3. **En el menú lateral, haz clic en "Pages"**

4. **Configurar la fuente:**

   ### Si usaste la Opción A:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/ (root)`
   - Clic en **Save**

   ### Si usaste la Opción B:
   - **Source:** Deploy from a branch
   - **Branch:** `main`
   - **Folder:** `/planificacion`
   - Clic en **Save**

5. **Espera 1-2 minutos** para que GitHub Pages se active

6. **Verifica tu sitio:**
   - Opción A: https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/
   - Opción B: https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/planificacion/

---

## 🔄 Actualizaciones Futuras

Cuando quieras actualizar el progreso:

1. **Modifica los archivos markdown (.md)**
   ```bash
   # Edita los archivos .md con el nuevo progreso
   ```

2. **Regenera las páginas HTML**
   ```bash
   cd planificacion
   node generar-fases.js
   ```

3. **O actualiza manualmente** los archivos HTML si prefieres

4. **Sube los cambios a GitHub**
   ```bash
   git add .
   git commit -m "Actualizar progreso: [descripción de cambios]"
   git push origin main
   ```

5. **GitHub Pages se actualizará automáticamente** en 1-2 minutos

---

## 📝 Comandos Rápidos de Referencia

### Ver estado del repositorio
```bash
git status
```

### Agregar cambios
```bash
git add .
# o específicamente:
git add index.html overview.html fase-*.html
```

### Hacer commit
```bash
git commit -m "Descripción de los cambios"
```

### Subir a GitHub
```bash
git push origin main
```

### Ver remotes configurados
```bash
git remote -v
```

---

## 🎨 Personalización Futura

### Cambiar colores
Edita las variables CSS en cada archivo HTML:
- Color principal: `#F9B000`
- Verde SLA: `#4CAF50`
- Amarillo: `#FFC107`
- Rojo: `#F44336`

### Actualizar progreso
Cambia los porcentajes en:
- `index.html` - Progreso general
- `overview.html` - Tabla de fases
- Cada `fase-X.html` - Progreso individual

### Agregar capturas de pantalla
1. Crea una carpeta `images/` en planificacion
2. Agrega las imágenes
3. Referéncialas en HTML:
   ```html
   <img src="images/screenshot.png" alt="Descripción">
   ```
4. Actualiza .gitignore si es necesario

---

## ✅ Checklist Final

Antes de compartir el link con el cliente:

- [ ] Todos los archivos HTML se generaron correctamente
- [ ] La navegación funciona entre páginas
- [ ] El progreso está actualizado (12.5%)
- [ ] Los colores corporativos iGAS están aplicados
- [ ] El README.md tiene la información correcta
- [ ] GitHub Pages está activado y funcionando
- [ ] El sitio se ve bien en mobile (responsive)
- [ ] No hay errores de consola en el navegador

---

## 🔗 Link para el Cliente

Una vez todo esté listo, comparte este link con el cliente:

```
🌐 https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/
```

### Mensaje sugerido para el cliente:

```
Estimado Ing. Rafael Roque Román,

He configurado un sitio web donde puede monitorear en tiempo real
el progreso del desarrollo de la APP Mesa de Ayuda iGAS.

🌐 Link: https://roque98.github.io/Igas-ServiceDesk-ProgressMonitoring/

El sitio incluye:
- Vista general del progreso (actualmente 12.5%)
- Detalle de cada una de las 8 fases del proyecto
- Stack tecnológico completo
- Cronograma estimado
- Actualizaciones en tiempo real

El sitio se actualizará semanalmente conforme avance el desarrollo.

Saludos,
Ing. Angel David Roque Ayala
```

---

## 🆘 Solución de Problemas

### Error: "fatal: remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/Roque98/Igas-ServiceDesk-ProgressMonitoring.git
```

### Error: "src refspec main does not match any"
```bash
git branch -M main
git push -u origin main
```

### GitHub Pages no se activa
- Verifica que el repositorio sea público (o tengas GitHub Pro para repos privados con Pages)
- Asegúrate de tener un archivo `index.html` en la raíz o carpeta seleccionada
- Espera 5-10 minutos en algunos casos

### El sitio se ve mal en GitHub Pages pero bien localmente
- Verifica que todas las rutas sean relativas (sin `/` al inicio)
- Asegúrate que los links sean `href="fase-1.html"` no `href="/fase-1.html"`

---

**¡Listo! Tu sitio de monitoreo está preparado para GitHub Pages!** 🎉
