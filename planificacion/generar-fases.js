const fs = require('fs');
const path = require('path');

// Template HTML base
const template = (faseNum, titulo, contenido, progreso = '0%', estado = 'Pendiente') => `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fase ${faseNum}: ${titulo} - iGAS Service Desk</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding-top: 60px;
        }

        /* Navegación sticky */
        .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #3E3E3E;
            padding: 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            z-index: 1000;
        }

        .navbar ul {
            list-style: none;
            display: flex;
            flex-wrap: wrap;
            margin: 0;
            padding: 0;
        }

        .navbar li {
            margin: 0;
        }

        .navbar a {
            display: block;
            padding: 15px 20px;
            color: white;
            text-decoration: none;
            transition: all 0.3s;
            border-bottom: 3px solid transparent;
            font-size: 14px;
        }

        .navbar a:hover {
            background: rgba(249, 176, 0, 0.1);
            color: #F9B000;
        }

        .navbar a.active {
            color: #F9B000;
            border-bottom-color: #F9B000;
            background: rgba(249, 176, 0, 0.05);
        }

        .header {
            background: linear-gradient(135deg, #F9B000 0%, #FDB913 100%);
            color: white;
            padding: 40px 30px;
        }

        .header h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .header .badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 14px;
            margin: 10px 10px 0 0;
        }

        .badge-proceso { background: #FFC107; color: #333; }
        .badge-pendiente { background: rgba(255,255,255,0.3); }
        .badge-completado { background: #4CAF50; }
        .badge-critica { background: #F44336; }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px 20px;
        }

        .progress-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .progress-bar-container {
            background: #e0e0e0;
            height: 30px;
            border-radius: 15px;
            position: relative;
            margin: 15px 0;
        }

        .progress-bar-fill {
            background: linear-gradient(90deg, #4CAF50 0%, #00A651 100%);
            height: 100%;
            border-radius: 15px;
            transition: width 0.3s ease;
        }

        .progress-bar-text {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
            font-weight: bold;
            font-size: 14px;
        }

        .content-section {
            background: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .content-section h2 {
            color: #F9B000;
            font-size: 24px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #F9B000;
        }

        .content-section h3 {
            color: #3E3E3E;
            font-size: 20px;
            margin: 25px 0 15px 0;
        }

        .content-section h4 {
            color: #666;
            font-size: 16px;
            margin: 20px 0 10px 0;
        }

        .content-section ul, .content-section ol {
            margin: 15px 0 15px 30px;
        }

        .content-section li {
            margin: 8px 0;
        }

        .content-section code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
        }

        .code-block {
            background: #f8f9fa;
            color: #333;
            padding: 20px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.6;
            border: 1px solid #e0e0e0;
            white-space: pre-wrap;
        }

        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            font-size: 13px;
        }

        .info-box {
            background: #fff3cd;
            border-left: 4px solid #FFC107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }

        .success-box {
            background: #d4edda;
            border-left: 4px solid #4CAF50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }

        .warning-box {
            background: #f8d7da;
            border-left: 4px solid #F44336;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        table th {
            background: #F9B000;
            color: white;
            padding: 12px;
            text-align: left;
        }

        table td {
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }

        table tr:nth-child(even) {
            background: #f8f9fa;
        }

        .footer {
            background: #3E3E3E;
            color: white;
            padding: 30px;
            text-align: center;
            margin-top: 50px;
        }

        .footer p {
            margin: 5px 0;
        }

        @media (max-width: 768px) {
            .navbar ul {
                flex-wrap: wrap;
            }

            .navbar a {
                padding: 12px 15px;
                font-size: 13px;
            }

            .header h1 {
                font-size: 24px;
            }

            .container {
                padding: 20px 15px;
            }
        }

        @media print {
            body {
                padding-top: 0;
            }
            .navbar {
                display: none;
            }
        }
    </style>
</head>
<body>
    <nav class="navbar">
        <ul>
            <li><a href="index.html">Inicio</a></li>
            <li><a href="overview.html">Overview</a></li>
            <li><a href="fase-0.html">Fase 0</a></li>
            <li><a href="fase-1.html"${faseNum === 1 ? ' class="active"' : ''}>Fase 1</a></li>
            <li><a href="fase-2.html"${faseNum === 2 ? ' class="active"' : ''}>Fase 2</a></li>
            <li><a href="fase-3.html"${faseNum === 3 ? ' class="active"' : ''}>Fase 3</a></li>
            <li><a href="fase-4.html"${faseNum === 4 ? ' class="active"' : ''}>Fase 4</a></li>
            <li><a href="fase-5.html"${faseNum === 5 ? ' class="active"' : ''}>Fase 5</a></li>
            <li><a href="fase-6.html"${faseNum === 6 ? ' class="active"' : ''}>Fase 6</a></li>
            <li><a href="fase-7.html"${faseNum === 7 ? ' class="active"' : ''}>Fase 7</a></li>
        </ul>
    </nav>

    <div class="header">
        <div class="container">
            <h1>Fase ${faseNum}: ${titulo}</h1>
            <span class="badge badge-${estado.toLowerCase()}">${estado}</span>
            <span class="badge badge-proceso">${progreso}</span>
        </div>
    </div>

    <div class="container">
        <div class="progress-card">
            <h3>Progreso de la Fase</h3>
            <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width: ${progreso};"></div>
                <div class="progress-bar-text">${progreso} Completado</div>
            </div>
        </div>

        ${contenido}
    </div>

    <div class="footer">
        <p><strong>iGAS Control Volumétrico</strong></p>
        <p>www.igas.mx | rroque.mor@igas.mx | 443 227 2217</p>
        <p style="margin-top: 15px; font-size: 12px;">
            Última actualización: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
    </div>
</body>
</html>`;

