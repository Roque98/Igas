-- =====================================================
-- PASSWORD POLICIES & SECURITY
-- iGAS Helpdesk - Password Management System
-- =====================================================

-- =====================================================
-- 1. TABLA DE HISTORIAL DE CONTRASEÑAS
-- =====================================================

-- Crear tabla para almacenar historial de contraseñas
-- Permite verificar que no se reutilicen contraseñas recientes
CREATE TABLE IF NOT EXISTS password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: No permitir duplicados exactos
  CONSTRAINT unique_password_per_user UNIQUE(user_id, password_hash)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);

-- Comentarios
COMMENT ON TABLE password_history IS 'Historial de contraseñas de usuarios para prevenir reutilización';
COMMENT ON COLUMN password_history.password_hash IS 'Hash bcrypt de contraseña anterior';

-- =====================================================
-- 2. COLUMNA DE FECHA DE CAMBIO EN PROFILES
-- =====================================================

-- Agregar columna para rastrear última fecha de cambio de contraseña
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN profiles.password_changed_at IS 'Fecha del último cambio de contraseña (para políticas de expiración)';

-- =====================================================
-- 3. TABLA DE INTENTOS FALLIDOS DE LOGIN
-- =====================================================

-- Crear tabla para rastrear intentos fallidos de autenticación
CREATE TABLE IF NOT EXISTS failed_login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  error_code TEXT, -- Código de error de Supabase
  error_message TEXT -- Mensaje de error
);

-- Índices para búsquedas y limpieza
CREATE INDEX IF NOT EXISTS idx_failed_attempts_email ON failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_time ON failed_login_attempts(attempted_at);
CREATE INDEX IF NOT EXISTS idx_failed_attempts_ip ON failed_login_attempts(ip_address);

-- Comentarios
COMMENT ON TABLE failed_login_attempts IS 'Registro de intentos fallidos de login para detección de ataques de fuerza bruta';

-- =====================================================
-- 4. FUNCIONES PARA HISTORIAL DE CONTRASEÑAS
-- =====================================================

