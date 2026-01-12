-- ============================================================================
-- 04. CLIENTES Y SUCURSALES
-- ============================================================================
-- Descripción: Crea tablas para gestionar clientes y sus sucursales
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

-- Verificación
SELECT 'Tablas de clientes creadas' as info;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('clientes', 'sucursales')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
