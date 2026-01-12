# 🚀 Guía de Migración - Base de Datos iGAS Helpdesk

Esta guía te ayudará a aplicar el esquema de base de datos completo a tu proyecto de Supabase.

## 📋 Pre-requisitos

- Cuenta en [Supabase](https://supabase.com)
- Proyecto Supabase creado
- Acceso al SQL Editor de Supabase
- **Proyecto:** https://ltyquqbxnjwqsyobgwqw.supabase.co

## ⚠️ IMPORTANTE - Antes de Empezar

1. **Backup:** Supabase mantiene backups automáticos, pero es buena práctica exportar cualquier dato existente
2. **Orden de ejecución:** Los scripts DEBEN ejecutarse en el orden indicado
3. **Verificación:** Después de cada script, verifica que no haya errores

## 🎯 Método 1: Ejecutar Script Completo (Recomendado)

### Pasos:

1. **Ir a Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/ltyquqbxnjwqsyobgwqw
   - Navegar a: **SQL Editor** → **New Query**

2. **Copiar el script completo**
   - Abrir: `database/schema.sql`
   - Copiar TODO el contenido

3. **Ejecutar**
   - Pegar en el SQL Editor
   - Click en **RUN** o `Ctrl + Enter`
   - Esperar a que complete (puede tomar 30-60 segundos)

4. **Verificar**
   ```sql
   -- Verificar que las tablas se crearon
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;

   -- Deberías ver 14 tablas: categorias_servicio, clientes, equipos,
   -- estatus_tickets, horarios, profiles, roles, sucursales, tickets,
   -- ticket_adjuntos, ticket_bitacora, ticket_historial_asignaciones,
   -- ticket_participantes
   ```

## 🔧 Método 2: Ejecución por Módulos

Si prefieres ejecutar paso a paso, usa los archivos modulares:

### 1. Extensiones
```bash
database/migrations/01_extensions.sql
```

### 2. Catálogos Base
```bash
database/migrations/02_catalogos.sql
```

### 3. Usuarios
```bash
database/migrations/03_usuarios.sql
```

### 4. Clientes
```bash
database/migrations/04_clientes.sql
```

### 5. Tickets
```bash
database/migrations/05_tickets.sql
```

### 6. Funciones y Triggers
```bash
database/migrations/06_functions.sql
```

### 7. RLS Policies
```bash
database/migrations/07_rls_policies.sql
```

### 8. Vistas
```bash
database/migrations/08_views.sql
```

## ✅ Verificación Post-Migración

Ejecuta estos queries para verificar que todo esté correcto:

### 1. Verificar Tablas
```sql
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name AND table_schema = 'public') as num_columns
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 2. Verificar Roles
```sql
SELECT * FROM roles;
-- Debe mostrar 4 roles: Administrador, Supervisor, Agente, Cliente
```

### 3. Verificar Categorías
```sql
SELECT * FROM categorias_servicio;
-- Debe mostrar 5 categorías
```

### 4. Verificar Estatus
```sql
SELECT * FROM estatus_tickets ORDER BY orden;
-- Debe mostrar 7 estatus
```

### 5. Verificar Horarios
```sql
SELECT * FROM horarios;
-- Debe mostrar 3 horarios
```

### 6. Verificar Funciones
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'update_updated_at_column', 'generar_folio_ticket');
```

### 7. Verificar Triggers
```sql
SELECT
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### 8. Verificar RLS
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

## 🧪 Probar la Base de Datos

### 1. Crear un Usuario de Prueba

Ve a: **Authentication** → **Users** → **Add user**

- Email: `test@igas.mx`
- Password: `Test123!`
- Auto Confirm User: ✅

Verifica que se creó automáticamente el profile:

```sql
SELECT * FROM profiles WHERE email = 'test@igas.mx';
```

### 2. Crear un Cliente de Prueba

```sql
INSERT INTO clientes (razon_social, rfc, tipo_servicio)
VALUES ('Prueba SA de CV', 'XAXX010101000', 'Control Volumétrico');
```

### 3. Crear un Ticket de Prueba

```sql
-- Primero obtén IDs necesarios
SELECT id FROM clientes LIMIT 1; -- Usar este como cliente_id
SELECT id FROM categorias_servicio WHERE nombre = 'Soporte Técnico'; -- categoria_id
SELECT id FROM estatus_tickets WHERE nombre = 'Nuevo'; -- estatus_id
SELECT id FROM profiles LIMIT 1; -- creado_por

-- Crear ticket (sustituye los UUIDs)
INSERT INTO tickets (
  cliente_id,
  categoria_id,
  prioridad,
  canal,
  titulo,
  descripcion,
  estatus_id,
  sla_objetivo_minutos,
  creado_por
)
VALUES (
  'CLIENTE_ID_AQUI',
  'CATEGORIA_ID_AQUI',
  'Alta',
  'Portal',
  'Ticket de Prueba',
  'Este es un ticket de prueba para verificar el sistema',
  'ESTATUS_ID_AQUI',
  240,
  'CREADO_POR_ID_AQUI'
);

-- Verificar que se generó el folio automáticamente
SELECT folio, titulo, prioridad FROM tickets ORDER BY created_at DESC LIMIT 1;
-- Debe mostrar algo como: IGAS-20260111-0001
```

### 4. Verificar Vista de Tickets Completos

```sql
SELECT
  folio,
  titulo,
  cliente_nombre,
  categoria_nombre,
  estatus_nombre,
  responsable_nombre,
  porcentaje_sla
FROM tickets_completos
ORDER BY fecha_creacion DESC
LIMIT 5;
```

## 🔄 Rollback (Si algo sale mal)

Si necesitas revertir los cambios:

```sql
-- ⚠️ CUIDADO: Esto eliminará TODAS las tablas y datos

DROP TABLE IF EXISTS ticket_historial_asignaciones CASCADE;
DROP TABLE IF EXISTS ticket_bitacora CASCADE;
DROP TABLE IF EXISTS ticket_adjuntos CASCADE;
DROP TABLE IF EXISTS ticket_participantes CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS sucursales CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS estatus_tickets CASCADE;
DROP TABLE IF EXISTS categorias_servicio CASCADE;
DROP TABLE IF EXISTS horarios CASCADE;
DROP TABLE IF EXISTS equipos CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS generar_folio_ticket CASCADE;

DROP VIEW IF EXISTS tickets_completos CASCADE;
```

## 📝 Notas Importantes

1. **UUID Extension:** Si ves error sobre `uuid_generate_v4()`, asegúrate de que la extensión `uuid-ossp` esté habilitada

2. **RLS Policies:** Las políticas de RLS están configuradas de forma básica. Se refinan en fases posteriores

3. **Storage Buckets:** Los adjuntos usan Supabase Storage. Configurar en próximo paso

4. **Índices:** Los índices están optimizados para queries comunes. Ajustar según métricas de uso

5. **Datos de Prueba:** Los catálogos (roles, categorías, estatus) vienen con datos iniciales

## 🚨 Solución de Problemas

### Error: "extension uuid-ossp does not exist"

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "function auth.uid() does not exist"

- Verificar que estás en el proyecto correcto de Supabase
- Las funciones de autenticación son propias de Supabase

### Error: "relation auth.users does not exist"

- Verificar que estás ejecutando en el SQL Editor de Supabase
- No intentar ejecutar localmente

### Tablas no aparecen en Table Editor

- Refrescar el navegador
- Ir a **Database** → **Tables** en el dashboard

## 📞 Soporte

Si encuentras problemas:
1. Verificar los logs en SQL Editor
2. Revisar la documentación en `database/README.html`
3. Consultar la documentación de Supabase: https://supabase.com/docs

---

**Última actualización:** 11 de enero de 2026
**Versión del Schema:** 1.0.0
