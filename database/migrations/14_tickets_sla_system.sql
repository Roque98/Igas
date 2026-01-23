-- ============================================================================
-- 14. SISTEMA DE TICKETS - SLA, FOLIOS Y NOTIFICACIONES
-- ============================================================================
-- Fase 2, Punto 1: Completar modelo de datos de Tickets
-- Incluye: SLA, Semáforos, Folios automáticos, RLS, Notificaciones
-- ============================================================================

-- ============================================================================
-- 1. ACTUALIZAR TABLAS EXISTENTES
-- ============================================================================

-- Agregar campo pausa_sla a estatus_tickets si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'estatus_tickets' AND column_name = 'pausa_sla'
  ) THEN
    ALTER TABLE estatus_tickets ADD COLUMN pausa_sla BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Eliminar el CHECK constraint existente para poder agregar nuevos estatus
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Buscar el nombre del constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'estatus_tickets'::regclass
    AND contype = 'c'
    AND conname LIKE '%nombre%';

  -- Si existe, eliminarlo
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE estatus_tickets DROP CONSTRAINT ' || constraint_name;
  END IF;
END $$;

-- Actualizar estatus existente "Pausado" con pausa_sla = true
UPDATE estatus_tickets SET pausa_sla = true WHERE nombre = 'Pausado';

-- Agregar más estatus si no existen (ahora sin el CHECK constraint restrictivo)
INSERT INTO estatus_tickets (nombre, descripcion, color, orden, es_final, pausa_sla)
VALUES ('En espera de cliente', 'Esperando respuesta del cliente', '#f4c22b', 8, false, true)
ON CONFLICT (nombre) DO UPDATE SET pausa_sla = true, descripcion = EXCLUDED.descripcion;

INSERT INTO estatus_tickets (nombre, descripcion, color, orden, es_final, pausa_sla)
VALUES ('Escalado', 'Ticket escalado a caso', '#a389d4', 9, false, false)
ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion;

