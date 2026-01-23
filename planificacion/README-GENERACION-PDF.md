# 📄 Cómo Generar el PDF del Plan del Proyecto

Tienes 3 opciones para convertir el archivo `plan-proyecto-cliente.html` a PDF:

---

## Opción 1: Usando el Navegador (Más Fácil) ⭐ RECOMENDADO

1. **Abrir el archivo HTML**
   - Navega a la carpeta `planificacion`
   - Haz doble clic en `plan-proyecto-cliente.html`
   - Se abrirá en tu navegador predeterminado

2. **Imprimir a PDF**
   - **Chrome/Edge:**
     - Presiona `Ctrl + P` (Windows) o `Cmd + P` (Mac)
     - En "Destino", selecciona "Guardar como PDF"
     - En "Más configuraciones":
       - ✅ Marca "Gráficos de fondo"
       - ✅ Marca "Encabezados y pies de página" (opcional)
     - Haz clic en "Guardar"
     - Guarda como `Plan-Proyecto-iGAS-v1.0.pdf`

   - **Firefox:**
     - Presiona `Ctrl + P`
     - Selecciona "Microsoft Print to PDF" o "Guardar como PDF"
     - Asegúrate que "Imprimir fondos" esté activado
     - Haz clic en "Guardar"

3. **Resultado**
   - Obtendrás un PDF profesional con todos los colores y formato

---

## Opción 2: Usando una Herramienta Online

### Sitios Recomendados (Gratis):
- **https://www.sejda.com/html-to-pdf**
- **https://www.ilovepdf.com/es/html-a-pdf**
- **https://cloudconvert.com/html-to-pdf**

### Pasos:
1. Sube el archivo `plan-proyecto-cliente.html`
2. Convierte a PDF
3. Descarga el resultado

**Ventaja:** Mejor manejo de estilos CSS y colores
**Desventaja:** Requiere subir el archivo a un servicio externo

---

## Opción 3: Usando Node.js (Para Desarrolladores)

Si tienes Node.js instalado, puedes usar `puppeteer` o `html-pdf-node`:

### Instalar puppeteer
```bash
npm install -g puppeteer
```

### Crear script de conversión
Crea un archivo `generate-pdf.js`:

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const htmlPath = path.join(__dirname, 'plan-proyecto-cliente.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf8');

  await page.setContent(htmlContent);

  await page.pdf({
    path: 'Plan-Proyecto-iGAS-v1.0.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    }
  });

  await browser.close();
  console.log('✅ PDF generado: Plan-Proyecto-iGAS-v1.0.pdf');
})();
```

### Ejecutar
```bash
node generate-pdf.js
```

---

## 📝 Recomendación Final

**Para enviar al cliente:** Usa la **Opción 1** (navegador). Es la más rápida y el resultado es excelente.

**Configuración recomendada para el PDF:**
- Orientación: Vertical
- Tamaño: A4
- Márgenes: Normales
- ✅ Incluir gráficos de fondo
- Escala: 100%

---

## 📧 Envío al Cliente

### Asunto del Email:
```
Plan de Desarrollo - APP Mesa de Ayuda iGAS v1.0
```

### Cuerpo sugerido:
```
Estimado Ing. Rafael Roque Román,

Adjunto encontrará el Plan de Desarrollo detallado para la APP Mesa de Ayuda iGAS v1.0.

El documento incluye:
- Estado actual del proyecto (12.5% completado)
- Detalle de las 8 fases de desarrollo
- Stack tecnológico completo
- Cronograma estimado (12-16 semanas)
- Funcionalidades destacadas del sistema

El proyecto está en marcha con la fase inicial completada al 60%. Las páginas de
autenticación ya están funcionales y estamos listos para continuar con el desarrollo
del módulo core de tickets.

Quedo atento a sus comentarios y sugerencias.

Saludos cordiales,

Ing. Angel David Roque Ayala
Desarrollador del Proyecto
```

### Archivos a adjuntar:
1. `Plan-Proyecto-iGAS-v1.0.pdf` (generado del HTML)
2. `iGAs v1.0_1101226.pdf` (especificación original del cliente)

---

## ✅ Resultado Esperado

El PDF tendrá:
- ✅ Colores corporativos iGAS (#F9B000)
- ✅ Aproximadamente 10-12 páginas
- ✅ Tablas y gráficos bien formateados
- ✅ Paleta de colores visualizada
- ✅ Cronograma visual con timeline
- ✅ Información de contacto en el footer
- ✅ Diseño profesional y limpio

---

**Nota:** Si encuentras problemas con la generación del PDF o necesitas ajustar el diseño,
puedes editar el archivo `plan-proyecto-cliente.html` directamente. Todos los estilos
están inline para facilitar la conversión a PDF.
