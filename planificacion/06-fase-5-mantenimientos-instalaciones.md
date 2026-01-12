# Fase 5: Mantenimientos e Instalaciones

## Objetivo
Desarrollar módulos de mantenimientos mensuales de BD con checklist y módulo de instalaciones con checklist, firma digital del cliente y generación automática de tickets/casos pendientes.

---

## Tareas

### 1. Modelo de Datos - Mantenimientos en Supabase

#### 1.1 Tabla de Mantenimientos

```sql
CREATE TABLE public.mantenimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id),
  tipo TEXT CHECK (tipo IN ('Mensual BD', 'Preventivo', 'Correctivo', 'Actualización')) DEFAULT 'Mensual BD',
  fecha_programada DATE NOT NULL,
  fecha_realizado TIMESTAMPTZ,
  responsable_id UUID REFERENCES profiles(id),
  estatus TEXT CHECK (estatus IN ('Programado', 'En proceso', 'Completado', 'Cancelado', 'Requiere acción')) DEFAULT 'Programado',
  resultado TEXT CHECK (resultado IN ('OK', 'Requiere acción', 'Cancelado')),
  notas_generales TEXT,
  tiempo_invertido_minutos INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mantenimientos_cliente ON mantenimientos(cliente_id);
CREATE INDEX idx_mantenimientos_fecha ON mantenimientos(fecha_programada);
CREATE INDEX idx_mantenimientos_estatus ON mantenimientos(estatus);
CREATE INDEX idx_mantenimientos_responsable ON mantenimientos(responsable_id);
```

#### 1.2 Template de Checklist

```sql
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo_mantenimiento TEXT NOT NULL,
  descripcion TEXT,
  orden INTEGER,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.checklist_items_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE,
  categoria TEXT, -- "Backup", "Integridad", "Espacio", "Índices", "Logs", etc.
  descripcion TEXT NOT NULL,
  orden INTEGER NOT NULL,
  es_critico BOOLEAN DEFAULT false,
  ayuda_texto TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar template para Mantenimiento Mensual BD
INSERT INTO checklist_templates (nombre, tipo_mantenimiento, descripcion, orden)
VALUES ('Mantenimiento Mensual BD', 'Mensual BD', 'Checklist estándar para mantenimiento mensual de base de datos', 1);

-- Insertar items del checklist
INSERT INTO checklist_items_template (template_id, categoria, descripcion, orden, es_critico) VALUES
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Backup', 'Verificar que existe backup reciente (menos de 24h)', 1, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Backup', 'Verificar integridad del backup', 2, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Espacio', 'Verificar espacio disponible en disco (mínimo 20%)', 3, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Integridad', 'Ejecutar DBCC CHECKDB (SQL Server) o equivalente', 4, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Índices', 'Revisar y optimizar índices fragmentados', 5, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Logs', 'Revisar logs de errores', 6, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Performance', 'Verificar queries lentos', 7, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Mantenimiento Mensual BD'), 'Seguridad', 'Verificar permisos y usuarios', 8, false);
```

#### 1.3 Checklist Ejecutado

```sql
CREATE TABLE public.mantenimiento_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mantenimiento_id UUID REFERENCES mantenimientos(id) ON DELETE CASCADE,
  item_descripcion TEXT NOT NULL,
  categoria TEXT,
  orden INTEGER,
  estado TEXT CHECK (estado IN ('Hecho', 'Pendiente', 'No aplica')) NOT NULL,
  es_critico BOOLEAN DEFAULT false,
  comentario TEXT,
  evidencia_url TEXT, -- URL de Storage para captura/foto
  verificado_por UUID REFERENCES profiles(id),
  verificado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_mantenimiento ON mantenimiento_checklist(mantenimiento_id);
```

#### 1.4 Evidencias de Mantenimiento

