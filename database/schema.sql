-- ============================================================================
-- iGAS Helpdesk - Schema de Base de Datos
-- ============================================================================
-- Version: 1.0.0
-- Fecha: 2026-01-11
-- Descripción: Schema completo para sistema de Mesa de Ayuda iGAS
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CATÁLOGOS BASE
-- ============================================================================

-- Tabla de Roles
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL CHECK (nombre IN ('Administrador', 'Supervisor', 'Agente', 'Cliente')),
  descripcion TEXT,
  permisos JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar roles por defecto
INSERT INTO public.roles (nombre, descripcion, permisos) VALUES
('Administrador', 'Acceso completo al sistema', '{"*": true}'),
('Supervisor', 'Supervisión de equipos y tickets', '{"tickets": {"read": true, "write": true}, "users": {"read": true}}'),
('Agente', 'Atención de tickets asignados', '{"tickets": {"read": true, "write": true}}'),
('Cliente', 'Acceso limitado para consulta', '{"tickets": {"read": true}}');

-- Tabla de Equipos
CREATE TABLE public.equipos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  supervisor_id UUID,
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Horarios/Turnos
CREATE TABLE public.horarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  dias_semana TEXT[] DEFAULT ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar horarios por defecto
INSERT INTO public.horarios (nombre, hora_inicio, hora_fin) VALUES
('Matutino', '08:00', '16:00'),
('Vespertino', '16:00', '00:00'),
('24/7', '00:00', '23:59');