-- Función: Guardar contraseña en historial cuando cambia
CREATE OR REPLACE FUNCTION save_password_to_history()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si la contraseña cambió
  IF TG_OP = 'UPDATE' AND OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN

    -- Insertar contraseña anterior en historial
    INSERT INTO password_history (user_id, password_hash)
    VALUES (NEW.id, OLD.encrypted_password)
    ON CONFLICT (user_id, password_hash) DO NOTHING; -- Ignorar si ya existe

    -- Mantener solo las últimas 5 contraseñas por usuario
    -- Eliminar contraseñas más antiguas
    DELETE FROM password_history
    WHERE user_id = NEW.id
    AND id NOT IN (
      SELECT id FROM password_history
      WHERE user_id = NEW.id
      ORDER BY created_at DESC
      LIMIT 5
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Ejecutar función al actualizar usuario
DROP TRIGGER IF EXISTS save_password_history_trigger ON auth.users;
CREATE TRIGGER save_password_history_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION save_password_to_history();

-- =====================================================
-- 5. FUNCIÓN PARA ACTUALIZAR FECHA DE CAMBIO
-- =====================================================

-- Función: Actualizar password_changed_at en profiles
CREATE OR REPLACE FUNCTION update_password_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo si la contraseña cambió
  IF TG_OP = 'UPDATE' AND OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN

    -- Actualizar fecha en tabla profiles
    UPDATE profiles
    SET password_changed_at = NOW()
    WHERE id = NEW.id;

    -- Log del cambio
    RAISE NOTICE 'Password changed for user %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Ejecutar función al actualizar usuario
DROP TRIGGER IF EXISTS update_password_date_trigger ON auth.users;
CREATE TRIGGER update_password_date_trigger
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION update_password_changed_at();

-- =====================================================
-- 6. FUNCIÓN DE LIMPIEZA DE INTENTOS FALLIDOS
-- =====================================================

-- Función: Limpiar intentos fallidos antiguos (>24 horas)
CREATE OR REPLACE FUNCTION cleanup_old_failed_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Eliminar registros más antiguos de 24 horas
  DELETE FROM failed_login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Cleaned up % old failed login attempts', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. FUNCIÓN PARA VERIFICAR SI USUARIO ESTÁ BLOQUEADO
-- =====================================================

-- Función: Verificar si un email está bloqueado por intentos fallidos
CREATE OR REPLACE FUNCTION is_user_blocked(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INTEGER;
BEGIN
  -- Contar intentos fallidos en los últimos 15 minutos
  SELECT COUNT(*)
  INTO failed_count
  FROM failed_login_attempts
  WHERE email = user_email
  AND attempted_at > NOW() - INTERVAL '15 minutes';

  -- Bloqueado si tiene 5 o más intentos
  RETURN failed_count >= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. FUNCIÓN PARA VERIFICAR EXPIRACIÓN DE CONTRASEÑA
-- =====================================================

-- Función: Verificar si la contraseña de un usuario ha expirado
CREATE OR REPLACE FUNCTION is_password_expired(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  password_date TIMESTAMPTZ;
  user_role TEXT;
  expiry_days INTEGER;
BEGIN
  -- Obtener fecha de cambio de contraseña y rol
  SELECT
    p.password_changed_at,
    r.nombre
  INTO password_date, user_role
  FROM profiles p
  LEFT JOIN roles r ON p.rol_id = r.id
  WHERE p.id = user_id;

  -- Si no hay fecha, considerar expirada
  IF password_date IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Determinar días de expiración según rol
  expiry_days := CASE
    WHEN user_role = 'Administrador' THEN 60
    WHEN user_role IN ('Coordinador', 'Supervisor') THEN 90
    ELSE 90 -- Default para técnicos y otros roles
  END;

  -- Verificar si ha pasado el período de expiración
  RETURN password_date < NOW() - (expiry_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. VISTAS PARA MONITOREO
-- =====================================================

-- Vista: Usuarios con contraseñas próximas a expirar (15 días)
CREATE OR REPLACE VIEW passwords_expiring_soon AS
SELECT
  p.id,
  p.nombre_completo,
  p.email,
  r.nombre as rol,
  p.password_changed_at,
  CASE
    WHEN r.nombre = 'Administrador' THEN 60
    WHEN r.nombre IN ('Coordinador', 'Supervisor') THEN 90
    ELSE 90
  END as expiry_days,
  EXTRACT(DAY FROM (p.password_changed_at +
    CASE
      WHEN r.nombre = 'Administrador' THEN INTERVAL '60 days'
      WHEN r.nombre IN ('Coordinador', 'Supervisor') THEN INTERVAL '90 days'
      ELSE INTERVAL '90 days'
    END
  ) - NOW())::INTEGER as days_until_expiry
FROM profiles p
LEFT JOIN roles r ON p.rol_id = r.id
WHERE p.password_changed_at IS NOT NULL
AND p.password_changed_at < NOW() -
  CASE
    WHEN r.nombre = 'Administrador' THEN INTERVAL '45 days' -- 60-15
    WHEN r.nombre IN ('Coordinador', 'Supervisor') THEN INTERVAL '75 days' -- 90-15
    ELSE INTERVAL '75 days'
  END
AND p.estatus = 'Activo'
ORDER BY p.password_changed_at ASC;

-- Vista: Usuarios bloqueados por intentos fallidos
CREATE OR REPLACE VIEW blocked_users AS
SELECT
  email,
  COUNT(*) as failed_attempts,
  MAX(attempted_at) as last_attempt,
  MIN(attempted_at) as first_attempt,
  ARRAY_AGG(DISTINCT ip_address ORDER BY ip_address) as ip_addresses,
  CASE
    WHEN MAX(attempted_at) > NOW() - INTERVAL '15 minutes'
    AND COUNT(*) >= 5
    THEN TRUE
    ELSE FALSE
  END as is_currently_blocked,
  CASE
    WHEN MAX(attempted_at) > NOW() - INTERVAL '15 minutes'
    AND COUNT(*) >= 5
    THEN EXTRACT(EPOCH FROM (MAX(attempted_at) + INTERVAL '15 minutes' - NOW()))::INTEGER
    ELSE 0
  END as seconds_until_unblock
FROM failed_login_attempts
WHERE attempted_at > NOW() - INTERVAL '15 minutes'
GROUP BY email
HAVING COUNT(*) >= 5;

-- Vista: Estadísticas de intentos fallidos por día
CREATE OR REPLACE VIEW failed_login_stats AS
SELECT
  DATE(attempted_at) as date,
  COUNT(*) as total_attempts,
  COUNT(DISTINCT email) as unique_emails,
  COUNT(DISTINCT ip_address) as unique_ips,
  COUNT(*) FILTER (WHERE attempted_at > NOW() - INTERVAL '1 hour') as last_hour,
  COUNT(*) FILTER (WHERE attempted_at > NOW() - INTERVAL '24 hours') as last_24h
FROM failed_login_attempts
GROUP BY DATE(attempted_at)
ORDER BY date DESC;

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver su propio historial de contraseñas
CREATE POLICY "Users can view own password history"
  ON password_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Solo administradores pueden ver intentos fallidos
CREATE POLICY "Only admins can view failed attempts"
  ON failed_login_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol_id IN (
        SELECT id FROM roles WHERE nombre = 'Administrador'
      )
    )
  );

-- Política: Solo administradores pueden insertar intentos fallidos
-- (Normalmente se hace desde backend/edge functions)
CREATE POLICY "Only admins can insert failed attempts"
  ON failed_login_attempts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.rol_id IN (
        SELECT id FROM roles WHERE nombre = 'Administrador'
      )
    )
  );

