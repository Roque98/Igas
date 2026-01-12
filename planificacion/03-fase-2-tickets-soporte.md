# Fase 2: Módulo Core - Tickets de Soporte

## Objetivo
Desarrollar el módulo principal de tickets de soporte con sistema de SLA, semáforos, bitácora y gestión completa del ciclo de vida de tickets usando Supabase.

---

## Tareas

### 1. Modelo de Datos - Tickets en Supabase

#### 1.1 Tabla Principal de Tickets

```sql
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id),
  categoria_id UUID REFERENCES categorias_servicio(id) NOT NULL,
  prioridad TEXT CHECK (prioridad IN ('Crítica', 'Alta', 'Media', 'Baja')) NOT NULL,
  canal TEXT CHECK (canal IN ('Teléfono', 'WhatsApp', 'Correo', 'Portal')) NOT NULL,
  responsable_id UUID REFERENCES profiles(id),
  equipo_id UUID REFERENCES equipos(id),
  descripcion TEXT NOT NULL,
  estatus_id UUID REFERENCES estatus_tickets(id) NOT NULL,
  sla_objetivo_minutos INTEGER NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_primera_respuesta TIMESTAMPTZ,
  fecha_resolucion TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ,
  tiempo_pausado_minutos INTEGER DEFAULT 0,
  creado_por UUID REFERENCES profiles(id) NOT NULL,
  cerrado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_tickets_folio ON tickets(folio);
CREATE INDEX idx_tickets_cliente ON tickets(cliente_id);
CREATE INDEX idx_tickets_responsable ON tickets(responsable_id);
CREATE INDEX idx_tickets_estatus ON tickets(estatus_id);
CREATE INDEX idx_tickets_fecha_creacion ON tickets(fecha_creacion DESC);
```

#### 1.2 Tablas Relacionadas

```sql
-- Participantes del ticket
CREATE TABLE public.ticket_participantes (
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ticket_id, usuario_id)
);

-- Adjuntos
CREATE TABLE public.ticket_adjuntos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  ruta_storage TEXT NOT NULL,
  tipo_archivo TEXT,
  tamanio_bytes BIGINT,
  subido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bitácora (timeline)
CREATE TABLE public.ticket_bitacora (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  tipo TEXT CHECK (tipo IN ('nota', 'cambio_estatus', 'asignacion', 'adjunto', 'escalamiento')) NOT NULL,
  mensaje TEXT,
  datos_adicionales JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de asignaciones
CREATE TABLE public.ticket_historial_asignaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  de_usuario_id UUID REFERENCES profiles(id),
  a_usuario_id UUID REFERENCES profiles(id),
  motivo TEXT,
  asignado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.3 Catálogos

```sql
-- Categorías de servicio
CREATE TABLE public.categorias_servicio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  icono TEXT,
  color TEXT,
  sla_default_minutos INTEGER,
  estatus TEXT DEFAULT 'Activo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categorias_servicio (nombre, sla_default_minutos, color) VALUES
  ('Volumétrico A30', 240, '#04a9f5'),
  ('Facturación', 480, '#f4c22b'),
  ('POS', 180, '#1de9b6'),
  ('BD', 120, '#f44236'),
  ('Hasp', 240, '#a389d4'),
  ('Red', 180, '#3ebfea'),
  ('Otros', 360, '#748892');

-- Estatus de tickets
CREATE TABLE public.estatus_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  orden INTEGER,
  pausa_sla BOOLEAN DEFAULT false,
  es_final BOOLEAN DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO estatus_tickets (nombre, orden, pausa_sla, es_final, color) VALUES
  ('Nuevo', 1, false, false, '#1de9b6'),
  ('En atención', 2, false, false, '#04a9f5'),
  ('En espera de cliente', 3, true, false, '#f4c22b'),
  ('Seguimiento', 4, false, false, '#a389d4'),
  ('Resuelto', 5, false, false, '#00A651'),
  ('Cerrado', 6, false, true, '#748892');