-- Categorías de Servicio
CREATE TABLE public.categorias_servicio (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  sla_minutos INTEGER NOT NULL DEFAULT 240,
  color TEXT DEFAULT '#6c757d',
  icono TEXT,
  parent_id UUID REFERENCES categorias_servicio(id),
  orden INTEGER DEFAULT 0,
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar categorías por defecto
INSERT INTO public.categorias_servicio (nombre, descripcion, sla_minutos, color) VALUES
('Soporte Técnico', 'Problemas técnicos generales', 240, '#007bff'),
('Facturación', 'Consultas sobre facturas', 120, '#28a745'),
('Instalación', 'Solicitudes de instalación', 480, '#ffc107'),
('Mantenimiento', 'Mantenimiento preventivo/correctivo', 360, '#6c757d'),
('Consulta General', 'Consultas generales', 60, '#17a2b8');

-- Estatus de Tickets
CREATE TABLE public.estatus_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL CHECK (nombre IN ('Nuevo', 'Abierto', 'En Progreso', 'Pausado', 'Resuelto', 'Cerrado', 'Cancelado')),
  descripcion TEXT,
  color TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  es_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar estatus por defecto
INSERT INTO public.estatus_tickets (nombre, descripcion, color, orden, es_final) VALUES
('Nuevo', 'Ticket recién creado', '#17a2b8', 1, false),
('Abierto', 'Ticket asignado', '#007bff', 2, false),
('En Progreso', 'Ticket en atención', '#ffc107', 3, false),
('Pausado', 'Ticket pausado temporalmente', '#6c757d', 4, false),
('Resuelto', 'Ticket resuelto', '#28a745', 5, false),
('Cerrado', 'Ticket cerrado', '#343a40', 6, true),
('Cancelado', 'Ticket cancelado', '#dc3545', 7, true);

-- ============================================================================
-- 2. USUARIOS Y AUTENTICACIÓN
-- ============================================================================

-- Tabla de Perfiles de Usuario (extendiendo auth.users de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  rol_id UUID REFERENCES roles(id) NOT NULL,
  area_equipo_id UUID REFERENCES equipos(id),
  telefono TEXT,
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  turno_horario_id UUID REFERENCES horarios(id),
  avatar_url TEXT,
  disponibilidad TEXT CHECK (disponibilidad IN ('En línea', 'Ocupado', 'Fuera de turno')) DEFAULT 'En línea',
  configuracion JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_profiles_rol ON profiles(rol_id);
CREATE INDEX idx_profiles_equipo ON profiles(area_equipo_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================================
-- 3. CLIENTES Y SUCURSALES
-- ============================================================================

-- Tabla de Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razon_social TEXT NOT NULL,
  nombre_comercial TEXT,
  rfc TEXT UNIQUE NOT NULL,
  telefono TEXT,
  email TEXT,
  contacto_principal TEXT,
  tipo_servicio TEXT CHECK (tipo_servicio IN ('Control Volumétrico', 'Venta de Equipos', 'Mantenimiento', 'Otro')),
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo', 'Suspendido')) DEFAULT 'Activo',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clientes_rfc ON clientes(rfc);
CREATE INDEX idx_clientes_estatus ON clientes(estatus);

-- Tabla de Sucursales
CREATE TABLE public.sucursales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  nombre TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT,
  estado TEXT,
  codigo_postal TEXT,
  telefono TEXT,
  email TEXT,
  contacto_local TEXT,
  coordenadas POINT,
  estatus TEXT CHECK (estatus IN ('Activa', 'Inactiva')) DEFAULT 'Activa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_sucursales_cliente ON sucursales(cliente_id);

-- ============================================================================
-- 4. TICKETS Y SOPORTE
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

-- ============================================================================
-- 5. FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, email, rol_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', 'Usuario'),
    NEW.email,
    (SELECT id FROM public.roles WHERE nombre = 'Agente' LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear profile automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at a todas las tablas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sucursales_updated_at BEFORE UPDATE ON public.sucursales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar folio de ticket
CREATE OR REPLACE FUNCTION public.generar_folio_ticket()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_folio TEXT;
  contador INTEGER;
BEGIN
  -- Obtener el contador del día actual
  SELECT COUNT(*) + 1 INTO contador
  FROM public.tickets
  WHERE DATE(fecha_creacion) = CURRENT_DATE;

  -- Generar folio: IGAS-YYYYMMDD-XXXX
  nuevo_folio := 'IGAS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(contador::TEXT, 4, '0');

  NEW.folio := nuevo_folio;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar folio automáticamente
CREATE TRIGGER generate_ticket_folio
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.folio IS NULL)
  EXECUTE FUNCTION public.generar_folio_ticket();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Habilitar RLS en tablas de catálogo
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estatus_tickets ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tablas principales
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tablas de tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_bitacora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_historial_asignaciones ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins pueden ver y gestionar todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Policies para tickets (básicas, se refinan en siguiente fase)
CREATE POLICY "Users can view tickets assigned to them"
  ON public.tickets FOR SELECT
  USING (
    responsable_id = auth.uid()
    OR creado_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = tickets.id AND usuario_id = auth.uid()
    )
  );

-- Admins pueden ver todos los tickets
CREATE POLICY "Admins can view all tickets"
  ON public.tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- ============================================================================
-- Policies para CATÁLOGOS (solo lectura para todos, admins pueden todo)
-- ============================================================================

-- Roles
CREATE POLICY "Authenticated users can view roles"
  ON public.roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Equipos
CREATE POLICY "Authenticated users can view equipos"
  ON public.equipos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage equipos"
  ON public.equipos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Horarios
CREATE POLICY "Authenticated users can view horarios"
  ON public.horarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage horarios"
  ON public.horarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Categorías de Servicio
CREATE POLICY "Authenticated users can view categorias_servicio"
  ON public.categorias_servicio FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categorias_servicio"
  ON public.categorias_servicio FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Estatus de Tickets
CREATE POLICY "Authenticated users can view estatus_tickets"
  ON public.estatus_tickets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage estatus_tickets"
  ON public.estatus_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- ============================================================================
-- Policies para CLIENTES Y SUCURSALES
-- ============================================================================

-- Clientes - Todos los usuarios autenticados pueden ver
CREATE POLICY "Authenticated users can view clientes"
  ON public.clientes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins y supervisores pueden modificar clientes
CREATE POLICY "Admins and supervisors can manage clientes"
  ON public.clientes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (
        SELECT id FROM public.roles
        WHERE nombre IN ('Administrador', 'Supervisor')
      )
    )
  );

