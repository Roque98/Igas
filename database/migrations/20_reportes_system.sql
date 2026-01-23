-- ============================================================================
-- Migration: Sistema de Reportes
-- Fecha: 2026-01-22
-- Descripción: Vistas y funciones para generación de reportes operativos
-- ============================================================================

-- ============================================================================
-- VISTAS DE REPORTES
-- ============================================================================

-- Vista completa de tickets para reportes
CREATE OR REPLACE VIEW v_reporte_tickets AS
SELECT
  t.id,
  t.folio,
  t.titulo,
  t.descripcion,
  t.fecha_creacion,
  t.fecha_primera_respuesta,
  t.fecha_resolucion,
  t.fecha_cierre,
  t.prioridad,
  t.canal,
  -- Cliente
  t.cliente_id,
  cli.nombre_comercial as cliente_nombre,
  cli.razon_social as cliente_razon_social,
  -- Sucursal
  t.sucursal_id,
  suc.nombre as sucursal_nombre,
  -- Categoría
  t.categoria_id,
  cat.nombre as categoria_nombre,
  -- Estatus
  t.estatus_id,
  e.nombre as estatus_nombre,
  e.es_final as estatus_es_final,
  e.pausa_sla as estatus_pausa_sla,
  -- Responsable
  t.responsable_id,
  resp.nombre_completo as responsable_nombre,
  resp.email as responsable_email,
  -- Equipo
  t.equipo_id,
  eq.nombre as equipo_nombre,
  -- Creador
  t.creado_por,
  creador.nombre_completo as creador_nombre,
  -- SLA
  t.sla_objetivo_minutos,
  t.tiempo_pausado_minutos,
  -- Cálculo de tiempo transcurrido (minutos efectivos)
  CASE
    WHEN e.es_final THEN
      EXTRACT(EPOCH FROM (COALESCE(t.fecha_resolucion, t.fecha_cierre, NOW()) - t.fecha_creacion))/60 - COALESCE(t.tiempo_pausado_minutos, 0)
    ELSE
      EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - COALESCE(t.tiempo_pausado_minutos, 0)
  END as minutos_transcurridos,
  -- Cálculo del semáforo
  CASE
    WHEN e.es_final THEN 'gris'
    WHEN e.pausa_sla THEN 'azul'
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - COALESCE(t.tiempo_pausado_minutos, 0)) < (t.sla_objetivo_minutos * 0.7) THEN 'verde'
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - COALESCE(t.tiempo_pausado_minutos, 0)) <= t.sla_objetivo_minutos THEN 'amarillo'
    ELSE 'rojo'
  END as semaforo,
  -- Porcentaje de SLA consumido
  CASE
    WHEN t.sla_objetivo_minutos = 0 OR t.sla_objetivo_minutos IS NULL THEN 0
    ELSE ROUND(
      ((EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - COALESCE(t.tiempo_pausado_minutos, 0)) / t.sla_objetivo_minutos * 100)::NUMERIC, 2
    )
  END as porcentaje_sla,
  -- Tiempo de primera respuesta (minutos)
  CASE
    WHEN t.fecha_primera_respuesta IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (t.fecha_primera_respuesta - t.fecha_creacion))/60)
    ELSE NULL
  END as tiempo_respuesta_minutos,
  -- Tiempo de resolución (minutos)
  CASE
    WHEN t.fecha_resolucion IS NOT NULL OR t.fecha_cierre IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (COALESCE(t.fecha_resolucion, t.fecha_cierre) - t.fecha_creacion))/60 - COALESCE(t.tiempo_pausado_minutos, 0))
    ELSE NULL
  END as tiempo_resolucion_minutos,
  -- SLA cumplido (para tickets cerrados)
  CASE
    WHEN e.es_final AND (t.fecha_resolucion IS NOT NULL OR t.fecha_cierre IS NOT NULL) THEN
      CASE
        WHEN (EXTRACT(EPOCH FROM (COALESCE(t.fecha_resolucion, t.fecha_cierre) - t.fecha_creacion))/60 - COALESCE(t.tiempo_pausado_minutos, 0)) <= t.sla_objetivo_minutos
        THEN true
        ELSE false
      END
    ELSE NULL
  END as sla_cumplido,
  -- Horas (para reportes)
  CASE
    WHEN t.fecha_primera_respuesta IS NOT NULL THEN
      ROUND((EXTRACT(EPOCH FROM (t.fecha_primera_respuesta - t.fecha_creacion))/3600)::numeric, 2)
    ELSE NULL
  END as horas_respuesta,
  CASE
    WHEN t.fecha_resolucion IS NOT NULL OR t.fecha_cierre IS NOT NULL THEN
      ROUND(((EXTRACT(EPOCH FROM (COALESCE(t.fecha_resolucion, t.fecha_cierre) - t.fecha_creacion))/3600) - COALESCE(t.tiempo_pausado_minutos, 0)/60)::numeric, 2)
    ELSE NULL
  END as horas_resolucion,
  -- Extracciones de fecha para agrupación
  EXTRACT(YEAR FROM t.fecha_creacion) as anio,
  EXTRACT(MONTH FROM t.fecha_creacion) as mes,
  EXTRACT(WEEK FROM t.fecha_creacion) as semana,
  TO_CHAR(t.fecha_creacion, 'YYYY-MM') as periodo_mes,
  TO_CHAR(t.fecha_creacion, 'YYYY-"W"IW') as periodo_semana,
  DATE(t.fecha_creacion) as fecha_dia
