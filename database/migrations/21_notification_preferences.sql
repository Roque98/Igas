-- ============================================================================
-- MIGRACIÓN: Sistema de Notificaciones Avanzado
-- ============================================================================
-- Agrega tipos de notificación, preferencias por usuario y funciones auxiliares
-- ============================================================================

-- ============================================================================
-- 1. CATÁLOGO DE TIPOS DE NOTIFICACIÓN
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tipos_notificacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT NOT NULL CHECK (categoria IN ('tickets', 'casos', 'clientes', 'sistema', 'mantenimientos', 'instalaciones')),
  enviar_push BOOLEAN DEFAULT true,
  enviar_email BOOLEAN DEFAULT false,
  template_email TEXT,
  icono TEXT,
  color TEXT,
  prioridad TEXT DEFAULT 'media' CHECK (prioridad IN ('alta', 'media', 'baja')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar tipos de notificación predefinidos
INSERT INTO tipos_notificacion (codigo, nombre, descripcion, categoria, enviar_push, enviar_email, icono, color, prioridad) VALUES
  -- Tickets
  ('ticket_asignado', 'Ticket asignado', 'Se te ha asignado un nuevo ticket', 'tickets', true, false, 'user-check', '#04a9f5', 'media'),
  ('ticket_reasignado', 'Ticket reasignado', 'Un ticket ha sido reasignado', 'tickets', true, false, 'swap-horizontal', '#f4c22b', 'media'),
  ('ticket_nuevo', 'Nuevo ticket', 'Se ha creado un nuevo ticket en tu área', 'tickets', true, false, 'plus-circle', '#1de9b6', 'baja'),
  ('ticket_comentario', 'Nuevo comentario', 'Se ha agregado un comentario a un ticket', 'tickets', true, false, 'message-square', '#a389d4', 'baja'),
  ('ticket_cambio_estatus', 'Cambio de estatus', 'Un ticket ha cambiado de estatus', 'tickets', true, false, 'refresh-cw', '#3ebfea', 'baja'),
  ('ticket_sla_amarillo', 'SLA en amarillo', 'Un ticket está por vencer su SLA', 'tickets', true, true, 'alert-triangle', '#FFC107', 'media'),
  ('ticket_sla_rojo', 'SLA en rojo', 'Un ticket ha excedido su SLA', 'tickets', true, true, 'alert-circle', '#F44336', 'alta'),

  -- Casos
  ('caso_asignado', 'Caso asignado', 'Se te ha asignado un nuevo caso', 'casos', true, true, 'briefcase', '#04a9f5', 'alta'),
  ('caso_listo_validar', 'Caso listo para validar', 'Un caso está listo para tu validación', 'casos', true, true, 'check-circle', '#00A651', 'alta'),
  ('caso_regresado', 'Caso regresado', 'Un caso ha sido regresado a soporte', 'casos', true, true, 'corner-up-left', '#f44236', 'alta'),
  ('caso_cerrado', 'Caso cerrado', 'Un caso ha sido cerrado', 'casos', true, false, 'x-circle', '#6c757d', 'baja'),

  -- Clientes
  ('licencia_por_vencer', 'Licencia por vencer', 'Una licencia está próxima a vencer', 'clientes', true, true, 'key', '#f4c22b', 'alta'),
  ('licencia_vencida', 'Licencia vencida', 'Una licencia ha vencido', 'clientes', true, true, 'key', '#f44236', 'alta'),
  ('poliza_por_vencer', 'Póliza por vencer', 'Una póliza está próxima a vencer', 'clientes', true, true, 'shield', '#f4c22b', 'alta'),
  ('poliza_vencida', 'Póliza vencida', 'Una póliza ha vencido', 'clientes', true, true, 'shield-off', '#f44236', 'alta'),

  -- Mantenimientos
  ('mantenimiento_programado', 'Mantenimiento programado', 'Tienes un mantenimiento programado', 'mantenimientos', true, false, 'tool', '#04a9f5', 'media'),
  ('mantenimiento_recordatorio', 'Recordatorio de mantenimiento', 'Recordatorio de mantenimiento pendiente', 'mantenimientos', true, false, 'clock', '#f4c22b', 'media'),

  -- Instalaciones
  ('instalacion_programada', 'Instalación programada', 'Tienes una instalación programada', 'instalaciones', true, false, 'download-cloud', '#1de9b6', 'media'),
  ('instalacion_pendiente', 'Pendiente de instalación', 'Hay un pendiente en una instalación', 'instalaciones', true, false, 'alert-circle', '#FFC107', 'media'),

  -- Sistema
  ('sistema_info', 'Información del sistema', 'Mensaje informativo del sistema', 'sistema', true, false, 'info', '#3ebfea', 'baja'),
  ('sistema_alerta', 'Alerta del sistema', 'Alerta importante del sistema', 'sistema', true, true, 'alert-triangle', '#f44236', 'alta')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 2. PREFERENCIAS DE NOTIFICACIONES POR USUARIO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.usuario_preferencias_notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo_codigo TEXT NOT NULL REFERENCES tipos_notificacion(codigo) ON DELETE CASCADE,
  recibir_push BOOLEAN DEFAULT true,
  recibir_email BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, tipo_codigo)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pref_notif_usuario ON usuario_preferencias_notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pref_notif_tipo ON usuario_preferencias_notificaciones(tipo_codigo);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_preferencias_notificaciones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_preferencias_notificaciones_updated ON usuario_preferencias_notificaciones;