```sql
CREATE TABLE public.mantenimiento_evidencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mantenimiento_id UUID REFERENCES mantenimientos(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  ruta_storage TEXT NOT NULL,
  tipo_archivo TEXT,
  descripcion TEXT,
  subido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Modelo de Datos - Instalaciones

#### 2.1 Tabla de Instalaciones

```sql
CREATE TABLE public.instalaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE,
  cliente_id UUID REFERENCES clientes(id) NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id) NOT NULL,
  tipo_instalacion TEXT CHECK (tipo_instalacion IN ('Nueva', 'Actualización', 'Migración', 'Reinstalación')),
  fecha_programada DATE,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  responsable_id UUID REFERENCES profiles(id),
  equipo_instalacion UUID REFERENCES equipos(id),
  estatus TEXT CHECK (estatus IN ('Programada', 'En proceso', 'Pendientes', 'Cerrada', 'Cancelada')) DEFAULT 'Programada',

  -- Módulos a instalar
  modulos_instalados TEXT[], -- Array: "POS", "Volumétrico", "Facturación", etc.

  -- Firma digital
  firma_cliente_url TEXT,
  nombre_firmante TEXT,
  puesto_firmante TEXT,
  fecha_firma TIMESTAMPTZ,

  notas_generales TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_instalaciones_cliente ON instalaciones(cliente_id);
CREATE INDEX idx_instalaciones_fecha ON instalaciones(fecha_programada);
CREATE INDEX idx_instalaciones_estatus ON instalaciones(estatus);
```

#### 2.2 Template de Checklist de Instalación

```sql
-- Usar misma estructura de checklist_templates
INSERT INTO checklist_templates (nombre, tipo_mantenimiento, descripcion, orden)
VALUES ('Instalación Completa iGAS', 'Instalación', 'Checklist para instalación completa de sistema iGAS', 1);

INSERT INTO checklist_items_template (template_id, categoria, descripcion, orden, es_critico) VALUES
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Infraestructura', 'Verificar servidor/equipo cumple requisitos mínimos', 1, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Infraestructura', 'Verificar conexión a internet estable', 2, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Software', 'Instalar SQL Server / PostgreSQL', 3, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Software', 'Crear base de datos iGAS', 4, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Volumétrico', 'Instalar módulo Volumétrico A30', 5, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Volumétrico', 'Configurar dispensarios', 6, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'POS', 'Instalar módulo POS', 7, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'POS', 'Configurar impresora ticket', 8, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Facturación', 'Instalar módulo Facturación', 9, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Facturación', 'Configurar certificados SAT', 10, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'HASP', 'Instalar licencia HASP', 11, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'HASP', 'Verificar reconocimiento de licencia', 12, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Red', 'Configurar red local', 13, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Red', 'Configurar acceso remoto (AnyDesk)', 14, false),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Capacitación', 'Capacitar usuario en operación básica', 15, true),
  ((SELECT id FROM checklist_templates WHERE nombre = 'Instalación Completa iGAS'), 'Pruebas', 'Realizar pruebas funcionales', 16, true);
```

#### 2.3 Checklist de Instalación Ejecutado

```sql
CREATE TABLE public.instalacion_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instalacion_id UUID REFERENCES instalaciones(id) ON DELETE CASCADE,
  item_descripcion TEXT NOT NULL,
  categoria TEXT,
  modulo TEXT, -- "POS", "Volumétrico", "Facturación", etc.
  orden INTEGER,
  estado TEXT CHECK (estado IN ('Hecho', 'Pendiente', 'No aplica')) NOT NULL,
  es_critico BOOLEAN DEFAULT false,
  comentario TEXT,
  evidencia_url TEXT,
  verificado_por UUID REFERENCES profiles(id),
  verificado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.4 Items Pendientes de Instalación