FROM tickets t
LEFT JOIN clientes cli ON t.cliente_id = cli.id
LEFT JOIN sucursales suc ON t.sucursal_id = suc.id
LEFT JOIN categorias_servicio cat ON t.categoria_id = cat.id
LEFT JOIN estatus_tickets e ON t.estatus_id = e.id
LEFT JOIN profiles resp ON t.responsable_id = resp.id
LEFT JOIN profiles creador ON t.creado_por = creador.id
LEFT JOIN equipos eq ON t.equipo_id = eq.id;

-- Vista completa de casos para reportes
CREATE OR REPLACE VIEW v_reporte_casos AS
SELECT
  c.id,
  c.folio,
  c.problema_descripcion as descripcion,
  c.area_destino,
  c.motivo,
  c.fecha_creacion,
  c.fecha_compromiso,
  c.fecha_resolucion,
  c.prioridad,
  c.resultado,
  -- Cliente
  c.cliente_id,
  cli.nombre_comercial as cliente_nombre,
  cli.razon_social as cliente_razon_social,
  -- Estatus
  c.estatus_id,
  e.nombre as estatus_nombre,
  e.es_final as estatus_es_final,
  -- Responsable
  c.responsable_id,
  resp.nombre_completo as responsable_nombre,
  resp.email as responsable_email,
  -- Creador
  c.creado_por,
  creador.nombre_completo as creador_nombre,
  -- Ticket origen
  c.ticket_id as ticket_origen_id,
  t.folio as ticket_origen_folio,
  -- SLA
  c.sla_objetivo_minutos,
  c.tiempo_pausado_minutos,
  -- Cálculo del semáforo
  CASE
    WHEN e.es_final THEN 'gris'
    WHEN (EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - COALESCE(c.tiempo_pausado_minutos, 0)) < (c.sla_objetivo_minutos * 0.7) THEN 'verde'
    WHEN (EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - COALESCE(c.tiempo_pausado_minutos, 0)) <= c.sla_objetivo_minutos THEN 'amarillo'
    ELSE 'rojo'
  END as semaforo,
  -- Cumplimiento de compromiso
  CASE
    WHEN c.fecha_resolucion IS NOT NULL AND c.fecha_compromiso IS NOT NULL THEN
      CASE WHEN c.fecha_resolucion::date <= c.fecha_compromiso THEN true ELSE false END
    ELSE NULL
  END as cumplimiento_compromiso,
  -- Horas de resolución
  CASE
    WHEN c.fecha_resolucion IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (c.fecha_resolucion - c.fecha_creacion)) / 3600, 2)
    ELSE NULL
  END as horas_resolucion,
  -- Días para compromiso
  CASE
    WHEN c.fecha_compromiso IS NOT NULL THEN
      (c.fecha_compromiso - CURRENT_DATE)
    ELSE NULL
  END as dias_para_compromiso,
  -- Extracciones de fecha
  EXTRACT(YEAR FROM c.fecha_creacion) as anio,
  EXTRACT(MONTH FROM c.fecha_creacion) as mes,
  TO_CHAR(c.fecha_creacion, 'YYYY-MM') as periodo_mes,
  DATE(c.fecha_creacion) as fecha_dia
FROM casos c
LEFT JOIN clientes cli ON c.cliente_id = cli.id
LEFT JOIN estatus_casos e ON c.estatus_id = e.id
LEFT JOIN profiles resp ON c.responsable_id = resp.id
LEFT JOIN profiles creador ON c.creado_por = creador.id
LEFT JOIN tickets t ON c.ticket_id = t.id;

-- ============================================================================
-- FUNCIONES DE AGREGACIÓN PARA REPORTES
-- ============================================================================

