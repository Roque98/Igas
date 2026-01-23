-- ============================================================================
-- 13. SISTEMA DE AUDITORÍA
-- ============================================================================
-- Descripción: Sistema completo de auditoría para rastrear cambios en datos
-- y sesiones de usuarios.
-- ============================================================================

-- ============================================================================
-- PASO 1: Tabla de Log de Auditoría
-- ============================================================================
-- Registra todos los cambios (INSERT, UPDATE, DELETE) en tablas importantes

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id UUID,
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_audit_log_tabla ON public.audit_log(tabla);
CREATE INDEX IF NOT EXISTS idx_audit_log_accion ON public.audit_log(accion);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON public.audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro_id ON public.audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Comentarios
COMMENT ON TABLE public.audit_log IS 'Registro de auditoría de cambios en tablas del sistema';
COMMENT ON COLUMN public.audit_log.tabla IS 'Nombre de la tabla afectada';
COMMENT ON COLUMN public.audit_log.accion IS 'Tipo de operación: INSERT, UPDATE, DELETE';
COMMENT ON COLUMN public.audit_log.registro_id IS 'ID del registro afectado';
COMMENT ON COLUMN public.audit_log.usuario_id IS 'Usuario que realizó la acción';
COMMENT ON COLUMN public.audit_log.datos_anteriores IS 'Datos antes del cambio (UPDATE/DELETE)';
COMMENT ON COLUMN public.audit_log.datos_nuevos IS 'Datos después del cambio (INSERT/UPDATE)';

-- ============================================================================
-- PASO 2: Tabla de Log de Sesiones
-- ============================================================================
-- Registra eventos de sesión: login, logout, intentos fallidos

CREATE TABLE IF NOT EXISTS public.sesiones_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT, -- Guardar email para intentos fallidos donde no hay usuario_id
  accion TEXT NOT NULL CHECK (accion IN ('login', 'logout', 'login_failed', 'token_refresh', 'password_reset')),
  ip_address TEXT,
  user_agent TEXT,
  detalles JSONB, -- Información adicional (razón de fallo, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_sesiones_log_usuario_id ON public.sesiones_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_log_accion ON public.sesiones_log(accion);
CREATE INDEX IF NOT EXISTS idx_sesiones_log_created_at ON public.sesiones_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sesiones_log_email ON public.sesiones_log(email);

-- Comentarios
COMMENT ON TABLE public.sesiones_log IS 'Registro de eventos de sesión de usuarios';
COMMENT ON COLUMN public.sesiones_log.accion IS 'Tipo de evento: login, logout, login_failed, token_refresh, password_reset';
COMMENT ON COLUMN public.sesiones_log.detalles IS 'Información adicional del evento en formato JSON';

-- ============================================================================
-- PASO 3: Función de Trigger de Auditoría
-- ============================================================================
-- Función genérica que captura cambios en cualquier tabla

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  -- Obtener el usuario actual (puede ser NULL si es una operación del sistema)
  v_usuario_id := auth.uid();

  IF (TG_OP = 'DELETE') THEN
    v_old_data := to_jsonb(OLD);
    -- Remover campos sensibles
    v_old_data := v_old_data - 'password_hash';

    INSERT INTO public.audit_log (tabla, accion, registro_id, usuario_id, datos_anteriores)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, v_usuario_id, v_old_data);
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    -- Remover campos sensibles
    v_old_data := v_old_data - 'password_hash';
    v_new_data := v_new_data - 'password_hash';

    -- Solo registrar si hay cambios reales (ignorar updated_at)
    IF (v_old_data - 'updated_at') IS DISTINCT FROM (v_new_data - 'updated_at') THEN
      INSERT INTO public.audit_log (tabla, accion, registro_id, usuario_id, datos_anteriores, datos_nuevos)
      VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, v_usuario_id, v_old_data, v_new_data);
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'INSERT') THEN
    v_new_data := to_jsonb(NEW);
    -- Remover campos sensibles
    v_new_data := v_new_data - 'password_hash';

    INSERT INTO public.audit_log (tabla, accion, registro_id, usuario_id, datos_nuevos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, v_usuario_id, v_new_data);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================================