-- ============================================================================
-- 2. TABLA DE CANALES DE CONTACTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.canales_contacto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  icono TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar canales por defecto
INSERT INTO canales_contacto (nombre, icono) VALUES
  ('Teléfono', 'feather icon-phone'),
  ('WhatsApp', 'fab fa-whatsapp'),
  ('Correo', 'feather icon-mail'),
  ('Portal', 'feather icon-globe'),
  ('Presencial', 'feather icon-user')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- 3. CONFIGURACIÓN DE SLA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sla_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  prioridad TEXT CHECK (prioridad IN ('Crítica', 'Alta', 'Media', 'Baja')),
  categoria_id UUID REFERENCES categorias_servicio(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  tiempo_objetivo_minutos INTEGER NOT NULL,
  tiempo_primera_respuesta_minutos INTEGER,
  aplica_horario_habil BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SLA por defecto por prioridad
INSERT INTO sla_config (nombre, prioridad, tiempo_objetivo_minutos, tiempo_primera_respuesta_minutos) VALUES
  ('SLA Crítica', 'Crítica', 60, 15),
  ('SLA Alta', 'Alta', 120, 30),
  ('SLA Media', 'Media', 240, 60),
  ('SLA Baja', 'Baja', 480, 120)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. DÍAS FESTIVOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dias_festivos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE UNIQUE NOT NULL,
  descripcion TEXT,
  anual BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar días festivos de México 2026
INSERT INTO dias_festivos (fecha, descripcion, anual) VALUES
  ('2026-01-01', 'Año Nuevo', true),
  ('2026-02-02', 'Día de la Constitución', false),
  ('2026-03-16', 'Natalicio de Benito Juárez', false),
  ('2026-04-02', 'Jueves Santo', false),
  ('2026-04-03', 'Viernes Santo', false),
  ('2026-05-01', 'Día del Trabajo', true),
  ('2026-09-16', 'Día de la Independencia', true),
  ('2026-11-16', 'Revolución Mexicana', false),
  ('2026-12-25', 'Navidad', true)
ON CONFLICT (fecha) DO NOTHING;

-- ============================================================================
-- 5. SISTEMA DE FOLIOS AUTOMÁTICOS
-- ============================================================================

-- Secuencia para folios
CREATE SEQUENCE IF NOT EXISTS ticket_folio_seq START WITH 1;

-- Eliminar triggers y función existentes si tienen diferente firma
DROP TRIGGER IF EXISTS generate_ticket_folio ON tickets;
DROP TRIGGER IF EXISTS trigger_asignar_folio ON tickets;
DROP FUNCTION IF EXISTS generar_folio_ticket() CASCADE;
DROP FUNCTION IF EXISTS asignar_folio_ticket() CASCADE;

-- Función para generar folio TKT-AAAA-####
CREATE OR REPLACE FUNCTION generar_folio_ticket()
RETURNS TEXT AS $$
DECLARE
  v_anio TEXT;
  v_numero INTEGER;
  v_folio TEXT;
  v_ultimo_anio TEXT;
BEGIN
  v_anio := EXTRACT(YEAR FROM NOW())::TEXT;

  -- Obtener el último folio del año actual
  SELECT SUBSTRING(folio FROM 'TKT-' || v_anio || '-(\d+)')::INTEGER INTO v_numero
  FROM tickets
  WHERE folio LIKE 'TKT-' || v_anio || '-%'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Si no hay folios del año actual, empezar en 1
  IF v_numero IS NULL THEN
    v_numero := 1;
  ELSE
    v_numero := v_numero + 1;
  END IF;

  v_folio := 'TKT-' || v_anio || '-' || LPAD(v_numero::TEXT, 4, '0');
  RETURN v_folio;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar folio automáticamente
CREATE OR REPLACE FUNCTION asignar_folio_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := generar_folio_ticket();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_folio ON tickets;
CREATE TRIGGER trigger_asignar_folio
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION asignar_folio_ticket();

-- ============================================================================
-- 6. VISTA DE TICKETS CON SLA Y SEMÁFOROS
-- ============================================================================

CREATE OR REPLACE VIEW v_tickets_con_sla AS
SELECT
  t.*,
  c.razon_social as cliente_nombre,
  c.nombre_comercial as cliente_nombre_comercial,
  s.nombre as sucursal_nombre,
  cat.nombre as categoria_nombre,
  cat.color as categoria_color,
  cat.icono as categoria_icono,
  et.nombre as estatus_nombre,
  et.color as estatus_color,
  et.es_final as estatus_es_final,
  et.pausa_sla as estatus_pausa_sla,
  p_resp.nombre_completo as responsable_nombre,
  p_resp.avatar_url as responsable_avatar,
  p_creador.nombre_completo as creador_nombre,
  eq.nombre as equipo_nombre,

  -- Cálculo de tiempo transcurrido (en minutos)
  CASE
    WHEN et.es_final THEN
      EXTRACT(EPOCH FROM (COALESCE(t.fecha_resolucion, t.fecha_cierre, NOW()) - t.fecha_creacion))/60 - t.tiempo_pausado_minutos
    ELSE
      EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos
  END as minutos_transcurridos,

  -- Cálculo del semáforo
  CASE
    WHEN et.es_final THEN 'gris'
    WHEN et.pausa_sla THEN 'azul'
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) < (t.sla_objetivo_minutos * 0.7) THEN 'verde'
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) <= t.sla_objetivo_minutos THEN 'amarillo'
    ELSE 'rojo'
  END as semaforo,

  -- Porcentaje de SLA consumido
  CASE
    WHEN t.sla_objetivo_minutos = 0 THEN 0
    ELSE ROUND(
      ((EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) / t.sla_objetivo_minutos * 100)::NUMERIC,
      2
    )
  END as porcentaje_sla,

  -- Tiempo restante (negativo si excedido)
  t.sla_objetivo_minutos - (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) as minutos_restantes,

  -- Conteo de notas
  (SELECT COUNT(*) FROM ticket_bitacora WHERE ticket_id = t.id) as total_notas,

  -- Conteo de adjuntos
  (SELECT COUNT(*) FROM ticket_adjuntos WHERE ticket_id = t.id) as total_adjuntos

