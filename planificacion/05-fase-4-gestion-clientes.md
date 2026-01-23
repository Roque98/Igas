# Fase 4: Gestión de Clientes

## Objetivo
Crear el maestro de clientes con datos operativos, ubicación, datos fiscales, control de licencias HASP y pólizas de soporte con alertas automáticas.

---

## Tareas

### 1. Modelo de Datos - Clientes en Supabase

#### 1.1 Tabla Principal de Clientes

```sql
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo_cliente TEXT UNIQUE, -- Código interno
  nombre_comercial TEXT NOT NULL,
  razon_social TEXT NOT NULL,
  tipo TEXT CHECK (tipo IN ('Cliente', 'Prospecto', 'Inactivo')) DEFAULT 'Cliente',
  telefono_principal TEXT,
  telefono_secundario TEXT,
  email_principal TEXT,
  email_secundario TEXT,
  anydesk TEXT,
  estatus_cliente TEXT CHECK (estatus_cliente IN ('Activo', 'Suspendido', 'Sin póliza', 'En cobranza')) DEFAULT 'Activo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clientes_nombre ON clientes USING gin(to_tsvector('spanish', nombre_comercial));
CREATE INDEX idx_clientes_codigo ON clientes(codigo_cliente);
```

#### 1.2 Tabla de Sucursales

```sql
CREATE TABLE public.sucursales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  es_matriz BOOLEAN DEFAULT false,

  -- Dirección operativa
  calle TEXT,
  numero_exterior TEXT,
  numero_interior TEXT,
  colonia TEXT,
  municipio TEXT,
  estado TEXT,
  codigo_postal TEXT,
  pais TEXT DEFAULT 'México',
  referencias TEXT,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),

  -- Contactos
  telefono TEXT,
  email TEXT,

  estatus TEXT CHECK (estatus IN ('Activa', 'Inactiva')) DEFAULT 'Activa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sucursales_cliente ON sucursales(cliente_id);
```

#### 1.3 Tabla de Contactos

```sql
CREATE TABLE public.contactos_cliente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('Administrador', 'Encargado', 'Facturación', 'TI', 'Otro')) NOT NULL,
  nombre_completo TEXT NOT NULL,
  puesto TEXT,
  telefono TEXT,
  celular TEXT,
  email TEXT,
  es_contacto_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contactos_cliente ON contactos_cliente(cliente_id);
CREATE INDEX idx_contactos_sucursal ON contactos_cliente(sucursal_id);
```

#### 1.4 Datos Fiscales (CFDI)

```sql
CREATE TABLE public.datos_fiscales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE,
  razon_social TEXT NOT NULL,
  rfc TEXT NOT NULL CHECK (LENGTH(rfc) >= 12),
  regimen_fiscal TEXT NOT NULL,
  uso_cfdi_default TEXT,
  codigo_postal_fiscal TEXT NOT NULL,

  -- Dirección fiscal (si difiere de operativa)
  calle_fiscal TEXT,
  numero_exterior_fiscal TEXT,
  numero_interior_fiscal TEXT,
  colonia_fiscal TEXT,
  municipio_fiscal TEXT,
  estado_fiscal TEXT,

  email_facturacion TEXT NOT NULL,
  emails_copia TEXT[], -- Array de emails adicionales
  forma_pago_preferida TEXT,
  metodo_pago_preferido TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_datos_fiscales_cliente ON datos_fiscales(cliente_id);
CREATE INDEX idx_datos_fiscales_rfc ON datos_fiscales(rfc);
```

#### 1.5 Licencias / HASP