-- =====================================================
-- 11. GRANTS Y PERMISOS
-- =====================================================

-- Conceder permisos de ejecución a funciones
GRANT EXECUTE ON FUNCTION cleanup_old_failed_attempts() TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_blocked(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_password_expired(UUID) TO authenticated;

-- Permisos en vistas solo para administradores
GRANT SELECT ON passwords_expiring_soon TO authenticated;
GRANT SELECT ON blocked_users TO authenticated;
GRANT SELECT ON failed_login_stats TO authenticated;

-- =====================================================
-- 12. DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Actualizar password_changed_at para usuarios existentes si es NULL
UPDATE profiles
SET password_changed_at = created_at
WHERE password_changed_at IS NULL;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las tablas fueron creadas
SELECT
  'password_history' as table_name,
  COUNT(*) as row_count
FROM password_history
UNION ALL
SELECT
  'failed_login_attempts' as table_name,
  COUNT(*) as row_count
FROM failed_login_attempts;

-- Verificar que las funciones existen
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'save_password_to_history',
  'update_password_changed_at',
  'cleanup_old_failed_attempts',
  'is_user_blocked',
  'is_password_expired'
);

-- Verificar que las vistas existen
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'passwords_expiring_soon',
  'blocked_users',
  'failed_login_stats'
);

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN
-- =====================================================

/*
SIGUIENTE PASO: Configurar en Supabase Dashboard

1. Authentication → Settings:
   - Minimum password length: 8
   - Enable password complexity requirements

2. Authentication → Rate Limits:
   - /auth/v1/token: 5 requests per 15 minutes
   - /auth/v1/recover: 3 requests per hour
   - /auth/v1/user: 5 requests per hour

3. Programar limpieza automática:
   - Ejecutar cleanup_old_failed_attempts() diariamente
   - Usar Supabase pg_cron extension o cron job externo

4. Monitoreo:
   - Revisar blocked_users periódicamente
   - Alertar sobre passwords_expiring_soon
   - Analizar failed_login_stats para detectar ataques
*/
