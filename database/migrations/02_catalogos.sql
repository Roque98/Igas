-- ============================================================================
-- 02. CATÁLOGOS BASE
-- ============================================================================
-- Descripción: Crea las tablas de catálogos y datos iniciales
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

-- Verificación
SELECT 'Roles creados:' as info, COUNT(*) as total FROM roles
UNION ALL
SELECT 'Categorías creadas:', COUNT(*) FROM categorias_servicio
UNION ALL
SELECT 'Estatus creados:', COUNT(*) FROM estatus_tickets
UNION ALL
SELECT 'Horarios creados:', COUNT(*) FROM horarios;