```sql
CREATE TABLE public.instalacion_pendientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instalacion_id UUID REFERENCES instalaciones(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  prioridad TEXT CHECK (prioridad IN ('Alta', 'Media', 'Baja')) DEFAULT 'Media',
  fecha_compromiso DATE,
  asignado_a UUID REFERENCES profiles(id),
  ticket_id UUID REFERENCES tickets(id), -- Si se generó ticket
  caso_id UUID REFERENCES casos(id), -- Si se generó caso
  estatus TEXT CHECK (estatus IN ('Pendiente', 'En proceso', 'Resuelto')) DEFAULT 'Pendiente',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Funciones Automáticas

#### 3.1 Generar Tickets/Casos de Pendientes

```sql
-- Función para crear ticket automáticamente desde pendiente
CREATE OR REPLACE FUNCTION generar_ticket_desde_pendiente(
  p_pendiente_id UUID
) RETURNS UUID AS $$
DECLARE
  v_ticket_id UUID;
  v_pendiente RECORD;
  v_instalacion RECORD;
BEGIN
  -- Obtener pendiente
  SELECT * INTO v_pendiente FROM instalacion_pendientes WHERE id = p_pendiente_id;

  -- Obtener instalación
  SELECT * INTO v_instalacion FROM instalaciones WHERE id = v_pendiente.instalacion_id;

  -- Crear ticket
  INSERT INTO tickets (
    cliente_id,
    sucursal_id,
    categoria_id,
    prioridad,
    canal,
    descripcion,
    estatus_id,
    sla_objetivo_minutos,
    creado_por
  )
  SELECT
    v_instalacion.cliente_id,
    v_instalacion.sucursal_id,
    (SELECT id FROM categorias_servicio WHERE nombre = 'Implementación'),
    v_pendiente.prioridad,
    'Portal',
    'Pendiente de instalación: ' || v_pendiente.descripcion,
    (SELECT id FROM estatus_tickets WHERE nombre = 'Nuevo'),
    480, -- 8 horas
    v_instalacion.responsable_id
  RETURNING id INTO v_ticket_id;

  -- Actualizar pendiente con ticket generado
  UPDATE instalacion_pendientes
  SET ticket_id = v_ticket_id
  WHERE id = p_pendiente_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3.2 Trigger para Generar Alertas de Mantenimientos

```sql
-- Generar alertas de mantenimientos programados
CREATE OR REPLACE FUNCTION notificar_mantenimiento_programado()
RETURNS void AS $$
BEGIN
  INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos)
  SELECT
    m.responsable_id,
    'mantenimiento_programado',
    'Mantenimiento programado',
    'Tienes un mantenimiento programado para ' || c.nombre_comercial || ' el ' || m.fecha_programada,
    jsonb_build_object('mantenimiento_id', m.id, 'cliente', c.nombre_comercial, 'fecha', m.fecha_programada)
  FROM mantenimientos m
  JOIN clientes c ON m.cliente_id = c.id
  WHERE
    m.estatus = 'Programado' AND
    m.fecha_programada = CURRENT_DATE AND
    m.responsable_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
```

### 4. Storage para Firmas y Evidencias

```sql
-- Bucket para firmas digitales
INSERT INTO storage.buckets (id, name, public)
VALUES ('firmas-clientes', 'firmas-clientes', false);

-- Bucket para evidencias de mantenimientos
INSERT INTO storage.buckets (id, name, public)
VALUES ('mantenimiento-evidencias', 'mantenimiento-evidencias', false);

-- Bucket para evidencias de instalaciones
INSERT INTO storage.buckets (id, name, public)
VALUES ('instalacion-evidencias', 'instalacion-evidencias', false);
```

### 5. Backend - Servicios Angular

#### 5.1 MantenimientoService

```typescript
export interface Mantenimiento {
  id: string;
  cliente_id: string;
  sucursal_id?: string;
  tipo: 'Mensual BD' | 'Preventivo' | 'Correctivo' | 'Actualización';
  fecha_programada: string;
  fecha_realizado?: string;
  responsable_id?: string;
  estatus: 'Programado' | 'En proceso' | 'Completado' | 'Cancelado' | 'Requiere acción';
  resultado?: 'OK' | 'Requiere acción' | 'Cancelado';
  notas_generales?: string;
  tiempo_invertido_minutos?: number;
}

export interface ChecklistItem {
  id: string;
  item_descripcion: string;
  categoria?: string;
  orden: number;
  estado: 'Hecho' | 'Pendiente' | 'No aplica';
  es_critico: boolean;
  comentario?: string;
  evidencia_url?: string;
}
```