-- Canales de contacto
CREATE TABLE public.canales_contacto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  icono TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO canales_contacto (nombre, icono) VALUES
  ('Teléfono', 'phone'),
  ('WhatsApp', 'whatsapp'),
  ('Correo', 'email'),
  ('Portal', 'web');
```

### 2. Sistema de Folios Automático

```sql
-- Secuencia por año
CREATE SEQUENCE ticket_folio_seq;

-- Función para generar folio TKT-AAAA-####
CREATE OR REPLACE FUNCTION generar_folio_ticket()
RETURNS TEXT AS $$
DECLARE
  anio TEXT;
  numero INTEGER;
  folio TEXT;
BEGIN
  anio := EXTRACT(YEAR FROM NOW())::TEXT;
  numero := nextval('ticket_folio_seq');

  -- Reset secuencia si cambió el año
  IF numero > 1 AND NOT EXISTS (
    SELECT 1 FROM tickets
    WHERE folio LIKE 'TKT-' || anio || '-%'
  ) THEN
    ALTER SEQUENCE ticket_folio_seq RESTART WITH 1;
    numero := nextval('ticket_folio_seq');
  END IF;

  folio := 'TKT-' || anio || '-' || LPAD(numero::TEXT, 4, '0');
  RETURN folio;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar folio automáticamente
CREATE OR REPLACE FUNCTION asignar_folio_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL THEN
    NEW.folio := generar_folio_ticket();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asignar_folio
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION asignar_folio_ticket();
```

### 3. Sistema de SLA y Semáforos

#### 3.1 Configuración de SLA

```sql
CREATE TABLE public.sla_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prioridad TEXT,
  categoria_id UUID REFERENCES categorias_servicio(id),
  cliente_id UUID REFERENCES clientes(id), -- NULL = aplica a todos
  tiempo_objetivo_minutos INTEGER NOT NULL,
  aplica_horario_habil BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Horarios hábiles (ya creado en Fase 1)
-- Días festivos
CREATE TABLE public.dias_festivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3.2 Función de Cálculo de SLA

```sql
-- Vista para calcular SLA y semáforo en tiempo real
CREATE OR REPLACE VIEW tickets_con_sla AS
SELECT
  t.*,
  COALESCE(
    (SELECT tiempo_objetivo_minutos
     FROM sla_config
     WHERE (prioridad = t.prioridad OR prioridad IS NULL)
       AND (categoria_id = t.categoria_id OR categoria_id IS NULL)
       AND (cliente_id = t.cliente_id OR cliente_id IS NULL)
     ORDER BY cliente_id NULLS LAST, categoria_id NULLS LAST, prioridad NULLS LAST
     LIMIT 1),
    t.sla_objetivo_minutos
  ) as sla_calculado,
  EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos as minutos_transcurridos,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos < t.sla_objetivo_minutos * 0.7
      THEN 'verde'
    WHEN EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos <= t.sla_objetivo_minutos
      THEN 'amarillo'
    ELSE 'rojo'
  END as semaforo,
  ROUND(
    ((EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) / t.sla_objetivo_minutos * 100)::NUMERIC,
    2
  ) as porcentaje_sla
FROM tickets t;
```

#### 3.3 Función para Pausar/Reanudar SLA

