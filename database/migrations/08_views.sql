-- ============================================================================
-- 08. VISTAS ÚTILES
-- ============================================================================
-- Descripción: Crea vistas para consultas complejas y reportes
-- ============================================================================

-- Vista para tickets con información completa
CREATE OR REPLACE VIEW public.tickets_completos AS
SELECT
  t.*,
  c.razon_social as cliente_nombre,
  c.rfc as cliente_rfc,
  s.nombre as sucursal_nombre,
  cat.nombre as categoria_nombre,
  cat.color as categoria_color,
  est.nombre as estatus_nombre,
  est.color as estatus_color,
  resp.nombre_completo as responsable_nombre,
  resp.email as responsable_email,
  creador.nombre_completo as creador_nombre,
  -- Cálculo de tiempo transcurrido en minutos
  EXTRACT(EPOCH FROM (COALESCE(t.fecha_cierre, NOW()) - t.fecha_creacion)) / 60 as tiempo_total_minutos,
  -- Porcentaje de SLA usado
  ((EXTRACT(EPOCH FROM (COALESCE(t.fecha_cierre, NOW()) - t.fecha_creacion)) / 60) / t.sla_objetivo_minutos * 100) as porcentaje_sla
FROM public.tickets t
LEFT JOIN public.clientes c ON t.cliente_id = c.id
LEFT JOIN public.sucursales s ON t.sucursal_id = s.id
LEFT JOIN public.categorias_servicio cat ON t.categoria_id = cat.id
LEFT JOIN public.estatus_tickets est ON t.estatus_id = est.id
LEFT JOIN public.profiles resp ON t.responsable_id = resp.id
LEFT JOIN public.profiles creador ON t.creado_por = creador.id;

-- Verificación
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name = 'tickets_completos';

SELECT 'Vista tickets_completos creada exitosamente' as info;