- [ ] Crear MantenimientoService
- [ ] Implementar CRUD de mantenimientos
- [ ] Implementar getMantenimientosProgramados(fecha)
- [ ] Implementar getChecklistTemplate(tipo)
- [ ] Implementar guardarChecklist(mantenimientoId, items)
- [ ] Implementar completarMantenimiento(id, resultado)
- [ ] Implementar subirEvidencia(mantenimientoId, file)
- [ ] Implementar generarTicketSiRequiereAccion(mantenimientoId)

#### 5.2 InstalacionService

```typescript
export interface Instalacion {
  id: string;
  folio?: string;
  cliente_id: string;
  sucursal_id: string;
  tipo_instalacion: 'Nueva' | 'Actualización' | 'Migración' | 'Reinstalación';
  fecha_programada?: string;
  responsable_id?: string;
  estatus: 'Programada' | 'En proceso' | 'Pendientes' | 'Cerrada' | 'Cancelada';
  modulos_instalados?: string[];
  firma_cliente_url?: string;
  nombre_firmante?: string;
  fecha_firma?: string;
}

export interface Pendiente {
  id: string;
  descripcion: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  fecha_compromiso?: string;
  asignado_a?: string;
  estatus: 'Pendiente' | 'En proceso' | 'Resuelto';
}
```

- [ ] Crear InstalacionService
- [ ] Implementar CRUD de instalaciones
- [ ] Implementar getChecklistTemplate(modulos)
- [ ] Implementar guardarChecklist(instalacionId, items)
- [ ] Implementar guardarFirma(instalacionId, firmaBase64, datos)
- [ ] Implementar agregarPendiente(instalacionId, pendiente)
- [ ] Implementar generarTicketDesdePendiente(pendienteId)
- [ ] Implementar cerrarInstalacion(id)

### 6. Frontend - Módulo de Mantenimientos

#### 6.1 Calendario de Mantenimientos

- [ ] Crear módulo features/mantenimientos
- [ ] Crear componente calendario mensual:
  - [ ] Vista de calendario con mantenimientos programados
  - [ ] Colores por estatus
  - [ ] Click en día para ver/agregar mantenimientos
  - [ ] Arrastrar para reprogramar
  - [ ] Filtros por técnico, cliente, estatus

#### 6.2 Listado de Mantenimientos

- [ ] Crear componente de listado:
  - [ ] Tabla con: Fecha, Cliente, Sucursal, Tipo, Responsable, Estatus, Resultado
  - [ ] Badges de estatus
  - [ ] Badge de resultado (OK en verde, Requiere acción en rojo)
  - [ ] Filtros por fecha, estatus, responsable
  - [ ] Botón "Programar mantenimiento"

#### 6.3 Formulario de Mantenimiento

- [ ] Crear componente de programación:
  - [ ] Selector de cliente/sucursal
  - [ ] Selector de tipo
  - [ ] Date picker de fecha
  - [ ] Selector de responsable
  - [ ] Notas

#### 6.4 Ejecución de Mantenimiento (Checklist)

- [ ] Crear componente de ejecución:
  - [ ] Header con datos del cliente
  - [ ] Botón "Iniciar mantenimiento" (registra fecha_inicio)
  - [ ] Checklist interactivo:
    - Items agrupados por categoría
    - Checkbox para marcar Hecho/Pendiente/No aplica
    - Campo de comentario por item
    - Upload de evidencia (foto/captura) por item
    - Indicador visual de items críticos
  - [ ] Contador de tiempo invertido
  - [ ] Campo de notas generales
  - [ ] Botón "Completar mantenimiento":
    - Validar que items críticos estén completados
    - Seleccionar resultado (OK / Requiere acción)
    - Si "Requiere acción", preguntar si generar ticket
    - Guardar y cerrar