-- Función: Obtener resumen de tickets por período
CREATE OR REPLACE FUNCTION get_reporte_tickets_resumen(
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL,
  p_responsable_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_where TEXT := 'WHERE 1=1';
BEGIN
  -- Construir filtros
  IF p_fecha_inicio IS NOT NULL THEN
    v_where := v_where || ' AND fecha_dia >= ''' || p_fecha_inicio || '''';
  END IF;
  IF p_fecha_fin IS NOT NULL THEN
    v_where := v_where || ' AND fecha_dia <= ''' || p_fecha_fin || '''';
  END IF;
  IF p_cliente_id IS NOT NULL THEN
    v_where := v_where || ' AND cliente_id = ''' || p_cliente_id || '''';
  END IF;
  IF p_categoria_id IS NOT NULL THEN
    v_where := v_where || ' AND categoria_id = ''' || p_categoria_id || '''';
  END IF;
  IF p_responsable_id IS NOT NULL THEN
    v_where := v_where || ' AND responsable_id = ''' || p_responsable_id || '''';
  END IF;

  EXECUTE format('
    SELECT json_build_object(
      ''total'', COUNT(*),
      ''abiertos'', COUNT(*) FILTER (WHERE NOT estatus_es_final),
      ''cerrados'', COUNT(*) FILTER (WHERE estatus_es_final),
      ''por_prioridad'', (
        SELECT json_agg(json_build_object(''prioridad'', prioridad, ''total'', cnt))
        FROM (SELECT prioridad, COUNT(*) as cnt FROM v_reporte_tickets %s GROUP BY prioridad) sub
      ),
      ''por_categoria'', (
        SELECT json_agg(json_build_object(''categoria'', categoria_nombre, ''total'', cnt))
        FROM (SELECT categoria_nombre, COUNT(*) as cnt FROM v_reporte_tickets %s GROUP BY categoria_nombre ORDER BY cnt DESC LIMIT 10) sub
      ),
      ''por_estatus'', (
        SELECT json_agg(json_build_object(''estatus'', estatus_nombre, ''total'', cnt))
        FROM (SELECT estatus_nombre, COUNT(*) as cnt FROM v_reporte_tickets %s GROUP BY estatus_nombre) sub
      ),
      ''tiempo_promedio_respuesta_hrs'', ROUND(AVG(horas_respuesta)::numeric, 2),
      ''tiempo_promedio_resolucion_hrs'', ROUND(AVG(horas_resolucion)::numeric, 2),
      ''cumplimiento_sla_pct'', ROUND(
        (COUNT(*) FILTER (WHERE sla_cumplido = true)::numeric /
         NULLIF(COUNT(*) FILTER (WHERE sla_cumplido IS NOT NULL), 0) * 100)::numeric, 1
      ),
      ''semaforo_verde'', COUNT(*) FILTER (WHERE semaforo = ''verde''),
      ''semaforo_amarillo'', COUNT(*) FILTER (WHERE semaforo = ''amarillo''),
      ''semaforo_rojo'', COUNT(*) FILTER (WHERE semaforo = ''rojo'')
    )
    FROM v_reporte_tickets %s
  ', v_where, v_where, v_where, v_where) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener tendencia de tickets por mes
CREATE OR REPLACE FUNCTION get_tickets_tendencia_mensual(
  p_meses INTEGER DEFAULT 12,
  p_cliente_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        periodo_mes,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estatus_es_final) as cerrados,
        COUNT(*) FILTER (WHERE NOT estatus_es_final) as abiertos
      FROM v_reporte_tickets
      WHERE fecha_dia >= (CURRENT_DATE - (p_meses || ' months')::interval)
        AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
      GROUP BY periodo_mes
      ORDER BY periodo_mes
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener productividad por usuario
CREATE OR REPLACE FUNCTION get_productividad_usuarios(
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        responsable_id,
        responsable_nombre,
        COUNT(*) as tickets_asignados,
        COUNT(*) FILTER (WHERE estatus_es_final) as tickets_cerrados,
        ROUND(AVG(horas_respuesta)::numeric, 2) as promedio_horas_respuesta,
        ROUND(AVG(horas_resolucion)::numeric, 2) as promedio_horas_resolucion,
        ROUND(
          (COUNT(*) FILTER (WHERE sla_cumplido = true)::numeric /
           NULLIF(COUNT(*) FILTER (WHERE sla_cumplido IS NOT NULL), 0) * 100)::numeric, 1
        ) as cumplimiento_sla_pct
      FROM v_reporte_tickets
      WHERE responsable_id IS NOT NULL
        AND (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
      GROUP BY responsable_id, responsable_nombre
      ORDER BY tickets_cerrados DESC
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener resumen de casos
CREATE OR REPLACE FUNCTION get_reporte_casos_resumen(
  p_fecha_inicio DATE DEFAULT NULL,
  p_fecha_fin DATE DEFAULT NULL,
  p_cliente_id UUID DEFAULT NULL,
  p_area_destino TEXT DEFAULT NULL,
  p_responsable_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*),
    'abiertos', COUNT(*) FILTER (WHERE NOT estatus_es_final),
    'cerrados', COUNT(*) FILTER (WHERE estatus_es_final),
    'por_area', (
      SELECT json_agg(json_build_object('area', area_destino, 'total', cnt))
      FROM (
        SELECT area_destino, COUNT(*) as cnt
        FROM v_reporte_casos
        WHERE (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
          AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
          AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
        GROUP BY area_destino
        ORDER BY cnt DESC
      ) sub
    ),
    'por_motivo', (
      SELECT json_agg(json_build_object('motivo', motivo, 'total', cnt))
      FROM (
        SELECT motivo, COUNT(*) as cnt
        FROM v_reporte_casos
        WHERE (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
          AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
          AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
        GROUP BY motivo
        ORDER BY cnt DESC
        LIMIT 10
      ) sub
    ),
    'por_estatus', (
      SELECT json_agg(json_build_object('estatus', estatus_nombre, 'total', cnt))
      FROM (
        SELECT estatus_nombre, COUNT(*) as cnt
        FROM v_reporte_casos
        WHERE (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
          AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
          AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
        GROUP BY estatus_nombre
      ) sub
    ),
    'tiempo_promedio_resolucion_hrs', (
      SELECT ROUND(AVG(horas_resolucion)::numeric, 2)
      FROM v_reporte_casos
      WHERE (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
        AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
    ),
    'cumplimiento_compromiso_pct', (
      SELECT ROUND(
        (COUNT(*) FILTER (WHERE cumplimiento_compromiso = true)::numeric /
         NULLIF(COUNT(*) FILTER (WHERE cumplimiento_compromiso IS NOT NULL), 0) * 100)::numeric, 1
      )
      FROM v_reporte_casos
      WHERE (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
        AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
    ),
    'semaforo_verde', (
      SELECT COUNT(*) FROM v_reporte_casos
      WHERE semaforo = 'verde'
        AND (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
        AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
    ),
    'semaforo_amarillo', (
      SELECT COUNT(*) FROM v_reporte_casos
      WHERE semaforo = 'amarillo'
        AND (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
        AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
    ),
    'semaforo_rojo', (
      SELECT COUNT(*) FROM v_reporte_casos
      WHERE semaforo = 'rojo'
        AND (p_fecha_inicio IS NULL OR fecha_dia >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR fecha_dia <= p_fecha_fin)
        AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Tendencia de casos por mes
CREATE OR REPLACE FUNCTION get_casos_tendencia_mensual(
  p_meses INTEGER DEFAULT 12,
  p_cliente_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(t))
    FROM (
      SELECT
        periodo_mes,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE estatus_es_final) as cerrados,
        COUNT(*) FILTER (WHERE NOT estatus_es_final) as abiertos
      FROM v_reporte_casos
      WHERE fecha_dia >= (CURRENT_DATE - (p_meses || ' months')::interval)
        AND (p_cliente_id IS NULL OR cliente_id = p_cliente_id)
      GROUP BY periodo_mes
      ORDER BY periodo_mes
    ) t
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE REPORTES
-- ============================================================================

-- Índices en tickets para reportes (solo crear si no existen)
CREATE INDEX IF NOT EXISTS idx_tickets_reporte_fecha ON tickets(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_tickets_reporte_cierre ON tickets(fecha_cierre);
CREATE INDEX IF NOT EXISTS idx_tickets_reporte_cliente_fecha ON tickets(cliente_id, fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_tickets_reporte_categoria_fecha ON tickets(categoria_id, fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_tickets_reporte_responsable_fecha ON tickets(responsable_id, fecha_creacion);

-- Índices en casos para reportes (solo crear si no existen)
CREATE INDEX IF NOT EXISTS idx_casos_reporte_fecha ON casos(fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_casos_reporte_resolucion ON casos(fecha_resolucion);
CREATE INDEX IF NOT EXISTS idx_casos_reporte_cliente_fecha ON casos(cliente_id, fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_casos_reporte_responsable_fecha ON casos(responsable_id, fecha_creacion);

-- ============================================================================
-- COMENTARIOS
-- ============================================================================

COMMENT ON VIEW v_reporte_tickets IS 'Vista completa de tickets para generación de reportes con cálculos de SLA';
COMMENT ON VIEW v_reporte_casos IS 'Vista completa de casos para generación de reportes con cálculos de compromiso';
COMMENT ON FUNCTION get_reporte_tickets_resumen IS 'Obtiene resumen agregado de tickets con filtros opcionales';
COMMENT ON FUNCTION get_reporte_casos_resumen IS 'Obtiene resumen agregado de casos con filtros opcionales';
COMMENT ON FUNCTION get_tickets_tendencia_mensual IS 'Obtiene tendencia mensual de tickets para gráficas';
COMMENT ON FUNCTION get_casos_tendencia_mensual IS 'Obtiene tendencia mensual de casos para gráficas';
COMMENT ON FUNCTION get_productividad_usuarios IS 'Obtiene métricas de productividad por usuario/técnico';