```sql
-- Trigger para pausar SLA cuando estatus es "En espera de cliente"
CREATE OR REPLACE FUNCTION manejar_pausa_sla()
RETURNS TRIGGER AS $$
DECLARE
  estatus_pausa BOOLEAN;
  estatus_anterior_pausa BOOLEAN;
BEGIN
  -- Verificar si el nuevo estatus pausa el SLA
  SELECT pausa_sla INTO estatus_pausa
  FROM estatus_tickets
  WHERE id = NEW.estatus_id;

  -- Verificar si el estatus anterior pausaba el SLA
  IF TG_OP = 'UPDATE' THEN
    SELECT pausa_sla INTO estatus_anterior_pausa
    FROM estatus_tickets
    WHERE id = OLD.estatus_id;

    -- Si cambió de pausado a activo o viceversa, registrar
    IF estatus_pausa != estatus_anterior_pausa THEN
      INSERT INTO ticket_bitacora (ticket_id, usuario_id, tipo, mensaje)
      VALUES (
        NEW.id,
        auth.uid(),
        'cambio_estatus',
        CASE WHEN estatus_pausa THEN 'SLA pausado' ELSE 'SLA reanudado' END
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pausa_sla
  AFTER INSERT OR UPDATE OF estatus_id ON tickets
  FOR EACH ROW EXECUTE FUNCTION manejar_pausa_sla();
```

### 4. Row Level Security (RLS) para Tickets

```sql
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Técnicos pueden ver tickets asignados a ellos o a su equipo
CREATE POLICY "Técnicos ven tickets de su equipo"
  ON tickets FOR SELECT
  USING (
    responsable_id = auth.uid() OR
    equipo_id IN (
      SELECT area_equipo_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Coordinadores y Admins ven todos los tickets
CREATE POLICY "Coordinadores y Admins ven todos"
  ON tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.rol_id = r.id
      WHERE p.id = auth.uid()
        AND r.nombre IN ('Coordinador', 'Admin')
    )
  );

-- Todos los autenticados pueden crear tickets
CREATE POLICY "Usuarios pueden crear tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Solo el responsable o coordinadores pueden actualizar
CREATE POLICY "Responsable o Coordinador puede actualizar"
  ON tickets FOR UPDATE
  USING (
    responsable_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.rol_id = r.id
      WHERE p.id = auth.uid()
        AND r.nombre IN ('Coordinador', 'Admin')
    )
  );
```

### 5. Backend - Servicio Angular

#### 5.1 TicketService

```typescript
export interface Ticket {
  id: string;
  folio: string;
  cliente_id: string;
  sucursal_id?: string;
  categoria_id: string;
  prioridad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  canal: 'Teléfono' | 'WhatsApp' | 'Correo' | 'Portal';
  responsable_id?: string;
  equipo_id?: string;
  descripcion: string;
  estatus_id: string;
  sla_objetivo_minutos: number;
  fecha_creacion: string;
  fecha_primera_respuesta?: string;
  fecha_resolucion?: string;
  fecha_cierre?: string;
  tiempo_pausado_minutos: number;
  creado_por: string;
  cerrado_por?: string;

  // Campos calculados de la vista
  semaforo?: 'verde' | 'amarillo' | 'rojo';
  porcentaje_sla?: number;
  minutos_transcurridos?: number;
}
```

- [ ] Crear TicketService
- [ ] Implementar createTicket(ticket)
- [ ] Implementar getTickets(filtros) con paginación
- [ ] Implementar getTicketById(id)
- [ ] Implementar updateTicket(id, data)
- [ ] Implementar deleteTicket(id)
- [ ] Implementar cambiarEstatus(id, estatusId, nota)
- [ ] Implementar asignarTicket(id, usuarioId, motivo)
- [ ] Implementar escalarACaso(ticketId, datos)
- [ ] Implementar getTicketTimeline(id)
- [ ] Implementar agregarNota(ticketId, nota)
- [ ] Implementar subirAdjunto(ticketId, file)
- [ ] Implementar getTicketsPorSemaforo()
- [ ] Usar Supabase Realtime para actualizaciones en vivo

### 6. Frontend - Módulo de Tickets

#### 6.1 Dashboard de Tickets

- [ ] Crear módulo features/tickets
- [ ] Crear componente dashboard:
  - [ ] Widgets de resumen:
    - Total tickets activos
    - Mis tickets
    - Tickets sin asignar
    - Por semáforo (verde/amarillo/rojo)
  - [ ] Gráfica de tickets por categoría (ApexCharts)
  - [ ] Gráfica de cumplimiento SLA
  - [ ] Lista de alertas (SLA en rojo)