FROM tickets t
LEFT JOIN clientes c ON t.cliente_id = c.id
LEFT JOIN sucursales s ON t.sucursal_id = s.id
LEFT JOIN categorias_servicio cat ON t.categoria_id = cat.id
LEFT JOIN estatus_tickets et ON t.estatus_id = et.id
LEFT JOIN profiles p_resp ON t.responsable_id = p_resp.id
LEFT JOIN profiles p_creador ON t.creado_por = p_creador.id
LEFT JOIN equipos eq ON t.equipo_id = eq.id;

-- ============================================================================
-- 7. FUNCIÓN PARA PAUSAR/REANUDAR SLA
-- ============================================================================

CREATE OR REPLACE FUNCTION manejar_cambio_estatus_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_estatus_pausa BOOLEAN;
  v_estatus_anterior_pausa BOOLEAN;
  v_tiempo_desde_ultimo_cambio INTEGER;
  v_estatus_nombre TEXT;
  v_estatus_anterior_nombre TEXT;
BEGIN
  -- Obtener info del nuevo estatus
  SELECT pausa_sla, nombre INTO v_estatus_pausa, v_estatus_nombre
  FROM estatus_tickets
  WHERE id = NEW.estatus_id;

  -- Solo procesar si cambió el estatus
  IF TG_OP = 'UPDATE' AND OLD.estatus_id IS DISTINCT FROM NEW.estatus_id THEN
    -- Obtener info del estatus anterior
    SELECT pausa_sla, nombre INTO v_estatus_anterior_pausa, v_estatus_anterior_nombre
    FROM estatus_tickets
    WHERE id = OLD.estatus_id;

    -- Si estaba pausado y ahora no lo está, calcular tiempo pausado
    IF v_estatus_anterior_pausa AND NOT v_estatus_pausa THEN
      -- Calcular minutos desde el último cambio de estatus
      SELECT EXTRACT(EPOCH FROM (NOW() - created_at))/60 INTO v_tiempo_desde_ultimo_cambio
      FROM ticket_bitacora
      WHERE ticket_id = NEW.id
        AND tipo = 'cambio_estatus'
      ORDER BY created_at DESC
      LIMIT 1;

      -- Agregar tiempo pausado
      IF v_tiempo_desde_ultimo_cambio IS NOT NULL THEN
        NEW.tiempo_pausado_minutos := COALESCE(NEW.tiempo_pausado_minutos, 0) + v_tiempo_desde_ultimo_cambio;
      END IF;
    END IF;

    -- Registrar en bitácora
    INSERT INTO ticket_bitacora (ticket_id, usuario_id, tipo, mensaje, datos_adicionales)
    VALUES (
      NEW.id,
      auth.uid(),
      'cambio_estatus',
      'Estatus cambiado de "' || COALESCE(v_estatus_anterior_nombre, 'N/A') || '" a "' || v_estatus_nombre || '"',
      jsonb_build_object(
        'estatus_anterior_id', OLD.estatus_id,
        'estatus_nuevo_id', NEW.estatus_id,
        'pausa_sla', v_estatus_pausa
      )
    );

    -- Si el estatus es "Resuelto" y no tiene fecha_resolucion, asignarla
    IF v_estatus_nombre = 'Resuelto' AND NEW.fecha_resolucion IS NULL THEN
      NEW.fecha_resolucion := NOW();
    END IF;

    -- Si el estatus es final y no tiene fecha_cierre, asignarla
    IF (SELECT es_final FROM estatus_tickets WHERE id = NEW.estatus_id) AND NEW.fecha_cierre IS NULL THEN
      NEW.fecha_cierre := NOW();
      NEW.cerrado_por := auth.uid();
    END IF;
  END IF;

  -- Actualizar updated_at
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_cambio_estatus_ticket ON tickets;
CREATE TRIGGER trigger_cambio_estatus_ticket
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION manejar_cambio_estatus_ticket();