-- Sucursales - Todos los usuarios autenticados pueden ver
CREATE POLICY "Authenticated users can view sucursales"
  ON public.sucursales FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins y supervisores pueden modificar sucursales
CREATE POLICY "Admins and supervisors can manage sucursales"
  ON public.sucursales FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (
        SELECT id FROM public.roles
        WHERE nombre IN ('Administrador', 'Supervisor')
      )
    )
  );

-- ============================================================================
-- Policies para TABLAS RELACIONADAS CON TICKETS
-- ============================================================================

-- Ticket Participantes
CREATE POLICY "Users can view ticket_participantes for their tickets"
  ON public.ticket_participantes FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_participantes.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Ticket Adjuntos
CREATE POLICY "Users can view ticket_adjuntos for their tickets"
  ON public.ticket_adjuntos FOR SELECT
  USING (
    subido_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_adjuntos.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_adjuntos.ticket_id AND usuario_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

CREATE POLICY "Users can upload ticket_adjuntos for their tickets"
  ON public.ticket_adjuntos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_adjuntos.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_adjuntos.ticket_id AND usuario_id = auth.uid()
    )
  );

-- Ticket Bitácora
CREATE POLICY "Users can view ticket_bitacora for their tickets"
  ON public.ticket_bitacora FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_bitacora.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_bitacora.ticket_id AND usuario_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

CREATE POLICY "Users can add ticket_bitacora entries for their tickets"
  ON public.ticket_bitacora FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_bitacora.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_bitacora.ticket_id AND usuario_id = auth.uid()
    )
  );

-- Ticket Historial de Asignaciones
CREATE POLICY "Users can view ticket_historial_asignaciones for their tickets"
  ON public.ticket_historial_asignaciones FOR SELECT
  USING (
    de_usuario_id = auth.uid()
    OR a_usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_historial_asignaciones.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre IN ('Administrador', 'Supervisor'))
    )
  );

-- ============================================================================
-- 7. VISTAS ÚTILES
-- ============================================================================

-- Vista para tickets con información completa
CREATE OR REPLACE VIEW public.tickets_completos AS
SELECT
  t.*,
  c.razon_social as cliente_nombre,
  c.rfc as cliente_rfc,
  s.nombre as sucursal_nombre,
  cat.nombre as categoria_nombre,
  cat.color as categoria_color,
  est.nombre as estatus_nombre,
  est.color as estatus_color,
  resp.nombre_completo as responsable_nombre,
  resp.email as responsable_email,
  creador.nombre_completo as creador_nombre,
  -- Cálculo de tiempo transcurrido en minutos
  EXTRACT(EPOCH FROM (COALESCE(t.fecha_cierre, NOW()) - t.fecha_creacion)) / 60 as tiempo_total_minutos,
  -- Porcentaje de SLA usado
  ((EXTRACT(EPOCH FROM (COALESCE(t.fecha_cierre, NOW()) - t.fecha_creacion)) / 60) / t.sla_objetivo_minutos * 100) as porcentaje_sla
FROM public.tickets t
LEFT JOIN public.clientes c ON t.cliente_id = c.id
LEFT JOIN public.sucursales s ON t.sucursal_id = s.id
LEFT JOIN public.categorias_servicio cat ON t.categoria_id = cat.id
LEFT JOIN public.estatus_tickets est ON t.estatus_id = est.id
LEFT JOIN public.profiles resp ON t.responsable_id = resp.id
LEFT JOIN public.profiles creador ON t.creado_por = creador.id;

-- Habilitar RLS en la vista
ALTER VIEW public.tickets_completos SET (security_invoker = true);

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
