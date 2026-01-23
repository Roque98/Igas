-- ============================================================================
-- 05. TICKETS Y SOPORTE
-- ============================================================================
-- Descripción: Crea todas las tablas relacionadas con tickets de soporte
-- ============================================================================

-- Tabla Principal de Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id),
  categoria_id UUID REFERENCES categorias_servicio(id) NOT NULL,
  prioridad TEXT CHECK (prioridad IN ('Crítica', 'Alta', 'Media', 'Baja')) NOT NULL DEFAULT 'Media',
  canal TEXT CHECK (canal IN ('Teléfono', 'WhatsApp', 'Correo', 'Portal', 'Presencial')) NOT NULL,
  responsable_id UUID REFERENCES profiles(id),
  equipo_id UUID REFERENCES equipos(id),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  estatus_id UUID REFERENCES estatus_tickets(id) NOT NULL,

  -- Control de SLA
  sla_objetivo_minutos INTEGER NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_primera_respuesta TIMESTAMPTZ,
  fecha_resolucion TIMESTAMPTZ,
  fecha_cierre TIMESTAMPTZ,
  tiempo_pausado_minutos INTEGER DEFAULT 0,

  -- Auditoría
  creado_por UUID REFERENCES profiles(id) NOT NULL,
  cerrado_por UUID REFERENCES profiles(id),

  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas y performance
CREATE INDEX idx_tickets_folio ON tickets(folio);
CREATE INDEX idx_tickets_cliente ON tickets(cliente_id);
CREATE INDEX idx_tickets_responsable ON tickets(responsable_id);
CREATE INDEX idx_tickets_estatus ON tickets(estatus_id);
CREATE INDEX idx_tickets_prioridad ON tickets(prioridad);
CREATE INDEX idx_tickets_fecha_creacion ON tickets(fecha_creacion DESC);
CREATE INDEX idx_tickets_categoria ON tickets(categoria_id);

-- Participantes del Ticket
CREATE TABLE public.ticket_participantes (
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  rol_participacion TEXT CHECK (rol_participacion IN ('Responsable', 'Observador', 'Colaborador')) DEFAULT 'Observador',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ticket_id, usuario_id)
);

-- Adjuntos del Ticket
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

CREATE INDEX idx_ticket_adjuntos_ticket ON ticket_adjuntos(ticket_id);

-- Bitácora/Timeline del Ticket
CREATE TABLE public.ticket_bitacora (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  tipo TEXT CHECK (tipo IN ('nota', 'cambio_estatus', 'asignacion', 'adjunto', 'escalamiento', 'pausa', 'reanudacion')) NOT NULL,
  mensaje TEXT,
  datos_adicionales JSONB,
  es_publico BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_bitacora_ticket ON ticket_bitacora(ticket_id);
CREATE INDEX idx_ticket_bitacora_fecha ON ticket_bitacora(created_at DESC);

-- Historial de Asignaciones
CREATE TABLE public.ticket_historial_asignaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  de_usuario_id UUID REFERENCES profiles(id),
  a_usuario_id UUID REFERENCES profiles(id) NOT NULL,
  motivo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verificación
SELECT 'Tablas de tickets creadas' as info;
SELECT COUNT(*) as total_indices
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE 'ticket%';