-- ============================================================================
-- 8. TRIGGER PARA PRIMERA RESPUESTA
-- ============================================================================

CREATE OR REPLACE FUNCTION registrar_primera_respuesta()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_fecha_primera_respuesta TIMESTAMPTZ;
BEGIN
  -- Solo para notas (no cambios de estatus automáticos)
  IF NEW.tipo IN ('nota', 'asignacion') THEN
    SELECT fecha_primera_respuesta INTO v_ticket_fecha_primera_respuesta
    FROM tickets
    WHERE id = NEW.ticket_id;

    -- Si no tiene primera respuesta, registrarla
    IF v_ticket_fecha_primera_respuesta IS NULL THEN
      UPDATE tickets
      SET fecha_primera_respuesta = NOW()
      WHERE id = NEW.ticket_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_primera_respuesta ON ticket_bitacora;
CREATE TRIGGER trigger_primera_respuesta
  AFTER INSERT ON ticket_bitacora
  FOR EACH ROW EXECUTE FUNCTION registrar_primera_respuesta();

-- ============================================================================
-- 9. SISTEMA DE NOTIFICACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'ticket_asignado',
    'ticket_comentario',
    'ticket_estatus',
    'ticket_escalado',
    'ticket_vencido',
    'ticket_proximo_vencer',
    'sistema'
  )),
  titulo TEXT NOT NULL,
  mensaje TEXT,
  leida BOOLEAN DEFAULT false,
  datos JSONB DEFAULT '{}',
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones(created_at DESC);