- [ ] Usar colores iGAS para widgets principales

#### 6.2 Listado de Tickets

- [ ] Crear componente de listado:
  - [ ] Tabla responsive con Bootstrap
  - [ ] Columnas: Folio, Cliente, Categoría, Prioridad, Responsable, Estatus, Semáforo, SLA %
  - [ ] Badges de prioridad con colores
  - [ ] Badges de estatus personalizados
  - [ ] Semáforo visual: 🟢 🟡 🔴
  - [ ] Barra de progreso SLA con colores (#4CAF50, #FFC107, #F44336)
  - [ ] Filtros:
    - Por estatus (multiselect)
    - Por prioridad
    - Por semáforo
    - Por responsable
    - Por cliente
    - Por rango de fechas
  - [ ] Búsqueda por folio/descripción
  - [ ] Ordenamiento por columnas
  - [ ] Paginación con Supabase

#### 6.3 Creación de Ticket

- [ ] Crear componente modal de creación:
  - [ ] Formulario reactivo con validaciones
  - [ ] Selector de cliente (autocomplete)
  - [ ] Selector de sucursal (filtrado por cliente)
  - [ ] Selector de categoría (con iconos)
  - [ ] Selector de prioridad (radio buttons con badges)
  - [ ] Selector de canal
  - [ ] Textarea de descripción (mínimo 20 caracteres)
  - [ ] Upload múltiple de adjuntos:
    - Drag & drop
    - Validar tipo (imagen, PDF, .txt, .log)
    - Validar tamaño (max 5MB por archivo)
    - Preview de imágenes
  - [ ] Vista previa antes de crear
  - [ ] Loading state al crear

#### 6.4 Detalle de Ticket

- [ ] Crear componente de detalle:
  - [ ] Header con folio prominente (amarillo iGAS)
  - [ ] Badge grande de semáforo
  - [ ] Barra de progreso SLA horizontal
  - [ ] Card de información:
    - Cliente y sucursal
    - Categoría y prioridad
    - Canal de contacto
    - Responsable y equipo
    - Estatus actual
    - Fechas importantes
  - [ ] Timeline vertical de bitácora:
    - Ordenado cronológicamente (más reciente arriba)
    - Iconos por tipo de evento
    - Avatar del usuario
    - Timestamp relativo ("hace 2 horas")
    - Notas de usuarios
    - Cambios de estatus
    - Asignaciones/reasignaciones
    - Adjuntos
  - [ ] Sección de adjuntos:
    - Grid de thumbnails
    - Click para ver fullscreen
    - Botón de descarga
  - [ ] Área de acciones rápidas:
    - Cambiar estatus (dropdown)
    - Asignar/Reasignar
    - Escalar a caso
    - Agregar nota
    - Subir adjunto
  - [ ] Comentarios en tiempo real (Supabase Realtime)

#### 6.5 Acciones sobre Tickets

- [ ] Implementar cambio de estatus:
  - [ ] Modal con selector de estatus
  - [ ] Campo de nota obligatoria
  - [ ] Validar transiciones permitidas
  - [ ] Actualizar automáticamente fecha_primera_respuesta
  - [ ] Actualizar fecha_resolucion si estatus es "Resuelto"
- [ ] Implementar asignación/reasignación:
  - [ ] Modal con selector de usuario
  - [ ] Filtrar por equipo/rol
  - [ ] Campo de motivo
  - [ ] Registrar en historial
  - [ ] Notificar al nuevo responsable
- [ ] Implementar escalamiento a caso:
  - [ ] Modal de escalamiento
  - [ ] Selector de área destino
  - [ ] Selector de motivo
  - [ ] Descripción adicional
  - [ ] Crear caso y vincular
  - [ ] Cambiar estatus del ticket a "Escalado"
- [ ] Implementar cierre de ticket:
  - [ ] Validar que esté en estatus "Resuelto"
  - [ ] Nota de cierre obligatoria
  - [ ] Confirmación
  - [ ] Actualizar fecha_cierre

#### 6.6 Componentes Reutilizables

- [ ] Crear componente SemaforoBadge:
  - Input: porcentaje SLA
  - Output: badge con color (#4CAF50, #FFC107, #F44336)
- [ ] Crear componente PrioridadBadge:
  - Colores diferenciados
- [ ] Crear componente EstatusBadge:
  - Usar colores de BD
- [ ] Crear componente ProgressBarSLA:
  - Colores según semáforo
  - Mostrar porcentaje

### 7. Storage de Supabase para Adjuntos

#### 7.1 Configuración de Bucket

```sql
-- Crear bucket para adjuntos de tickets
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- Policy para subir archivos
CREATE POLICY "Usuarios autenticados pueden subir"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments' AND
    auth.uid() IS NOT NULL
  );

-- Policy para descargar archivos
CREATE POLICY "Usuarios pueden descargar adjuntos de tickets que pueden ver"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ticket-attachments' AND
    auth.uid() IS NOT NULL
  );
```

- [ ] Crear bucket en Supabase Dashboard
- [ ] Configurar RLS policies
- [ ] Implementar servicio de upload en Angular
- [ ] Generar URLs firmadas para descarga

### 8. Notificaciones Básicas

#### 8.1 Triggers para Notificaciones

```sql
-- Tabla de notificaciones
CREATE TABLE public.notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES profiles(id),
  tipo TEXT,
  titulo TEXT,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  datos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notificar al asignar ticket
CREATE OR REPLACE FUNCTION notificar_asignacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.responsable_id IS NOT NULL AND (
    OLD.responsable_id IS NULL OR
    OLD.responsable_id != NEW.responsable_id
  ) THEN
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos)
    VALUES (
      NEW.responsable_id,
      'ticket_asignado',
      'Ticket asignado',
      'Se te ha asignado el ticket ' || NEW.folio,
      jsonb_build_object('ticket_id', NEW.id, 'folio', NEW.folio)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_asignacion
  AFTER INSERT OR UPDATE OF responsable_id ON tickets
  FOR EACH ROW EXECUTE FUNCTION notificar_asignacion();
```

- [ ] Implementar notificaciones en app
- [ ] Badge de notificaciones no leídas en navbar
- [ ] Panel de notificaciones

---

## Entregables

- [ ] Módulo de tickets completamente funcional
- [ ] Sistema de SLA con semáforos operativo
- [ ] Bitácora y evidencias funcionando
- [ ] Dashboard de tickets
- [ ] Upload y visualización de adjuntos
- [ ] Panel de configuración de SLA
- [ ] RLS policies implementadas
- [ ] Notificaciones básicas

## Dependencias

- Fase 0: Configuración inicial
- Fase 1: Sistema de usuarios
- Módulo de Clientes (básico) - en paralelo en Fase 4

## Criterios de Aceptación

- [ ] Usuarios pueden crear tickets con todos los campos
- [ ] SLA se calcula correctamente (horarios hábiles)
- [ ] Semáforos se muestran en verde/amarillo/rojo
- [ ] Bitácora registra todas las acciones
- [ ] Asignaciones funcionan con notificaciones
- [ ] Adjuntos se suben a Supabase Storage
- [ ] Dashboard muestra información en tiempo real
- [ ] RLS protege acceso a datos

## Notas Técnicas Supabase

- Usar **Supabase Realtime** para actualizaciones de tickets en vivo
- **Storage** para adjuntos con políticas de seguridad
- **Views** para cálculos de SLA (mejor performance)
- **Triggers** para automatizar folio, bitácora, notificaciones
- **RLS** para seguridad real a nivel de BD
- Considerar **Edge Functions** para envío de emails
- **Índices** en campos de búsqueda frecuente