CREATE TRIGGER trg_preferencias_notificaciones_updated
  BEFORE UPDATE ON usuario_preferencias_notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION update_preferencias_notificaciones_updated_at();

-- ============================================================================
-- 3. EXTENDER TABLA DE NOTIFICACIONES
-- ============================================================================

-- Agregar columnas adicionales si no existen
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS prioridad TEXT CHECK (prioridad IN ('alta', 'media', 'baja')) DEFAULT 'media';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS url_accion TEXT;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS icono TEXT;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS enviado_email BOOLEAN DEFAULT false;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS fecha_email TIMESTAMPTZ;

-- Índices adicionales para notificaciones
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario_leida ON notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificaciones_tipo ON notificaciones(tipo);

-- ============================================================================
-- 4. FUNCIONES AUXILIARES
-- ============================================================================

-- Función para obtener preferencias de usuario (con defaults si no existen)
CREATE OR REPLACE FUNCTION get_preferencias_notificaciones(p_usuario_id UUID)
RETURNS TABLE (
  tipo_codigo TEXT,
  tipo_nombre TEXT,
  tipo_descripcion TEXT,
  categoria TEXT,
  icono TEXT,
  color TEXT,
  recibir_push BOOLEAN,
  recibir_email BOOLEAN,
  default_push BOOLEAN,
  default_email BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.codigo,
    t.nombre,
    t.descripcion,
    t.categoria,
    t.icono,
    t.color,
    COALESCE(p.recibir_push, t.enviar_push),
    COALESCE(p.recibir_email, t.enviar_email),
    t.enviar_push,
    t.enviar_email
  FROM tipos_notificacion t
  LEFT JOIN usuario_preferencias_notificaciones p
    ON p.tipo_codigo = t.codigo AND p.usuario_id = p_usuario_id
  WHERE t.activo = true
  ORDER BY t.categoria, t.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar preferencia de usuario
CREATE OR REPLACE FUNCTION set_preferencia_notificacion(
  p_usuario_id UUID,
  p_tipo_codigo TEXT,
  p_recibir_push BOOLEAN,
  p_recibir_email BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO usuario_preferencias_notificaciones (usuario_id, tipo_codigo, recibir_push, recibir_email)
  VALUES (p_usuario_id, p_tipo_codigo, p_recibir_push, p_recibir_email)
  ON CONFLICT (usuario_id, tipo_codigo)
  DO UPDATE SET
    recibir_push = EXCLUDED.recibir_push,
    recibir_email = EXCLUDED.recibir_email,
    updated_at = NOW();

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función mejorada para crear notificaciones respetando preferencias
CREATE OR REPLACE FUNCTION crear_notificacion(
  p_usuario_id UUID,
  p_tipo_codigo TEXT,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_datos JSONB DEFAULT NULL,
  p_url_accion TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_tipo RECORD;
  v_notif_id UUID;
  v_preferencia RECORD;
  v_recibir_push BOOLEAN;
  v_recibir_email BOOLEAN;
BEGIN
  -- Obtener tipo de notificación
  SELECT * INTO v_tipo FROM tipos_notificacion WHERE codigo = p_tipo_codigo AND activo = true;
  IF NOT FOUND THEN
    -- Si no existe el tipo, crear con defaults
    v_recibir_push := true;
    v_recibir_email := false;
  ELSE
    -- Verificar preferencias del usuario
    SELECT * INTO v_preferencia
    FROM usuario_preferencias_notificaciones
    WHERE usuario_id = p_usuario_id AND tipo_codigo = p_tipo_codigo;

    -- Si no existe preferencia, usar defaults del tipo
    IF NOT FOUND THEN
      v_recibir_push := v_tipo.enviar_push;
      v_recibir_email := v_tipo.enviar_email;
    ELSE
      v_recibir_push := v_preferencia.recibir_push;
      v_recibir_email := v_preferencia.recibir_email;
    END IF;
  END IF;

  -- Solo crear si el usuario quiere recibirla
  IF v_recibir_push THEN
    INSERT INTO notificaciones (
      usuario_id,
      tipo,
      titulo,
      mensaje,
      datos,
      url_accion,
      icono,
      color,
      prioridad,
      enviado_email
    ) VALUES (
      p_usuario_id,
      p_tipo_codigo,
      p_titulo,
      p_mensaje,
      p_datos,
      p_url_accion,
      COALESCE(v_tipo.icono, 'bell'),
      COALESCE(v_tipo.color, '#6c757d'),
      COALESCE(v_tipo.prioridad, 'media'),
      false
    ) RETURNING id INTO v_notif_id;

    RETURN v_notif_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. POLÍTICAS RLS
-- ============================================================================

-- RLS para tipos_notificacion (lectura pública para usuarios autenticados)
ALTER TABLE tipos_notificacion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden leer tipos de notificación" ON tipos_notificacion;
CREATE POLICY "Usuarios pueden leer tipos de notificación"
  ON tipos_notificacion FOR SELECT
  TO authenticated
  USING (activo = true);

-- RLS para preferencias de notificaciones (solo el usuario puede ver/modificar las suyas)
ALTER TABLE usuario_preferencias_notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario puede ver sus preferencias" ON usuario_preferencias_notificaciones;
CREATE POLICY "Usuario puede ver sus preferencias"
  ON usuario_preferencias_notificaciones FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuario puede insertar sus preferencias" ON usuario_preferencias_notificaciones;
CREATE POLICY "Usuario puede insertar sus preferencias"
  ON usuario_preferencias_notificaciones FOR INSERT
  TO authenticated
  WITH CHECK (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Usuario puede actualizar sus preferencias" ON usuario_preferencias_notificaciones;
CREATE POLICY "Usuario puede actualizar sus preferencias"
  ON usuario_preferencias_notificaciones FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- ============================================================================
-- 6. TABLA DE RECORDATORIOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recordatorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN ('ticket_sin_respuesta', 'ticket_seguimiento', 'caso_sin_movimiento', 'mantenimiento_proximo', 'instalacion_proxima')),
  referencia_tipo TEXT NOT NULL CHECK (referencia_tipo IN ('ticket', 'caso', 'mantenimiento', 'instalacion')),
  referencia_id UUID NOT NULL,
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  tiempo_sin_movimiento_horas INTEGER,
  notificacion_enviada BOOLEAN DEFAULT false,
  notificacion_id UUID REFERENCES notificaciones(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recordatorios_usuario ON recordatorios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_referencia ON recordatorios(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_enviado ON recordatorios(notificacion_enviada);

-- RLS para recordatorios
ALTER TABLE recordatorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario puede ver sus recordatorios" ON recordatorios;
CREATE POLICY "Usuario puede ver sus recordatorios"
  ON recordatorios FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

-- ============================================================================
-- 7. COMENTARIOS
-- ============================================================================

COMMENT ON TABLE tipos_notificacion IS 'Catálogo de tipos de notificaciones del sistema';
COMMENT ON TABLE usuario_preferencias_notificaciones IS 'Preferencias de notificaciones por usuario';
COMMENT ON TABLE recordatorios IS 'Recordatorios automáticos generados por el sistema';
COMMENT ON FUNCTION crear_notificacion IS 'Crea una notificación respetando las preferencias del usuario';
COMMENT ON FUNCTION get_preferencias_notificaciones IS 'Obtiene las preferencias de notificaciones de un usuario con defaults';
COMMENT ON FUNCTION set_preferencia_notificacion IS 'Actualiza una preferencia de notificación de un usuario';
