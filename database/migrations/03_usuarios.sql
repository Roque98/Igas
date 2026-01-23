-- ============================================================================
-- 03. USUARIOS Y PERFILES
-- ============================================================================
-- Descripción: Crea tabla de perfiles que extiende auth.users de Supabase
-- ============================================================================

-- Tabla de Perfiles de Usuario
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

-- Verificación
SELECT 'Tabla profiles creada correctamente' as info;
SELECT * FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;