-- Trigger para notificar asignación
CREATE OR REPLACE FUNCTION notificar_asignacion_ticket()
RETURNS TRIGGER AS $$
BEGIN
  -- Notificar al nuevo responsable
  IF NEW.responsable_id IS NOT NULL AND (
    OLD.responsable_id IS NULL OR
    OLD.responsable_id IS DISTINCT FROM NEW.responsable_id
  ) THEN
    INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos, url)
    VALUES (
      NEW.responsable_id,
      'ticket_asignado',
      'Ticket asignado: ' || NEW.folio,
      'Se te ha asignado el ticket ' || NEW.folio,
      jsonb_build_object(
        'ticket_id', NEW.id,
        'folio', NEW.folio,
        'prioridad', NEW.prioridad
      ),
      '/tickets/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notificar_asignacion ON tickets;
CREATE TRIGGER trigger_notificar_asignacion
  AFTER INSERT OR UPDATE OF responsable_id ON tickets
  FOR EACH ROW EXECUTE FUNCTION notificar_asignacion_ticket();

-- Trigger para notificar comentarios
CREATE OR REPLACE FUNCTION notificar_comentario_ticket()
RETURNS TRIGGER AS $$
DECLARE
  v_responsable_id UUID;
  v_folio TEXT;
BEGIN
  IF NEW.tipo = 'nota' THEN
    SELECT responsable_id, folio INTO v_responsable_id, v_folio
    FROM tickets
    WHERE id = NEW.ticket_id;

    -- Notificar al responsable si no es él quien comenta
    IF v_responsable_id IS NOT NULL AND v_responsable_id IS DISTINCT FROM NEW.usuario_id THEN
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos, url)
      VALUES (
        v_responsable_id,
        'ticket_comentario',
        'Nuevo comentario en ' || COALESCE(v_folio, 'ticket'),
        'Hay un nuevo comentario en el ticket que tienes asignado',
        jsonb_build_object('ticket_id', NEW.ticket_id, 'folio', v_folio),
        '/tickets/' || NEW.ticket_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notificar_comentario ON ticket_bitacora;
CREATE TRIGGER trigger_notificar_comentario
  AFTER INSERT ON ticket_bitacora
  FOR EACH ROW EXECUTE FUNCTION notificar_comentario_ticket();

-- ============================================================================
-- 10. ROW LEVEL SECURITY PARA TICKETS
-- ============================================================================

-- Habilitar RLS
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bitacora ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_historial_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar rol
CREATE OR REPLACE FUNCTION user_has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.rol_id = r.id
    WHERE p.id = auth.uid()
      AND r.nombre = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función helper para verificar múltiples roles
CREATE OR REPLACE FUNCTION user_has_any_role(role_names TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.rol_id = r.id
    WHERE p.id = auth.uid()
      AND r.nombre = ANY(role_names)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas para TICKETS

-- Admins y Supervisores ven todos los tickets
DROP POLICY IF EXISTS "Admins y Supervisores ven todos los tickets" ON tickets;
CREATE POLICY "Admins y Supervisores ven todos los tickets"
  ON tickets FOR SELECT
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Agentes ven tickets asignados a ellos o a su equipo
DROP POLICY IF EXISTS "Agentes ven tickets de su equipo" ON tickets;
CREATE POLICY "Agentes ven tickets de su equipo"
  ON tickets FOR SELECT
  USING (
    responsable_id = auth.uid() OR
    creado_por = auth.uid() OR
    equipo_id IN (SELECT area_equipo_id FROM profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM ticket_participantes tp
      WHERE tp.ticket_id = tickets.id AND tp.usuario_id = auth.uid()
    )
  );

-- Usuarios autenticados pueden crear tickets
DROP POLICY IF EXISTS "Usuarios pueden crear tickets" ON tickets;
CREATE POLICY "Usuarios pueden crear tickets"
  ON tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Responsables, Admins y Supervisores pueden actualizar
DROP POLICY IF EXISTS "Responsables pueden actualizar tickets" ON tickets;
CREATE POLICY "Responsables pueden actualizar tickets"
  ON tickets FOR UPDATE
  USING (
    responsable_id = auth.uid() OR
    creado_por = auth.uid() OR
    user_has_any_role(ARRAY['Administrador', 'Supervisor'])
  );

-- Políticas para TICKET_BITACORA
DROP POLICY IF EXISTS "Ver bitácora de tickets visibles" ON ticket_bitacora;
CREATE POLICY "Ver bitácora de tickets visibles"
  ON ticket_bitacora FOR SELECT
  USING (
    user_has_any_role(ARRAY['Administrador', 'Supervisor']) OR
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_bitacora.ticket_id
        AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Agregar entradas a bitácora" ON ticket_bitacora;
CREATE POLICY "Agregar entradas a bitácora"
  ON ticket_bitacora FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para TICKET_ADJUNTOS
DROP POLICY IF EXISTS "Ver adjuntos de tickets visibles" ON ticket_adjuntos;
CREATE POLICY "Ver adjuntos de tickets visibles"
  ON ticket_adjuntos FOR SELECT
  USING (
    user_has_any_role(ARRAY['Administrador', 'Supervisor']) OR
    EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = ticket_adjuntos.ticket_id
        AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Subir adjuntos" ON ticket_adjuntos;
CREATE POLICY "Subir adjuntos"
  ON ticket_adjuntos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para NOTIFICACIONES
DROP POLICY IF EXISTS "Ver propias notificaciones" ON notificaciones;
CREATE POLICY "Ver propias notificaciones"
  ON notificaciones FOR SELECT
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Actualizar propias notificaciones" ON notificaciones;
CREATE POLICY "Actualizar propias notificaciones"
  ON notificaciones FOR UPDATE
  USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "Sistema puede crear notificaciones" ON notificaciones;
CREATE POLICY "Sistema puede crear notificaciones"
  ON notificaciones FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 11. ACTUALIZAR CATEGORÍAS CON LAS ESPECÍFICAS DE iGAS
-- ============================================================================

-- Agregar categorías específicas si no existen (usando DO block para evitar duplicados)
DO $$
BEGIN
  -- Volumétrico A30
  IF NOT EXISTS (SELECT 1 FROM categorias_servicio WHERE nombre = 'Volumétrico A30') THEN
    INSERT INTO categorias_servicio (nombre, descripcion, sla_minutos, color, icono)
    VALUES ('Volumétrico A30', 'Problemas con sistema volumétrico A30', 240, '#04a9f5', 'feather icon-activity');
  END IF;

  -- POS
  IF NOT EXISTS (SELECT 1 FROM categorias_servicio WHERE nombre = 'POS') THEN
    INSERT INTO categorias_servicio (nombre, descripcion, sla_minutos, color, icono)
    VALUES ('POS', 'Problemas con punto de venta', 180, '#1de9b6', 'feather icon-credit-card');
  END IF;

  -- BD
  IF NOT EXISTS (SELECT 1 FROM categorias_servicio WHERE nombre = 'BD') THEN
    INSERT INTO categorias_servicio (nombre, descripcion, sla_minutos, color, icono)
    VALUES ('BD', 'Problemas de base de datos', 120, '#f44236', 'feather icon-database');
  END IF;

  -- Hasp
  IF NOT EXISTS (SELECT 1 FROM categorias_servicio WHERE nombre = 'Hasp') THEN
    INSERT INTO categorias_servicio (nombre, descripcion, sla_minutos, color, icono)
    VALUES ('Hasp', 'Problemas con llave HASP', 240, '#a389d4', 'feather icon-key');
  END IF;

  -- Red
  IF NOT EXISTS (SELECT 1 FROM categorias_servicio WHERE nombre = 'Red') THEN
    INSERT INTO categorias_servicio (nombre, descripcion, sla_minutos, color, icono)
    VALUES ('Red', 'Problemas de conectividad', 180, '#3ebfea', 'feather icon-wifi');
  END IF;

  -- Otros
  IF NOT EXISTS (SELECT 1 FROM categorias_servicio WHERE nombre = 'Otros') THEN
    INSERT INTO categorias_servicio (nombre, descripcion, sla_minutos, color, icono)
    VALUES ('Otros', 'Otras solicitudes', 360, '#748892', 'feather icon-help-circle');
  END IF;
END $$;

-- ============================================================================
-- 12. FUNCIONES ÚTILES PARA EL SERVICIO
-- ============================================================================

-- Función para obtener estadísticas de tickets por semáforo
CREATE OR REPLACE FUNCTION get_tickets_por_semaforo()
RETURNS TABLE (
  semaforo TEXT,
  cantidad BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.semaforo,
    COUNT(*) as cantidad
  FROM v_tickets_con_sla v
  WHERE v.estatus_es_final = false
  GROUP BY v.semaforo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener tickets próximos a vencer (amarillos y rojos)
CREATE OR REPLACE FUNCTION get_tickets_alertas(p_limite INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  folio TEXT,
  cliente_nombre TEXT,
  categoria_nombre TEXT,
  prioridad TEXT,
  responsable_nombre TEXT,
  semaforo TEXT,
  porcentaje_sla NUMERIC,
  minutos_restantes DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.folio,
    v.cliente_nombre,
    v.categoria_nombre,
    v.prioridad,
    v.responsable_nombre,
    v.semaforo,
    v.porcentaje_sla,
    v.minutos_restantes::DOUBLE PRECISION
  FROM v_tickets_con_sla v
  WHERE v.estatus_es_final = false
    AND v.semaforo IN ('amarillo', 'rojo')
  ORDER BY v.minutos_restantes ASC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar notificaciones como leídas
CREATE OR REPLACE FUNCTION marcar_notificaciones_leidas(p_notificacion_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notificaciones
  SET leida = true
  WHERE id = ANY(p_notificacion_ids)
    AND usuario_id = auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar notificaciones no leídas
CREATE OR REPLACE FUNCTION contar_notificaciones_no_leidas()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notificaciones
    WHERE usuario_id = auth.uid()
      AND leida = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 'Migración 14 completada - Sistema de tickets SLA' as info;
SELECT 'Tablas actualizadas:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sla_config', 'dias_festivos', 'canales_contacto', 'notificaciones');