```sql
CREATE TABLE public.licencias_hasp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  sucursal_id UUID REFERENCES sucursales(id),
  tipo TEXT NOT NULL, -- "HASP", "Licencia Software", etc.
  folio TEXT,
  numero_serie TEXT,
  producto TEXT, -- "Volumétrico A30", "POS", etc.
  fecha_activacion DATE,
  fecha_vencimiento DATE,
  dias_alerta_previa INTEGER DEFAULT 30,
  estatus TEXT CHECK (estatus IN ('Activa', 'Por vencer', 'Vencida', 'Suspendida')) DEFAULT 'Activa',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_licencias_cliente ON licencias_hasp(cliente_id);
CREATE INDEX idx_licencias_vencimiento ON licencias_hasp(fecha_vencimiento);

-- Vista para licencias con estado calculado
CREATE OR REPLACE VIEW licencias_hasp_estado AS
SELECT
  l.*,
  CASE
    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
    WHEN l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'Por vencer'
    ELSE 'Activa'
  END as estado_calculado,
  l.fecha_vencimiento - CURRENT_DATE as dias_restantes
FROM licencias_hasp l;
```

#### 1.6 Historial de Renovaciones

```sql
CREATE TABLE public.licencias_renovaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licencia_id UUID REFERENCES licencias_hasp(id) ON DELETE CASCADE,
  fecha_renovacion DATE NOT NULL,
  fecha_vencimiento_anterior DATE,
  fecha_vencimiento_nueva DATE NOT NULL,
  costo DECIMAL(10, 2),
  renovado_por UUID REFERENCES profiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.7 Pólizas de Soporte

```sql
CREATE TABLE public.polizas_soporte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tipo TEXT CHECK (tipo IN ('Mensual', 'Anual', 'Por Evento')) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  costo DECIMAL(10, 2),
  cobertura TEXT, -- Descripción de lo que cubre
  estatus TEXT CHECK (estatus IN ('Activa', 'Por vencer', 'Vencida', 'En cobranza', 'Suspendida')) DEFAULT 'Activa',
  dias_alerta_previa INTEGER DEFAULT 30,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_polizas_cliente ON polizas_soporte(cliente_id);
CREATE INDEX idx_polizas_vencimiento ON polizas_soporte(fecha_vencimiento);

-- Vista para pólizas con estado calculado
CREATE OR REPLACE VIEW polizas_soporte_estado AS
SELECT
  p.*,
  CASE
    WHEN p.estatus = 'En cobranza' THEN 'En cobranza'
    WHEN p.fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
    WHEN p.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' THEN 'Por vencer'
    ELSE 'Activa'
  END as estado_calculado,
  p.fecha_vencimiento - CURRENT_DATE as dias_restantes
FROM polizas_soporte p;
```

### 2. Alertas Automáticas de Vencimientos

#### 2.1 Tabla de Alertas

```sql
CREATE TABLE public.alertas_vencimiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT CHECK (tipo IN ('licencia', 'poliza')) NOT NULL,
  referencia_id UUID NOT NULL, -- ID de licencia o póliza
  cliente_id UUID REFERENCES clientes(id),
  fecha_vencimiento DATE NOT NULL,
  dias_para_vencer INTEGER,
  mensaje TEXT,
  notificado BOOLEAN DEFAULT false,
  fecha_notificacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alertas_tipo_ref ON alertas_vencimiento(tipo, referencia_id);
CREATE INDEX idx_alertas_fecha ON alertas_vencimiento(fecha_vencimiento);
```

#### 2.2 Función para Generar Alertas (Ejecutar diariamente con cron)

```sql
-- Generar alertas para licencias próximas a vencer
CREATE OR REPLACE FUNCTION generar_alertas_licencias()
RETURNS void AS $$
BEGIN
  INSERT INTO alertas_vencimiento (tipo, referencia_id, cliente_id, fecha_vencimiento, dias_para_vencer, mensaje)
  SELECT
    'licencia',
    l.id,
    l.cliente_id,
    l.fecha_vencimiento,
    l.fecha_vencimiento - CURRENT_DATE as dias_para_vencer,
    'La licencia ' || COALESCE(l.folio, l.numero_serie) || ' vence el ' || l.fecha_vencimiento
  FROM licencias_hasp l
  WHERE
    l.estatus != 'Vencida' AND
    l.fecha_vencimiento >= CURRENT_DATE AND
    l.fecha_vencimiento <= CURRENT_DATE + INTERVAL '45 days' AND
    NOT EXISTS (
      SELECT 1 FROM alertas_vencimiento a
      WHERE a.tipo = 'licencia'
        AND a.referencia_id = l.id
        AND a.fecha_vencimiento = l.fecha_vencimiento
    );