// Función para convertir markdown simple a HTML
function mdToHtml(md) {
    let html = md;

    // PASO 1: Convertir bloques de código PRIMERO (antes de procesar párrafos)
    // Usar un marcador temporal para proteger los bloques de código
    const codeBlocks = [];

    // Capturar y reemplazar bloques de código con marcadores
    // Usar \r?\n para soportar tanto Windows (\r\n) como Unix (\n)
    html = html.replace(/```(sql|typescript|javascript|bash)?\r?\n([\s\S]*?)```/g, (match, lang, code) => {
        const index = codeBlocks.length;
        codeBlocks.push(`<div class="code-block">${code.trim()}</div>`);
        return `\n___CODE_BLOCK_${index}___\n`;
    });

    // PASO 2: Convertir headers
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.*$)/gm, '<div class="content-section"><h2>$1</h2>');

    // PASO 3: Convertir checkboxes
    html = html.replace(/- \[x\]/g, '- ✅');
    html = html.replace(/- \[ \]/g, '- ⚪');

    // PASO 4: Convertir listas
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');

    // PASO 5: Convertir párrafos
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // PASO 6: Limpiar
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><ul>/g, '<ul>');
    html = html.replace(/<\/ul><\/p>/g, '</ul>');
    html = html.replace(/<p><h/g, '<h');
    html = html.replace(/<\/h([234])><\/p>/g, '</h$1>');
    html = html.replace(/<p><div/g, '<div');
    html = html.replace(/<\/div><\/p>/g, '</div>');
    html = html.replace(/<p>___CODE_BLOCK_/g, '___CODE_BLOCK_');
    html = html.replace(/___<\/p>/g, '___');
    html = html.replace(/<\/p><div class="code-block">/g, '<div class="code-block">');
    html = html.replace(/<\/div><p>/g, '</div>');

    // PASO 7: Restaurar bloques de código
    codeBlocks.forEach((block, index) => {
        html = html.replace(`___CODE_BLOCK_${index}___`, block);
    });

    // Añadir cierre de secciones
    html += '</div>';

    return html;
}

// Configuración de las fases
const fases = [
    { num: 1, file: '02-fase-1-usuarios-autenticacion.md', titulo: 'Autenticación y Gestión de Usuarios', progreso: '40%', estado: 'En Proceso' },
    { num: 2, file: '03-fase-2-tickets-soporte.md', titulo: 'Módulo Core - Tickets de Soporte', progreso: '0%', estado: 'Crítica' },
    { num: 3, file: '04-fase-3-casos-escalamiento.md', titulo: 'Escalamiento - Módulo de Casos', progreso: '0%', estado: 'Pendiente' },
    { num: 4, file: '05-fase-4-gestion-clientes.md', titulo: 'Gestión de Clientes', progreso: '0%', estado: 'Pendiente' },
    { num: 5, file: '06-fase-5-mantenimientos-instalaciones.md', titulo: 'Mantenimientos e Instalaciones', progreso: '0%', estado: 'Pendiente' },
    { num: 6, file: '07-fase-6-notificaciones-reportes.md', titulo: 'Notificaciones, Alertas y Reportes', progreso: '0%', estado: 'Pendiente' },
    { num: 7, file: '08-fase-7-testing-despliegue.md', titulo: 'Testing, Optimización y Despliegue', progreso: '0%', estado: 'Pendiente' }
];

// Generar cada fase
fases.forEach(fase => {
    try {
        const mdPath = path.join(__dirname, fase.file);
        const mdContent = fs.readFileSync(mdPath, 'utf8');

        // Extraer solo el contenido relevante (después del título principal)
        const contentStart = mdContent.indexOf('## Objetivo');
        const relevantContent = contentStart > -1 ? mdContent.substring(contentStart) : mdContent;

        // Convertir MD a HTML
        const htmlContent = mdToHtml(relevantContent);

        // Generar HTML completo
        const html = template(fase.num, fase.titulo, htmlContent, fase.progreso, fase.estado);

        // Guardar archivo
        const outputPath = path.join(__dirname, `fase-${fase.num}.html`);
        fs.writeFileSync(outputPath, html, 'utf8');

        console.log(`✅ Generado: fase-${fase.num}.html`);
    } catch (error) {
        console.error(`❌ Error generando fase-${fase.num}:`, error.message);
    }
});

console.log('\n🎉 ¡Generación completada!');
console.log('\nArchivos generados:');
fases.forEach(fase => {
    console.log(`  - fase-${fase.num}.html`);
});