-- PASO 4: Función para registrar eventos de sesión
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_session_event(
  p_usuario_id UUID,
  p_email TEXT,
  p_accion TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_detalles JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.sesiones_log (usuario_id, email, accion, ip_address, user_agent, detalles)
  VALUES (p_usuario_id, p_email, p_accion, p_ip_address, p_user_agent, p_detalles)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================================
-- PASO 5: Aplicar Triggers a Tablas Importantes
-- ============================================================================

-- Profiles (usuarios)
DROP TRIGGER IF EXISTS profiles_audit_trigger ON public.profiles;
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Roles
DROP TRIGGER IF EXISTS roles_audit_trigger ON public.roles;
CREATE TRIGGER roles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Equipos
DROP TRIGGER IF EXISTS equipos_audit_trigger ON public.equipos;
CREATE TRIGGER equipos_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.equipos
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Horarios
DROP TRIGGER IF EXISTS horarios_audit_trigger ON public.horarios;
CREATE TRIGGER horarios_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.horarios
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- ============================================================================
-- PASO 6: Políticas RLS para audit_log y sesiones_log
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones_log ENABLE ROW LEVEL SECURITY;

-- audit_log: Solo admins pueden ver
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT USING (public.is_admin());

-- audit_log: El sistema puede insertar (via triggers)
DROP POLICY IF EXISTS "audit_log_insert_system" ON public.audit_log;
CREATE POLICY "audit_log_insert_system" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- sesiones_log: Admins pueden ver todo
DROP POLICY IF EXISTS "sesiones_log_select_admin" ON public.sesiones_log;
CREATE POLICY "sesiones_log_select_admin" ON public.sesiones_log
  FOR SELECT USING (public.is_admin());

-- sesiones_log: Usuarios pueden ver su propio historial
DROP POLICY IF EXISTS "sesiones_log_select_own" ON public.sesiones_log;
CREATE POLICY "sesiones_log_select_own" ON public.sesiones_log
  FOR SELECT USING (usuario_id = auth.uid());

-- sesiones_log: El sistema puede insertar
DROP POLICY IF EXISTS "sesiones_log_insert_system" ON public.sesiones_log;
CREATE POLICY "sesiones_log_insert_system" ON public.sesiones_log
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PASO 7: Vista para facilitar consultas de auditoría
-- ============================================================================

CREATE OR REPLACE VIEW public.v_audit_log_detail AS
SELECT
  al.id,
  al.tabla,
  al.accion,
  al.registro_id,
  al.usuario_id,
  p.nombre_completo AS usuario_nombre,
  p.email AS usuario_email,
  al.datos_anteriores,
  al.datos_nuevos,
  al.ip_address,
  al.user_agent,
  al.created_at
FROM public.audit_log al
LEFT JOIN public.profiles p ON al.usuario_id = p.id
ORDER BY al.created_at DESC;

-- Vista para historial de sesiones
CREATE OR REPLACE VIEW public.v_sesiones_log_detail AS
SELECT
  sl.id,
  sl.usuario_id,
  COALESCE(p.nombre_completo, sl.email) AS usuario_nombre,
  COALESCE(p.email, sl.email) AS email,
  sl.accion,
  sl.ip_address,
  sl.user_agent,
  sl.detalles,
  sl.created_at
FROM public.sesiones_log sl
LEFT JOIN public.profiles p ON sl.usuario_id = p.id
ORDER BY sl.created_at DESC;

-- ============================================================================
-- PASO 8: Función para limpiar logs antiguos (opcional, ejecutar periódicamente)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_logs(
  p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE (
  audit_deleted INTEGER,
  sesiones_deleted INTEGER
) AS $$
DECLARE
  v_audit_deleted INTEGER;
  v_sesiones_deleted INTEGER;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;

  -- Limpiar audit_log
  DELETE FROM public.audit_log WHERE created_at < v_cutoff_date;
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  -- Limpiar sesiones_log
  DELETE FROM public.sesiones_log WHERE created_at < v_cutoff_date;
  GET DIAGNOSTICS v_sesiones_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_audit_deleted, v_sesiones_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- ============================================================================
-- Verificación
-- ============================================================================
SELECT
  'audit_log' as tabla,
  COUNT(*) as registros
FROM public.audit_log
UNION ALL
SELECT
  'sesiones_log' as tabla,
  COUNT(*) as registros
FROM public.sesiones_log;
