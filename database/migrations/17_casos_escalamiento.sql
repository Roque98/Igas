-- ============================================================================
-- Migration: Casos (Escalamiento) Module
-- ============================================================================
-- Sistema de escalamiento de tickets a otras áreas
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CATÁLOGOS
-- ============================================================================

-- 1.1 Estatus de casos
CREATE TABLE IF NOT EXISTS public.estatus_casos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  orden INTEGER,
  pausa_sla BOOLEAN DEFAULT false,
  es_final BOOLEAN DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO estatus_casos (nombre, orden, pausa_sla, es_final, color) VALUES
  ('Nuevo', 1, false, false, '#1de9b6'),
  ('En proceso', 2, false, false, '#04a9f5'),
  ('En espera', 3, true, false, '#f4c22b'),
  ('Listo para validar', 4, false, false, '#00A651'),
  ('Regresado a soporte', 5, false, true, '#a389d4'),
  ('Cerrado', 6, false, true, '#748892')
ON CONFLICT (nombre) DO NOTHING;

-- 1.2 Áreas destino
CREATE TABLE IF NOT EXISTS public.areas_destino (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  email_notificacion TEXT,
  responsable_default_id UUID REFERENCES profiles(id),
  sla_default_horas INTEGER DEFAULT 48,
  descripcion TEXT,
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO areas_destino (nombre, email_notificacion, sla_default_horas, descripcion) VALUES
  ('Dev', 'desarrollo@igas.mx', 48, 'Equipo de desarrollo - bugs y mejoras'),
  ('Implementación', 'implementacion@igas.mx', 72, 'Equipo de implementación - configuraciones'),
  ('Facturación', 'facturacion@igas.mx', 24, 'Equipo de facturación - temas administrativos'),
  ('Proveedor', 'proveedores@igas.mx', 96, 'Casos que requieren atención del proveedor'),
  ('Cobranza', 'cobranza@igas.mx', 48, 'Equipo de cobranza')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- 2. TABLA PRINCIPAL DE CASOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.casos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  cliente_id UUID REFERENCES clientes(id), -- Puede ser NULL si ticket no tiene cliente
  problema_descripcion TEXT,
  area_destino TEXT CHECK (area_destino IN ('Dev', 'Implementación', 'Facturación', 'Proveedor', 'Cobranza')) NOT NULL,
  motivo TEXT CHECK (motivo IN ('Bug', 'Mejora', 'Configuración', 'Proveedor', 'Administrativo')) NOT NULL,
  responsable_id UUID REFERENCES profiles(id),
  prioridad TEXT CHECK (prioridad IN ('Crítica', 'Alta', 'Media', 'Baja')) DEFAULT 'Media',
  estatus_id UUID REFERENCES estatus_casos(id) NOT NULL,
  sla_objetivo_minutos INTEGER NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_primera_respuesta TIMESTAMPTZ,
  fecha_resolucion TIMESTAMPTZ,
  fecha_compromiso DATE,
  tiempo_pausado_minutos INTEGER DEFAULT 0,
  resultado TEXT CHECK (resultado IN ('Listo para validar', 'Regresa a soporte', 'Cerrado')),
  numero_caso_externo TEXT,
  email_enviado BOOLEAN DEFAULT false,
  creado_por UUID REFERENCES profiles(id) NOT NULL,
  cerrado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_casos_folio ON casos(folio);
CREATE INDEX IF NOT EXISTS idx_casos_ticket ON casos(ticket_id);
CREATE INDEX IF NOT EXISTS idx_casos_cliente ON casos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_casos_area ON casos(area_destino);
CREATE INDEX IF NOT EXISTS idx_casos_responsable ON casos(responsable_id);
CREATE INDEX IF NOT EXISTS idx_casos_estatus ON casos(estatus_id);
CREATE INDEX IF NOT EXISTS idx_casos_fecha_creacion ON casos(fecha_creacion DESC);

-- ============================================================================
-- 3. TABLAS RELACIONADAS
-- ============================================================================

-- 3.1 Bitácora de casos
CREATE TABLE IF NOT EXISTS public.caso_bitacora (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  tipo TEXT CHECK (tipo IN ('nota', 'cambio_estatus', 'asignacion', 'adjunto', 'email_enviado', 'numero_caso_recibido')) NOT NULL,
  mensaje TEXT,
  datos_adicionales JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caso_bitacora_caso ON caso_bitacora(caso_id);
CREATE INDEX IF NOT EXISTS idx_caso_bitacora_fecha ON caso_bitacora(created_at DESC);

-- 3.2 Adjuntos de casos
CREATE TABLE IF NOT EXISTS public.caso_adjuntos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  ruta_storage TEXT NOT NULL,
  tipo_archivo TEXT,
  tamanio_bytes BIGINT,
  subido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_caso_adjuntos_caso ON caso_adjuntos(caso_id);

-- 3.3 Participantes
CREATE TABLE IF NOT EXISTS public.caso_participantes (
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (caso_id, usuario_id)
);

-- 3.4 Historial de asignaciones
CREATE TABLE IF NOT EXISTS public.caso_historial_asignaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  de_usuario_id UUID REFERENCES profiles(id),
  a_usuario_id UUID REFERENCES profiles(id),
  motivo TEXT,
  asignado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. SISTEMA DE FOLIOS
-- ============================================================================

-- Secuencia para folios de casos
CREATE SEQUENCE IF NOT EXISTS caso_folio_seq START 1;

-- Función para generar folio CASO-AAAA-####
-- NOTA: Se usa prefijo v_ en variables para evitar conflicto con columna casos.folio
CREATE OR REPLACE FUNCTION generar_folio_caso()
RETURNS TEXT AS $$
DECLARE
  v_anio TEXT;
  v_numero INTEGER;
  v_folio TEXT;
BEGIN
  v_anio := EXTRACT(YEAR FROM NOW())::TEXT;
  v_numero := nextval('caso_folio_seq');

  -- Reset secuencia si cambió el año (primer caso del año)
  IF v_numero > 1 AND NOT EXISTS (
    SELECT 1 FROM casos
    WHERE casos.folio LIKE 'CASO-' || v_anio || '-%'
  ) THEN
    PERFORM setval('caso_folio_seq', 1, false);
    v_numero := nextval('caso_folio_seq');
  END IF;

  v_folio := 'CASO-' || v_anio || '-' || LPAD(v_numero::TEXT, 4, '0');
  RETURN v_folio;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar folio automáticamente
CREATE OR REPLACE FUNCTION asignar_folio_caso()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := generar_folio_caso();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_folio_caso ON casos;
CREATE TRIGGER trigger_asignar_folio_caso
  BEFORE INSERT ON casos
  FOR EACH ROW EXECUTE FUNCTION asignar_folio_caso();

-- ============================================================================
-- 5. INTEGRACIÓN TICKET ↔ CASO
-- ============================================================================

-- Agregar columnas a tickets si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tickets' AND column_name = 'caso_id') THEN
    ALTER TABLE tickets ADD COLUMN caso_id UUID REFERENCES casos(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'tickets' AND column_name = 'esta_escalado') THEN
    ALTER TABLE tickets ADD COLUMN esta_escalado BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Agregar estatus "Escalado" a tickets si no existe
INSERT INTO estatus_tickets (nombre, orden, pausa_sla, es_final, color)
VALUES ('Escalado', 7, true, false, '#9575cd')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- 6. VISTA DE CASOS CON SLA
-- ============================================================================

CREATE OR REPLACE VIEW v_casos_con_sla AS
SELECT
  c.*,
  -- Datos del ticket
  t.folio as ticket_folio,
  t.descripcion as ticket_descripcion,
  -- Datos del cliente
  cl.razon_social as cliente_nombre,
  cl.nombre_comercial as cliente_nombre_comercial,
  -- Datos de estatus
  ec.nombre as estatus_nombre,
  ec.color as estatus_color,
  ec.es_final as estatus_es_final,
  ec.pausa_sla as estatus_pausa_sla,
  -- Datos de responsable
  resp.nombre_completo as responsable_nombre,
  resp.avatar_url as responsable_avatar,
  -- Datos del creador
  creador.nombre_completo as creador_nombre,
  -- Cálculos de SLA
  CASE
    WHEN ec.es_final THEN 0
    WHEN ec.pausa_sla THEN
      EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos
    ELSE
      EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos
  END as minutos_transcurridos,
  -- Semáforo
  CASE
    WHEN ec.es_final THEN 'gris'
    WHEN ec.pausa_sla THEN 'azul'
    WHEN (EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos) < (c.sla_objetivo_minutos * 0.7) THEN 'verde'
    WHEN (EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos) <= c.sla_objetivo_minutos THEN 'amarillo'
    ELSE 'rojo'
  END as semaforo,
  -- Porcentaje SLA
  CASE
    WHEN c.sla_objetivo_minutos = 0 THEN 0
    ELSE ROUND(
      ((EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos) / c.sla_objetivo_minutos * 100)::NUMERIC,
      2
    )
  END as porcentaje_sla,
  -- Minutos restantes
  CASE
    WHEN ec.es_final THEN 0
    ELSE GREATEST(0, c.sla_objetivo_minutos - (EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos))
  END as minutos_restantes,
  -- Fecha compromiso vencida
  CASE
    WHEN c.fecha_compromiso IS NOT NULL AND c.fecha_compromiso < CURRENT_DATE AND NOT ec.es_final THEN true
    ELSE false
  END as compromiso_vencido
FROM casos c
LEFT JOIN tickets t ON c.ticket_id = t.id
LEFT JOIN clientes cl ON c.cliente_id = cl.id
LEFT JOIN estatus_casos ec ON c.estatus_id = ec.id
LEFT JOIN profiles resp ON c.responsable_id = resp.id
LEFT JOIN profiles creador ON c.creado_por = creador.id;

-- Dar permisos a la vista
GRANT SELECT ON v_casos_con_sla TO authenticated;

-- ============================================================================
-- 7. FUNCIÓN PARA ESCALAR TICKET A CASO
-- ============================================================================

CREATE OR REPLACE FUNCTION escalar_ticket_a_caso(
  p_ticket_id UUID,
  p_area_destino TEXT,
  p_motivo TEXT,
  p_descripcion TEXT,
  p_fecha_compromiso DATE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_caso_id UUID;
  v_ticket RECORD;
  v_estatus_nuevo UUID;
  v_estatus_escalado UUID;
  v_sla_minutos INTEGER;
BEGIN
  -- Obtener ticket
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket no encontrado: %', p_ticket_id;
  END IF;

  -- Verificar que no esté ya escalado
  IF v_ticket.esta_escalado THEN
    RAISE EXCEPTION 'El ticket ya está escalado';
  END IF;

  -- Obtener estatus "Nuevo" para casos
  SELECT id INTO v_estatus_nuevo FROM estatus_casos WHERE nombre = 'Nuevo';

  -- Obtener estatus "Escalado" para tickets
  SELECT id INTO v_estatus_escalado FROM estatus_tickets WHERE nombre = 'Escalado';

  -- Obtener SLA default del área
  SELECT COALESCE(sla_default_horas, 48) * 60 INTO v_sla_minutos
  FROM areas_destino WHERE nombre = p_area_destino;

  IF v_sla_minutos IS NULL THEN
    v_sla_minutos := 2880; -- 48 horas por defecto
  END IF;

  -- Crear caso
  INSERT INTO casos (
    ticket_id,
    cliente_id,
    problema_descripcion,
    area_destino,
    motivo,
    prioridad,
    estatus_id,
    sla_objetivo_minutos,
    fecha_compromiso,
    creado_por
  ) VALUES (
    v_ticket.id,
    v_ticket.cliente_id,
    COALESCE(p_descripcion, v_ticket.descripcion),
    p_area_destino,
    p_motivo,
    v_ticket.prioridad,
    v_estatus_nuevo,
    v_sla_minutos,
    p_fecha_compromiso,
    auth.uid()
  )
  RETURNING id INTO v_caso_id;

  -- Actualizar ticket
  UPDATE tickets
  SET
    caso_id = v_caso_id,
    esta_escalado = true,
    estatus_id = v_estatus_escalado,
    updated_at = NOW()
  WHERE id = p_ticket_id;

  -- Registrar en bitácora del ticket
  INSERT INTO ticket_bitacora (ticket_id, usuario_id, tipo, mensaje, datos_adicionales)
  VALUES (
    p_ticket_id,
    auth.uid(),
    'escalamiento',
    'Ticket escalado a ' || p_area_destino,
    jsonb_build_object('caso_id', v_caso_id, 'area', p_area_destino, 'motivo', p_motivo)
  );

  -- Registrar en bitácora del caso
  INSERT INTO caso_bitacora (caso_id, usuario_id, tipo, mensaje, datos_adicionales)
  VALUES (
    v_caso_id,
    auth.uid(),
    'nota',
    'Caso creado desde ticket ' || v_ticket.folio,
    jsonb_build_object('ticket_id', v_ticket.id, 'ticket_folio', v_ticket.folio)
  );

  RETURN v_caso_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 8. TRIGGERS PARA BITÁCORA Y NOTIFICACIONES
-- ============================================================================

-- Trigger para registrar cambios de estatus en casos
CREATE OR REPLACE FUNCTION registrar_cambio_estatus_caso()
RETURNS TRIGGER AS $$
DECLARE
  v_estatus_anterior TEXT;
  v_estatus_nuevo TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.estatus_id != NEW.estatus_id THEN
    SELECT nombre INTO v_estatus_anterior FROM estatus_casos WHERE id = OLD.estatus_id;
    SELECT nombre INTO v_estatus_nuevo FROM estatus_casos WHERE id = NEW.estatus_id;

    INSERT INTO caso_bitacora (caso_id, usuario_id, tipo, mensaje, datos_adicionales)
    VALUES (
      NEW.id,
      auth.uid(),
      'cambio_estatus',
      'Estatus cambiado de "' || COALESCE(v_estatus_anterior, 'N/A') || '" a "' || v_estatus_nuevo || '"',
      jsonb_build_object('estatus_anterior_id', OLD.estatus_id, 'estatus_nuevo_id', NEW.estatus_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_cambio_estatus_caso ON casos;
CREATE TRIGGER trigger_cambio_estatus_caso
  AFTER UPDATE OF estatus_id ON casos
  FOR EACH ROW EXECUTE FUNCTION registrar_cambio_estatus_caso();

-- Trigger para registrar asignaciones en casos
CREATE OR REPLACE FUNCTION registrar_asignacion_caso()
RETURNS TRIGGER AS $$
DECLARE
  v_responsable_anterior TEXT;
  v_responsable_nuevo TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.responsable_id IS DISTINCT FROM NEW.responsable_id) THEN
    SELECT nombre_completo INTO v_responsable_anterior FROM profiles WHERE id = OLD.responsable_id;
    SELECT nombre_completo INTO v_responsable_nuevo FROM profiles WHERE id = NEW.responsable_id;

    -- Registrar en historial de asignaciones
    INSERT INTO caso_historial_asignaciones (caso_id, de_usuario_id, a_usuario_id, asignado_por)
    VALUES (NEW.id, OLD.responsable_id, NEW.responsable_id, auth.uid());

    -- Registrar en bitácora
    INSERT INTO caso_bitacora (caso_id, usuario_id, tipo, mensaje, datos_adicionales)
    VALUES (
      NEW.id,
      auth.uid(),
      'asignacion',
      CASE
        WHEN OLD.responsable_id IS NULL THEN 'Caso asignado a ' || v_responsable_nuevo
        ELSE 'Caso reasignado de ' || COALESCE(v_responsable_anterior, 'Sin asignar') || ' a ' || v_responsable_nuevo
      END,
      jsonb_build_object('de_usuario_id', OLD.responsable_id, 'a_usuario_id', NEW.responsable_id)
    );

    -- Crear notificación para el nuevo responsable
    IF NEW.responsable_id IS NOT NULL THEN
      INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos)
      VALUES (
        NEW.responsable_id,
        'caso_asignado',
        'Caso asignado',
        'Se te ha asignado el caso ' || NEW.folio,
        jsonb_build_object('caso_id', NEW.id, 'folio', NEW.folio)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_asignacion_caso ON casos;
CREATE TRIGGER trigger_asignacion_caso
  AFTER UPDATE OF responsable_id ON casos
  FOR EACH ROW EXECUTE FUNCTION registrar_asignacion_caso();

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso_bitacora ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE caso_historial_asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatus_casos ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas_destino ENABLE ROW LEVEL SECURITY;

-- Políticas para estatus_casos (lectura para todos)
DROP POLICY IF EXISTS "Todos pueden ver estatus de casos" ON estatus_casos;
CREATE POLICY "Todos pueden ver estatus de casos"
  ON estatus_casos FOR SELECT
  USING (true);

-- Políticas para areas_destino (lectura para todos)
DROP POLICY IF EXISTS "Todos pueden ver áreas destino" ON areas_destino;
CREATE POLICY "Todos pueden ver áreas destino"
  ON areas_destino FOR SELECT
  USING (true);

-- Políticas para casos
DROP POLICY IF EXISTS "Usuarios ven casos asignados o de su área" ON casos;
CREATE POLICY "Usuarios ven casos asignados o de su área"
  ON casos FOR SELECT
  USING (
    responsable_id = auth.uid() OR
    creado_por = auth.uid() OR
    user_has_any_role(ARRAY['Administrador', 'Supervisor'])
  );

DROP POLICY IF EXISTS "Usuarios pueden crear casos" ON casos;
CREATE POLICY "Usuarios pueden crear casos"
  ON casos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Responsable o Admin puede actualizar caso" ON casos;
CREATE POLICY "Responsable o Admin puede actualizar caso"
  ON casos FOR UPDATE
  USING (
    responsable_id = auth.uid() OR
    creado_por = auth.uid() OR
    user_has_any_role(ARRAY['Administrador', 'Supervisor'])
  );

-- Políticas para caso_bitacora
DROP POLICY IF EXISTS "Usuarios ven bitácora de casos accesibles" ON caso_bitacora;
CREATE POLICY "Usuarios ven bitácora de casos accesibles"
  ON caso_bitacora FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM casos c
      WHERE c.id = caso_id
      AND (c.responsable_id = auth.uid() OR c.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden agregar a bitácora" ON caso_bitacora;
CREATE POLICY "Usuarios pueden agregar a bitácora"
  ON caso_bitacora FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para caso_adjuntos
DROP POLICY IF EXISTS "Usuarios ven adjuntos de casos accesibles" ON caso_adjuntos;
CREATE POLICY "Usuarios ven adjuntos de casos accesibles"
  ON caso_adjuntos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM casos c
      WHERE c.id = caso_id
      AND (c.responsable_id = auth.uid() OR c.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden subir adjuntos" ON caso_adjuntos;
CREATE POLICY "Usuarios pueden subir adjuntos"
  ON caso_adjuntos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Políticas para caso_participantes
DROP POLICY IF EXISTS "Usuarios ven participantes de casos accesibles" ON caso_participantes;
CREATE POLICY "Usuarios ven participantes de casos accesibles"
  ON caso_participantes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM casos c
      WHERE c.id = caso_id
      AND (c.responsable_id = auth.uid() OR c.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
    )
  );

-- Políticas para caso_historial_asignaciones
DROP POLICY IF EXISTS "Usuarios ven historial de casos accesibles" ON caso_historial_asignaciones;
CREATE POLICY "Usuarios ven historial de casos accesibles"
  ON caso_historial_asignaciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM casos c
      WHERE c.id = caso_id
      AND (c.responsable_id = auth.uid() OR c.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
    )
  );

-- ============================================================================
-- 10. FUNCIONES HELPER
-- ============================================================================

-- Función para obtener estadísticas de casos
CREATE OR REPLACE FUNCTION get_casos_stats()
RETURNS TABLE (
  total_activos BIGINT,
  total_por_area JSONB,
  total_por_semaforo JSONB,
  casos_vencidos BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM v_casos_con_sla WHERE NOT estatus_es_final)::BIGINT,
    (SELECT jsonb_object_agg(area_destino, cnt) FROM (
      SELECT area_destino, COUNT(*) as cnt
      FROM v_casos_con_sla
      WHERE NOT estatus_es_final
      GROUP BY area_destino
    ) sub),
    (SELECT jsonb_object_agg(semaforo, cnt) FROM (
      SELECT semaforo, COUNT(*) as cnt
      FROM v_casos_con_sla
      WHERE NOT estatus_es_final
      GROUP BY semaforo
    ) sub),
    (SELECT COUNT(*) FROM v_casos_con_sla WHERE compromiso_vencido)::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función para obtener casos con alertas (próximos a vencer o vencidos)
CREATE OR REPLACE FUNCTION get_casos_alertas(p_limit INTEGER DEFAULT 10)
RETURNS SETOF v_casos_con_sla AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM v_casos_con_sla
  WHERE NOT estatus_es_final
    AND (semaforo IN ('amarillo', 'rojo') OR compromiso_vencido)
  ORDER BY
    CASE semaforo WHEN 'rojo' THEN 1 WHEN 'amarillo' THEN 2 ELSE 3 END,
    fecha_creacion ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 11. HABILITAR REALTIME
-- ============================================================================

-- Habilitar realtime para casos (para actualizaciones en tiempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE casos;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