END;
$$ LANGUAGE plpgsql;

-- Generar alertas para pólizas próximas a vencer
CREATE OR REPLACE FUNCTION generar_alertas_polizas()
RETURNS void AS $$
BEGIN
  INSERT INTO alertas_vencimiento (tipo, referencia_id, cliente_id, fecha_vencimiento, dias_para_vencer, mensaje)
  SELECT
    'poliza',
    p.id,
    p.cliente_id,
    p.fecha_vencimiento,
    p.fecha_vencimiento - CURRENT_DATE as dias_para_vencer,
    'La póliza de ' || p.tipo || ' vence el ' || p.fecha_vencimiento
  FROM polizas_soporte p
  WHERE
    p.estatus NOT IN ('Vencida', 'Suspendida') AND
    p.fecha_vencimiento >= CURRENT_DATE AND
    p.fecha_vencimiento <= CURRENT_DATE + INTERVAL '30 days' AND
    NOT EXISTS (
      SELECT 1 FROM alertas_vencimiento a
      WHERE a.tipo = 'poliza'
        AND a.referencia_id = p.id
        AND a.fecha_vencimiento = p.fecha_vencimiento
    );
END;
$$ LANGUAGE plpgsql;
```

### 3. Row Level Security

```sql
-- Clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver clientes"
  ON clientes FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo Admins y Coordinadores pueden gestionar clientes"
  ON clientes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.rol_id = r.id
      WHERE p.id = auth.uid()
        AND r.nombre IN ('Admin', 'Coordinador', 'Facturación')
    )
  );

-- Aplicar políticas similares a sucursales, contactos, datos_fiscales, licencias, pólizas
```

### 4. Backend - Servicios Angular

#### 4.1 ClienteService

```typescript
export interface Cliente {
  id: string;
  codigo_cliente?: string;
  nombre_comercial: string;
  razon_social: string;
  tipo: 'Cliente' | 'Prospecto' | 'Inactivo';
  telefono_principal?: string;
  telefono_secundario?: string;
  email_principal?: string;
  email_secundario?: string;
  anydesk?: string;
  estatus_cliente: 'Activo' | 'Suspendido' | 'Sin póliza' | 'En cobranza';
  notas?: string;
}

export interface Sucursal {
  id: string;
  cliente_id: string;
  nombre: string;
  es_matriz: boolean;
  // Dirección
  calle?: string;
  numero_exterior?: string;
  colonia?: string;
  municipio?: string;
  estado?: string;
  codigo_postal?: string;
  latitud?: number;
  longitud?: number;
  // Contacto
  telefono?: string;
  email?: string;
  estatus: 'Activa' | 'Inactiva';
}

export interface DatosFiscales {
  id: string;
  cliente_id: string;
  razon_social: string;
  rfc: string;
  regimen_fiscal: string;
  uso_cfdi_default?: string;
  codigo_postal_fiscal: string;
  email_facturacion: string;
}

export interface LicenciaHasp {
  id: string;
  cliente_id: string;
  sucursal_id?: string;
  tipo: string;
  folio?: string;
  producto?: string;
  fecha_vencimiento: string;
  estatus: string;
  dias_restantes?: number;
}

