-- ============================================================================
-- Migration: Make cliente_id Optional in Tickets
-- ============================================================================
-- Temporalmente hace cliente_id opcional hasta que el módulo de clientes esté listo
-- ============================================================================

-- 1. Hacer cliente_id opcional
ALTER TABLE tickets ALTER COLUMN cliente_id DROP NOT NULL;

-- 2. Insertar cliente de prueba si no existe (usando la estructura existente de clientes)
INSERT INTO clientes (id, razon_social, nombre_comercial, rfc, estatus)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Cliente General',
  'Cliente de Prueba',
  'XAXX010101000',
  'Activo'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Actualizar la vista v_tickets_con_sla para manejar cliente NULL
DROP VIEW IF EXISTS v_tickets_con_sla;

CREATE OR REPLACE VIEW v_tickets_con_sla AS
SELECT
  t.*,
  -- Datos del cliente
  c.razon_social as cliente_nombre,
  c.nombre_comercial as cliente_nombre_comercial,
  s.nombre as sucursal_nombre,
  -- Datos de categoría
  cat.nombre as categoria_nombre,
  cat.color as categoria_color,
  cat.icono as categoria_icono,
  -- Datos de estatus
  et.nombre as estatus_nombre,
  et.color as estatus_color,
  et.es_final as estatus_es_final,
  et.pausa_sla as estatus_pausa_sla,
  -- Datos de responsable
  resp.nombre_completo as responsable_nombre,
  resp.avatar_url as responsable_avatar,
  -- Datos del creador
  creador.nombre_completo as creador_nombre,
  -- Datos del equipo
  eq.nombre as equipo_nombre,
  -- Cálculos de SLA
  CASE
    WHEN et.es_final THEN 0
    WHEN et.pausa_sla THEN
      EXTRACT(EPOCH FROM (
        (SELECT MAX(created_at) FROM ticket_bitacora
         WHERE ticket_id = t.id AND tipo = 'cambio_estatus'
         AND mensaje LIKE '%pausado%')
        - t.fecha_creacion
      ))/60 - t.tiempo_pausado_minutos
    ELSE
      EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos
  END as minutos_transcurridos,
  -- Semáforo
  CASE
    WHEN et.es_final THEN 'gris'
    WHEN et.pausa_sla THEN 'azul'
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) < (t.sla_objetivo_minutos * 0.7) THEN 'verde'
    WHEN (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) <= t.sla_objetivo_minutos THEN 'amarillo'
    ELSE 'rojo'
  END as semaforo,
  -- Porcentaje SLA
  CASE
    WHEN t.sla_objetivo_minutos = 0 THEN 0
    ELSE ROUND(
      ((EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos) / t.sla_objetivo_minutos * 100)::NUMERIC,
      2
    )
  END as porcentaje_sla,
  -- Minutos restantes
  CASE
    WHEN et.es_final THEN 0
    ELSE GREATEST(0, t.sla_objetivo_minutos - (EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/60 - t.tiempo_pausado_minutos))
  END as minutos_restantes
FROM tickets t
LEFT JOIN clientes c ON t.cliente_id = c.id
LEFT JOIN sucursales s ON t.sucursal_id = s.id
LEFT JOIN categorias_servicio cat ON t.categoria_id = cat.id
LEFT JOIN estatus_tickets et ON t.estatus_id = et.id
LEFT JOIN profiles resp ON t.responsable_id = resp.id
LEFT JOIN profiles creador ON t.creado_por = creador.id
LEFT JOIN equipos eq ON t.equipo_id = eq.id;

-- 4. Dar permisos a la vista
GRANT SELECT ON v_tickets_con_sla TO authenticated;