### 7. Frontend - Módulo de Instalaciones

#### 7.1 Pipeline de Instalaciones

- [ ] Crear componente de pipeline (Kanban):
  - [ ] Columnas: Programada, En proceso, Pendientes, Cerrada
  - [ ] Cards de instalaciones arrastrables
  - [ ] Información resumida en card
  - [ ] Click para ver detalle

#### 7.2 Formulario de Instalación

- [ ] Crear componente de programación:
  - [ ] Selector de cliente/sucursal
  - [ ] Selector de tipo
  - [ ] Multiselect de módulos a instalar
  - [ ] Date picker de fecha
  - [ ] Selector de equipo/responsable
  - [ ] Generar checklist según módulos seleccionados

#### 7.3 Ejecución de Instalación

- [ ] Crear componente de ejecución:
  - [ ] Similar a mantenimientos
  - [ ] Checklist dinámico según módulos
  - [ ] Sección de pendientes:
    - Agregar pendiente inline
    - Descripción, prioridad, fecha compromiso
    - Asignar responsable
    - Opción "Generar ticket automáticamente"
  - [ ] Sección de firma digital:
    - Canvas para firma
    - Input nombre del firmante
    - Input puesto
    - Botón "Guardar firma"
    - Preview de firma guardada
  - [ ] Validación antes de cerrar:
    - Items críticos completados
    - Firma del cliente capturada
    - Pendientes asignados o resueltos

#### 7.4 Componente de Firma Digital

```typescript
// Usar library: signature_pad o angular-signature-pad
```

- [ ] Implementar canvas de firma
- [ ] Botón "Limpiar"
- [ ] Botón "Guardar"
- [ ] Convertir a base64
- [ ] Subir a Storage de Supabase
- [ ] Mostrar preview

### 8. Reportes

#### 8.1 Reporte de Mantenimientos

- [ ] Crear componente de reporte:
  - [ ] Mantenimientos realizados vs pendientes
  - [ ] Porcentaje de mantenimientos OK vs Requiere acción
  - [ ] Tiempo promedio de mantenimiento
  - [ ] Gráfica por mes (ApexCharts)
  - [ ] Exportar a PDF/Excel

#### 8.2 Reporte de Instalaciones

- [ ] Crear componente de reporte:
  - [ ] Instalaciones cerradas vs pendientes
  - [ ] Promedio de pendientes por instalación
  - [ ] Tiempo promedio de instalación
  - [ ] Gráfica de instalaciones por mes

---

## Entregables

- [ ] Módulo de mantenimientos con checklist dinámico
- [ ] Módulo de instalaciones con checklist personalizable
- [ ] Sistema de firma digital
- [ ] Generación automática de tickets desde pendientes
- [ ] Calendario de mantenimientos
- [ ] Pipeline de instalaciones (Kanban)
- [ ] Evidencias fotográficas
- [ ] Reportes de productividad

## Dependencias

- Fase 0: Configuración inicial
- Fase 1: Usuarios
- Fase 2: Tickets (para generación automática)
- Fase 4: Clientes

## Criterios de Aceptación

- [ ] Mantenimientos pueden programarse y ejecutarse con checklist
- [ ] Instalaciones tienen checklist según módulos instalados
- [ ] Firma digital se captura y almacena correctamente
- [ ] Pendientes generan tickets automáticamente
- [ ] Evidencias se suben a Storage
- [ ] Items críticos validan antes de completar
- [ ] Calendario muestra mantenimientos del mes

## Notas Técnicas

- **Storage de Supabase** para firmas y evidencias
- **Templates dinámicos** para checklists personalizables
- Usar **signature_pad** o librería similar para firma
- **Triggers** para notificaciones de mantenimientos programados
- Considerar **offline mode** para instalaciones en campo (PWA)