export interface PolizaSoporte {
  id: string;
  cliente_id: string;
  tipo: 'Mensual' | 'Anual' | 'Por Evento';
  fecha_vencimiento: string;
  costo?: number;
  estatus: string;
  dias_restantes?: number;
}
```

- [ ] Crear ClienteService con CRUD completo
- [ ] Crear SucursalService
- [ ] Crear ContactoService
- [ ] Crear DatosFiscalesService
- [ ] Crear LicenciaService
- [ ] Crear PolizaService
- [ ] Implementar búsqueda de clientes (autocomplete)
- [ ] Implementar getClienteCompleto(id) - con todas las relaciones
- [ ] Implementar getAlertasVencimiento()
- [ ] Implementar renovarLicencia(id, datos)
- [ ] Implementar renovarPoliza(id, datos)

### 5. Frontend - Módulo de Clientes

#### 5.1 Listado de Clientes

- [ ] Crear módulo features/clientes
- [ ] Crear componente de listado:
  - [ ] Tabla con: Código, Nombre Comercial, Teléfono, Email, Estatus
  - [ ] Badge de estatus del cliente:
    - Activo: verde (#4CAF50)
    - Sin póliza: amarillo (#FFC107)
    - En cobranza: rojo (#F44336)
    - Suspendido: gris
  - [ ] Indicador visual de alertas (icono campana si tiene vencimientos próximos)
  - [ ] Filtros:
    - Por estatus
    - Por tipo (Cliente/Prospecto)
    - Con/sin póliza activa
    - Con licencias por vencer
  - [ ] Búsqueda por nombre/RFC
  - [ ] Paginación
  - [ ] Botón "Agregar cliente"

#### 5.2 Formulario de Cliente

- [ ] Crear componente de formulario (stepper/wizard):
  - **Paso 1: Datos Generales**
    - Nombre comercial (requerido)
    - Razón social (requerido)
    - Código cliente (auto o manual)
    - Tipo (select)
    - Teléfonos
    - Emails
    - AnyDesk
    - Estatus cliente
  - **Paso 2: Sucursales**
    - Listado de sucursales
    - Formulario de agregar sucursal
    - Marcar sucursal matriz
    - Campos de dirección completa
    - Mapa para GPS (opcional - Google Maps API)
  - **Paso 3: Contactos**
    - Listado de contactos
    - Formulario de agregar contacto
    - Tipo de contacto (select)
    - Marcar contacto principal
  - **Paso 4: Datos Fiscales**
    - RFC (validación)
    - Razón social fiscal
    - Régimen fiscal (select con catálogo SAT)
    - Uso CFDI (select)
    - Código postal fiscal (validación)
    - Dirección fiscal
    - Emails de facturación (chips/tags)
  - **Paso 5: Resumen**
    - Vista previa de todos los datos
    - Botón "Guardar cliente"

#### 5.3 Detalle de Cliente

- [ ] Crear componente de detalle con tabs:
  - **Tab: General**
    - Card con información general
    - Badges de estatus
    - Botón editar
    - Sección de alertas activas
  - **Tab: Sucursales**
    - Listado de sucursales
    - Indicador de matriz
    - Dirección completa
    - Mapa con ubicaciones (opcional)
    - CRUD inline
  - **Tab: Contactos**
    - Listado de contactos por tipo
    - Contacto principal destacado
    - Links directos (llamar, email, WhatsApp)
    - CRUD inline
  - **Tab: Datos Fiscales**
    - Card con información fiscal
    - Botón "Generar factura" (opcional - integración futura)
    - Edición inline
  - **Tab: Licencias/HASP**
    - Listado de licencias
    - Badge de estado (Activa/Por vencer/Vencida)
    - Countdown de días restantes
    - Colores de alerta (verde/amarillo/rojo)
    - Botón "Renovar licencia"
    - Historial de renovaciones
  - **Tab: Póliza de Soporte**
    - Card con póliza actual
    - Badge de estado
    - Countdown de días restantes
    - Botón "Renovar póliza"
    - Historial de pólizas
  - **Tab: Historial**
    - Tickets del cliente (últimos 10)
    - Casos relacionados
    - Mantenimientos realizados
    - Instalaciones

#### 5.4 Dashboard de Alertas

- [ ] Crear componente de alertas:
  - [ ] Widget: Licencias por vencer (45/30/15 días)
  - [ ] Widget: Pólizas por vencer (30 días)
  - [ ] Widget: Clientes sin póliza
  - [ ] Widget: Clientes en cobranza
  - [ ] Lista detallada con filtros
  - [ ] Acciones rápidas (renovar, contactar)
  - [ ] Exportar a Excel

#### 5.5 Modal de Renovación

- [ ] Crear modal de renovación de licencia:
  - [ ] Mostrar datos actuales
  - [ ] Date picker nueva fecha vencimiento
  - [ ] Input de costo
  - [ ] Textarea de notas
  - [ ] Registrar en historial
  - [ ] Generar alerta futura
- [ ] Crear modal de renovación de póliza (similar)

### 6. Validaciones y Reglas de Negocio

#### 6.1 Validaciones de RFC

```typescript
// Validador de RFC
function validarRFC(rfc: string): boolean {
  const rfcPattern = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
  return rfcPattern.test(rfc);
}
```

- [ ] Implementar validador de RFC
- [ ] Validar formato de código postal (5 dígitos)
- [ ] Validar emails múltiples
- [ ] Validar que matriz sea única por cliente

#### 6.2 Alertas Visuales

- [ ] Mostrar alerta en detalle de ticket si cliente:
  - No tiene póliza activa
  - Está en cobranza
  - Está suspendido
  - Tiene licencias vencidas
- [ ] Warning al crear ticket para cliente sin póliza

### 7. Catálogos del SAT (México)

```sql
-- Régimen fiscal (catálogo SAT)
CREATE TABLE public.cat_regimen_fiscal (
  clave TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  persona_fisica BOOLEAN,
  persona_moral BOOLEAN
);

-- Uso CFDI (catálogo SAT)
CREATE TABLE public.cat_uso_cfdi (
  clave TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  persona_fisica BOOLEAN,
  persona_moral BOOLEAN
);

-- Insertar catálogos del SAT (versión 4.0)
```

- [ ] Crear tablas de catálogos SAT
- [ ] Poblar con datos oficiales
- [ ] Crear servicios para consumir catálogos

### 8. Integraciones Futuras (Opcional)

- [ ] Integración con API de Código Postal (Sepomex)
- [ ] Integración con Google Maps para geocodificación
- [ ] Validación de RFC con servicio del SAT
- [ ] Generación de facturas (integración con PAC)

---

## Entregables

- [ ] CRUD completo de clientes
- [ ] Gestión de sucursales y contactos
- [ ] Módulo de datos fiscales
- [ ] Control de licencias HASP con alertas
- [ ] Control de pólizas con alertas
- [ ] Dashboard de vencimientos
- [ ] Sistema de alertas automáticas
- [ ] Historial de renovaciones
- [ ] RLS policies implementadas
- [ ] Validaciones de datos fiscales

## Dependencias

- Fase 0: Configuración inicial
- Fase 1: Sistema de usuarios

## Criterios de Aceptación

- [ ] Clientes pueden ser creados con todos los datos
- [ ] Sucursales y contactos se gestionan correctamente
- [ ] Datos fiscales válidos según SAT
- [ ] Alertas se generan 45/30/15 días antes del vencimiento
- [ ] Dashboard muestra vencimientos próximos
- [ ] Estatus de cliente se refleja en tickets
- [ ] Renovaciones se registran en historial
- [ ] Búsqueda de clientes es rápida y eficiente

## Notas Técnicas

- Usar **Full Text Search** de PostgreSQL para búsqueda de clientes
- **Triggers** para actualizar estatus de licencias/pólizas
- **Cron job** (pg_cron o Edge Function programada) para generar alertas diarias
- **Views** para cálculos de estados y días restantes
- Considerar **PostGIS** si se requiere funcionalidad geoespacial avanzada
- **Índices** en campos de búsqueda (nombre, RFC, código)
