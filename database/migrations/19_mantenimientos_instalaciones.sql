-- ============================================================================
-- 19. SISTEMA DE MANTENIMIENTOS E INSTALACIONES
-- ============================================================================
-- Fase 5: Mantenimientos con calendario/checklist e Instalaciones con pipeline
-- Incluye: Checklist dinámico, evidencias, firma digital, folios automáticos
-- ============================================================================

-- ============================================================================
-- 1. CATÁLOGOS BASE
-- ============================================================================

-- Tipos de mantenimiento
CREATE TABLE IF NOT EXISTS public.tipos_mantenimiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  requiere_checklist BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#6c757d',
  icono TEXT DEFAULT 'feather icon-tool',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar tipos de mantenimiento por defecto
INSERT INTO tipos_mantenimiento (nombre, descripcion, color, icono) VALUES
  ('Preventivo', 'Mantenimiento preventivo programado', '#28a745', 'feather icon-shield'),
  ('Correctivo', 'Mantenimiento correctivo por falla', '#dc3545', 'feather icon-alert-triangle'),
  ('Actualización', 'Actualización de software', '#17a2b8', 'feather icon-refresh-cw'),
  ('Capacitación', 'Capacitación al personal', '#6f42c1', 'feather icon-book-open'),
  ('Revisión', 'Revisión general del sistema', '#fd7e14', 'feather icon-eye')
ON CONFLICT (nombre) DO NOTHING;

-- Estatus de mantenimientos
CREATE TABLE IF NOT EXISTS public.estatus_mantenimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  color TEXT DEFAULT '#6c757d',
  orden INTEGER DEFAULT 0,
  es_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar estatus de mantenimiento por defecto
INSERT INTO estatus_mantenimientos (nombre, descripcion, color, orden, es_final) VALUES
  ('Programado', 'Mantenimiento programado pendiente', '#17a2b8', 1, false),
  ('En proceso', 'Mantenimiento en ejecución', '#ffc107', 2, false),
  ('Completado', 'Mantenimiento finalizado exitosamente', '#28a745', 3, true),
  ('Cancelado', 'Mantenimiento cancelado', '#6c757d', 4, true)
ON CONFLICT (nombre) DO NOTHING;

-- Estatus de instalaciones
CREATE TABLE IF NOT EXISTS public.estatus_instalaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  color TEXT DEFAULT '#6c757d',
  orden INTEGER DEFAULT 0,
  es_final BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar estatus de instalación por defecto
INSERT INTO estatus_instalaciones (nombre, descripcion, color, orden, es_final) VALUES
  ('Programada', 'Instalación programada pendiente', '#17a2b8', 1, false),
  ('En proceso', 'Instalación en ejecución', '#ffc107', 2, false),
  ('Pendientes', 'Instalación con pendientes por resolver', '#fd7e14', 3, false),
  ('Cerrada', 'Instalación finalizada', '#28a745', 4, true)
ON CONFLICT (nombre) DO NOTHING;

-- Módulos del sistema (productos instalables)
CREATE TABLE IF NOT EXISTS public.modulos_sistema (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  version_actual TEXT,
  requiere_capacitacion BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar módulos del sistema por defecto
INSERT INTO modulos_sistema (nombre, descripcion, orden) VALUES
  ('Volumétrico A30', 'Sistema de control volumétrico A30', 1),
  ('POS Gasolinera', 'Punto de venta para gasolineras', 2),
  ('Facturación Electrónica', 'Módulo de facturación CFDI', 3),
  ('Control de Inventarios', 'Gestión de inventarios', 4),
  ('Reportes CRE', 'Generación de reportes para CRE', 5),
  ('Dashboard Gerencial', 'Panel de control gerencial', 6),
  ('App Móvil', 'Aplicación móvil de consultas', 7),
  ('Integración Contable', 'Integración con sistemas contables', 8)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- 2. TEMPLATES DE CHECKLIST
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('mantenimiento', 'instalacion')),
  tipo_mantenimiento_id UUID REFERENCES tipos_mantenimiento(id) ON DELETE SET NULL,
  modulo_id UUID REFERENCES modulos_sistema(id) ON DELETE SET NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.checklist_items_template (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES checklist_templates(id) ON DELETE CASCADE NOT NULL,
  descripcion TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  obligatorio BOOLEAN DEFAULT true,
  requiere_evidencia BOOLEAN DEFAULT false,
  requiere_notas BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar templates de checklist por defecto para mantenimiento preventivo
DO $$
DECLARE
  v_template_id UUID;
  v_tipo_preventivo_id UUID;
BEGIN
  SELECT id INTO v_tipo_preventivo_id FROM tipos_mantenimiento WHERE nombre = 'Preventivo';

  IF v_tipo_preventivo_id IS NOT NULL THEN
    INSERT INTO checklist_templates (nombre, tipo, tipo_mantenimiento_id, descripcion)
    VALUES ('Checklist Mantenimiento Preventivo', 'mantenimiento', v_tipo_preventivo_id, 'Checklist estándar para mantenimiento preventivo')
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_template_id;

    IF v_template_id IS NOT NULL THEN
      INSERT INTO checklist_items_template (template_id, descripcion, orden, obligatorio, requiere_evidencia) VALUES
        (v_template_id, 'Verificar conexión de red', 1, true, false),
        (v_template_id, 'Verificar funcionamiento de dispensarios', 2, true, true),
        (v_template_id, 'Revisar configuración de precios', 3, true, false),
        (v_template_id, 'Verificar impresora de tickets', 4, true, false),
        (v_template_id, 'Revisar respaldos de base de datos', 5, true, false),
        (v_template_id, 'Verificar comunicación con SAT', 6, true, false),
        (v_template_id, 'Revisar logs de errores', 7, false, false),
        (v_template_id, 'Limpiar archivos temporales', 8, false, false),
        (v_template_id, 'Verificar licencias activas', 9, true, true),
        (v_template_id, 'Capacitar sobre nuevas funcionalidades', 10, false, false);
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. TABLA PRINCIPAL DE MANTENIMIENTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mantenimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE,

  -- Relaciones
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  tipo_mantenimiento_id UUID REFERENCES tipos_mantenimiento(id) ON DELETE SET NULL NOT NULL,
  estatus_id UUID REFERENCES estatus_mantenimientos(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  template_checklist_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,

  -- Fechas
  fecha_programada DATE NOT NULL,
  hora_programada TIME,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,

  -- Resultado
  resultado TEXT CHECK (resultado IN ('Completado', 'Parcial', 'Requiere acción', 'No realizado')),
  observaciones TEXT,
  recomendaciones TEXT,

  -- Ticket generado (si requiere acción)
  ticket_generado_id UUID REFERENCES tickets(id) ON DELETE SET NULL,

  -- Metadatos
  contacto_cliente TEXT,
  telefono_contacto TEXT,
  notas_internas TEXT,

  -- Auditoría
  creado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mantenimientos_cliente ON mantenimientos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_fecha ON mantenimientos(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_tecnico ON mantenimientos(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_estatus ON mantenimientos(estatus_id);
CREATE INDEX IF NOT EXISTS idx_mantenimientos_folio ON mantenimientos(folio);

-- ============================================================================
-- 4. CHECKLIST EJECUTADO DE MANTENIMIENTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mantenimiento_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mantenimiento_id UUID REFERENCES mantenimientos(id) ON DELETE CASCADE NOT NULL,
  item_template_id UUID REFERENCES checklist_items_template(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  obligatorio BOOLEAN DEFAULT true,

  -- Ejecución
  completado BOOLEAN DEFAULT false,
  completado_por UUID REFERENCES profiles(id),
  completado_at TIMESTAMPTZ,
  notas TEXT,

  -- Evidencia
  requiere_evidencia BOOLEAN DEFAULT false,
  tiene_evidencia BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mtn_checklist_mantenimiento ON mantenimiento_checklist(mantenimiento_id);

-- ============================================================================
-- 5. EVIDENCIAS DE MANTENIMIENTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.mantenimiento_evidencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mantenimiento_id UUID REFERENCES mantenimientos(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id UUID REFERENCES mantenimiento_checklist(id) ON DELETE SET NULL,

  tipo TEXT NOT NULL CHECK (tipo IN ('foto', 'documento', 'video', 'otro')),
  nombre_archivo TEXT NOT NULL,
  ruta_storage TEXT NOT NULL,
  tipo_archivo TEXT,
  tamanio_bytes INTEGER,
  descripcion TEXT,

  subido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mtn_evidencias_mantenimiento ON mantenimiento_evidencias(mantenimiento_id);

-- ============================================================================
-- 6. TABLA PRINCIPAL DE INSTALACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instalaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE,

  -- Relaciones
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  estatus_id UUID REFERENCES estatus_instalaciones(id) ON DELETE SET NULL,
  tecnico_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Fechas
  fecha_programada DATE NOT NULL,
  hora_programada TIME,
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,

  -- Contacto del cliente
  contacto_cliente TEXT,
  telefono_contacto TEXT,
  email_contacto TEXT,

  -- Firma del cliente
  firma_cliente_url TEXT,
  nombre_firmante TEXT,
  puesto_firmante TEXT,
  firmado_at TIMESTAMPTZ,

  -- Observaciones
  observaciones TEXT,
  notas_internas TEXT,

  -- Auditoría
  creado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instalaciones_cliente ON instalaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_fecha ON instalaciones(fecha_programada);
CREATE INDEX IF NOT EXISTS idx_instalaciones_tecnico ON instalaciones(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_estatus ON instalaciones(estatus_id);
CREATE INDEX IF NOT EXISTS idx_instalaciones_folio ON instalaciones(folio);

-- ============================================================================
-- 7. RELACIÓN INSTALACIONES - MÓDULOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instalacion_modulos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instalacion_id UUID REFERENCES instalaciones(id) ON DELETE CASCADE NOT NULL,
  modulo_id UUID REFERENCES modulos_sistema(id) ON DELETE CASCADE NOT NULL,
  version_instalada TEXT,
  configuracion_especial TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(instalacion_id, modulo_id)
);

CREATE INDEX IF NOT EXISTS idx_inst_modulos_instalacion ON instalacion_modulos(instalacion_id);

-- ============================================================================
-- 8. CHECKLIST EJECUTADO DE INSTALACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instalacion_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instalacion_id UUID REFERENCES instalaciones(id) ON DELETE CASCADE NOT NULL,
  modulo_id UUID REFERENCES modulos_sistema(id) ON DELETE SET NULL,
  item_template_id UUID REFERENCES checklist_items_template(id) ON DELETE SET NULL,
  descripcion TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  obligatorio BOOLEAN DEFAULT true,

  -- Ejecución
  completado BOOLEAN DEFAULT false,
  completado_por UUID REFERENCES profiles(id),
  completado_at TIMESTAMPTZ,
  notas TEXT,

  -- Evidencia
  requiere_evidencia BOOLEAN DEFAULT false,
  tiene_evidencia BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_checklist_instalacion ON instalacion_checklist(instalacion_id);

-- ============================================================================
-- 9. PENDIENTES DE INSTALACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instalacion_pendientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instalacion_id UUID REFERENCES instalaciones(id) ON DELETE CASCADE NOT NULL,

  descripcion TEXT NOT NULL,
  prioridad TEXT DEFAULT 'Media' CHECK (prioridad IN ('Alta', 'Media', 'Baja')),
  responsable TEXT,
  fecha_compromiso DATE,

  -- Estado
  resuelto BOOLEAN DEFAULT false,
  resuelto_por UUID REFERENCES profiles(id),
  resuelto_at TIMESTAMPTZ,
  notas_resolucion TEXT,

  -- Ticket generado
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,

  creado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_pendientes_instalacion ON instalacion_pendientes(instalacion_id);
CREATE INDEX IF NOT EXISTS idx_inst_pendientes_resuelto ON instalacion_pendientes(resuelto);

-- ============================================================================
-- 10. EVIDENCIAS DE INSTALACIONES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.instalacion_evidencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instalacion_id UUID REFERENCES instalaciones(id) ON DELETE CASCADE NOT NULL,
  checklist_item_id UUID REFERENCES instalacion_checklist(id) ON DELETE SET NULL,

  tipo TEXT NOT NULL CHECK (tipo IN ('foto', 'documento', 'video', 'otro')),
  nombre_archivo TEXT NOT NULL,
  ruta_storage TEXT NOT NULL,
  tipo_archivo TEXT,
  tamanio_bytes INTEGER,
  descripcion TEXT,

  subido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inst_evidencias_instalacion ON instalacion_evidencias(instalacion_id);

-- ============================================================================
-- 11. FUNCIONES DE FOLIO AUTOMÁTICO
-- ============================================================================

-- Función para generar folio de mantenimiento MTN-YYYY-####
CREATE OR REPLACE FUNCTION generar_folio_mantenimiento()
RETURNS TEXT AS $$
DECLARE
  v_anio TEXT;
  v_numero INTEGER;
  v_folio TEXT;
BEGIN
  v_anio := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT SUBSTRING(folio FROM 'MTN-' || v_anio || '-(\d+)')::INTEGER INTO v_numero
  FROM mantenimientos
  WHERE folio LIKE 'MTN-' || v_anio || '-%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_numero IS NULL THEN
    v_numero := 1;
  ELSE
    v_numero := v_numero + 1;
  END IF;

  v_folio := 'MTN-' || v_anio || '-' || LPAD(v_numero::TEXT, 4, '0');
  RETURN v_folio;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar folio de mantenimiento
CREATE OR REPLACE FUNCTION asignar_folio_mantenimiento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := generar_folio_mantenimiento();
  END IF;

  -- Asignar estatus inicial si no tiene
  IF NEW.estatus_id IS NULL THEN
    SELECT id INTO NEW.estatus_id FROM estatus_mantenimientos WHERE nombre = 'Programado' LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_folio_mantenimiento ON mantenimientos;
CREATE TRIGGER trigger_asignar_folio_mantenimiento
  BEFORE INSERT ON mantenimientos
  FOR EACH ROW EXECUTE FUNCTION asignar_folio_mantenimiento();

-- Función para generar folio de instalación INS-YYYY-####
CREATE OR REPLACE FUNCTION generar_folio_instalacion()
RETURNS TEXT AS $$
DECLARE
  v_anio TEXT;
  v_numero INTEGER;
  v_folio TEXT;
BEGIN
  v_anio := EXTRACT(YEAR FROM NOW())::TEXT;

  SELECT SUBSTRING(folio FROM 'INS-' || v_anio || '-(\d+)')::INTEGER INTO v_numero
  FROM instalaciones
  WHERE folio LIKE 'INS-' || v_anio || '-%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_numero IS NULL THEN
    v_numero := 1;
  ELSE
    v_numero := v_numero + 1;
  END IF;

  v_folio := 'INS-' || v_anio || '-' || LPAD(v_numero::TEXT, 4, '0');
  RETURN v_folio;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar folio de instalación
CREATE OR REPLACE FUNCTION asignar_folio_instalacion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL OR NEW.folio = '' THEN
    NEW.folio := generar_folio_instalacion();
  END IF;

  -- Asignar estatus inicial si no tiene
  IF NEW.estatus_id IS NULL THEN
    SELECT id INTO NEW.estatus_id FROM estatus_instalaciones WHERE nombre = 'Programada' LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asignar_folio_instalacion ON instalaciones;
CREATE TRIGGER trigger_asignar_folio_instalacion
  BEFORE INSERT ON instalaciones
  FOR EACH ROW EXECUTE FUNCTION asignar_folio_instalacion();

-- ============================================================================
-- 12. FUNCIONES PARA GENERAR TICKETS
-- ============================================================================

-- Generar ticket desde mantenimiento que "Requiere acción"
CREATE OR REPLACE FUNCTION generar_ticket_desde_mantenimiento(p_mantenimiento_id UUID)
RETURNS UUID AS $$
DECLARE
  v_mantenimiento RECORD;
  v_ticket_id UUID;
  v_categoria_id UUID;
  v_estatus_id UUID;
BEGIN
  SELECT m.*, c.razon_social as cliente_nombre
  INTO v_mantenimiento
  FROM mantenimientos m
  JOIN clientes c ON m.cliente_id = c.id
  WHERE m.id = p_mantenimiento_id;

  IF v_mantenimiento IS NULL THEN
    RAISE EXCEPTION 'Mantenimiento no encontrado';
  END IF;

  -- Obtener categoría por defecto
  SELECT id INTO v_categoria_id FROM categorias_servicio WHERE nombre = 'Otros' LIMIT 1;

  -- Obtener estatus "Nuevo"
  SELECT id INTO v_estatus_id FROM estatus_tickets WHERE nombre = 'Nuevo' LIMIT 1;

  INSERT INTO tickets (
    cliente_id,
    sucursal_id,
    categoria_id,
    prioridad,
    canal,
    responsable_id,
    titulo,
    descripcion,
    estatus_id,
    sla_objetivo_minutos,
    creado_por
  ) VALUES (
    v_mantenimiento.cliente_id,
    v_mantenimiento.sucursal_id,
    v_categoria_id,
    'Media',
    'Portal',
    v_mantenimiento.tecnico_id,
    'Seguimiento de mantenimiento ' || v_mantenimiento.folio,
    'Ticket generado desde mantenimiento ' || v_mantenimiento.folio || E'\n\nObservaciones: ' || COALESCE(v_mantenimiento.observaciones, 'Sin observaciones') || E'\n\nRecomendaciones: ' || COALESCE(v_mantenimiento.recomendaciones, 'Sin recomendaciones'),
    v_estatus_id,
    240,
    v_mantenimiento.tecnico_id
  ) RETURNING id INTO v_ticket_id;

  -- Actualizar mantenimiento con referencia al ticket
  UPDATE mantenimientos SET ticket_generado_id = v_ticket_id WHERE id = p_mantenimiento_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generar ticket desde pendiente de instalación
CREATE OR REPLACE FUNCTION generar_ticket_desde_pendiente(p_pendiente_id UUID)
RETURNS UUID AS $$
DECLARE
  v_pendiente RECORD;
  v_instalacion RECORD;
  v_ticket_id UUID;
  v_categoria_id UUID;
  v_estatus_id UUID;
BEGIN
  SELECT ip.*, i.cliente_id, i.sucursal_id, i.tecnico_id, i.folio as instalacion_folio
  INTO v_pendiente
  FROM instalacion_pendientes ip
  JOIN instalaciones i ON ip.instalacion_id = i.id
  WHERE ip.id = p_pendiente_id;

  IF v_pendiente IS NULL THEN
    RAISE EXCEPTION 'Pendiente no encontrado';
  END IF;

  -- Obtener categoría por defecto
  SELECT id INTO v_categoria_id FROM categorias_servicio WHERE nombre = 'Otros' LIMIT 1;

  -- Obtener estatus "Nuevo"
  SELECT id INTO v_estatus_id FROM estatus_tickets WHERE nombre = 'Nuevo' LIMIT 1;

  INSERT INTO tickets (
    cliente_id,
    sucursal_id,
    categoria_id,
    prioridad,
    canal,
    responsable_id,
    titulo,
    descripcion,
    estatus_id,
    sla_objetivo_minutos,
    creado_por
  ) VALUES (
    v_pendiente.cliente_id,
    v_pendiente.sucursal_id,
    v_categoria_id,
    CASE v_pendiente.prioridad WHEN 'Alta' THEN 'Alta' WHEN 'Media' THEN 'Media' ELSE 'Baja' END,
    'Portal',
    v_pendiente.tecnico_id,
    'Pendiente de instalación ' || v_pendiente.instalacion_folio,
    'Ticket generado desde pendiente de instalación ' || v_pendiente.instalacion_folio || E'\n\nDescripción: ' || v_pendiente.descripcion,
    v_estatus_id,
    CASE v_pendiente.prioridad WHEN 'Alta' THEN 120 WHEN 'Media' THEN 240 ELSE 480 END,
    v_pendiente.tecnico_id
  ) RETURNING id INTO v_ticket_id;

  -- Actualizar pendiente con referencia al ticket
  UPDATE instalacion_pendientes SET ticket_id = v_ticket_id WHERE id = p_pendiente_id;

  RETURN v_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. VISTAS COMPLETAS
-- ============================================================================

CREATE OR REPLACE VIEW v_mantenimientos_completo AS
SELECT
  m.*,
  c.razon_social as cliente_nombre,
  c.nombre_comercial as cliente_nombre_comercial,
  s.nombre as sucursal_nombre,
  tm.nombre as tipo_mantenimiento_nombre,
  tm.color as tipo_mantenimiento_color,
  tm.icono as tipo_mantenimiento_icono,
  em.nombre as estatus_nombre,
  em.color as estatus_color,
  em.es_final as estatus_es_final,
  p.nombre_completo as tecnico_nombre,
  p.avatar_url as tecnico_avatar,
  pc.nombre_completo as creador_nombre,

  -- Conteo de checklist
  (SELECT COUNT(*) FROM mantenimiento_checklist WHERE mantenimiento_id = m.id) as checklist_total,
  (SELECT COUNT(*) FROM mantenimiento_checklist WHERE mantenimiento_id = m.id AND completado = true) as checklist_completados,

  -- Conteo de evidencias
  (SELECT COUNT(*) FROM mantenimiento_evidencias WHERE mantenimiento_id = m.id) as total_evidencias

FROM mantenimientos m
LEFT JOIN clientes c ON m.cliente_id = c.id
LEFT JOIN sucursales s ON m.sucursal_id = s.id
LEFT JOIN tipos_mantenimiento tm ON m.tipo_mantenimiento_id = tm.id
LEFT JOIN estatus_mantenimientos em ON m.estatus_id = em.id
LEFT JOIN profiles p ON m.tecnico_id = p.id
LEFT JOIN profiles pc ON m.creado_por = pc.id;

CREATE OR REPLACE VIEW v_instalaciones_completo AS
SELECT
  i.*,
  c.razon_social as cliente_nombre,
  c.nombre_comercial as cliente_nombre_comercial,
  s.nombre as sucursal_nombre,
  ei.nombre as estatus_nombre,
  ei.color as estatus_color,
  ei.es_final as estatus_es_final,
  p.nombre_completo as tecnico_nombre,
  p.avatar_url as tecnico_avatar,
  pc.nombre_completo as creador_nombre,

  -- Módulos instalados
  (SELECT COUNT(*) FROM instalacion_modulos WHERE instalacion_id = i.id) as total_modulos,

  -- Conteo de checklist
  (SELECT COUNT(*) FROM instalacion_checklist WHERE instalacion_id = i.id) as checklist_total,
  (SELECT COUNT(*) FROM instalacion_checklist WHERE instalacion_id = i.id AND completado = true) as checklist_completados,

  -- Conteo de pendientes
  (SELECT COUNT(*) FROM instalacion_pendientes WHERE instalacion_id = i.id) as total_pendientes,
  (SELECT COUNT(*) FROM instalacion_pendientes WHERE instalacion_id = i.id AND resuelto = false) as pendientes_abiertos,

  -- Conteo de evidencias
  (SELECT COUNT(*) FROM instalacion_evidencias WHERE instalacion_id = i.id) as total_evidencias,

  -- Tiene firma
  (i.firma_cliente_url IS NOT NULL) as tiene_firma

FROM instalaciones i
LEFT JOIN clientes c ON i.cliente_id = c.id
LEFT JOIN sucursales s ON i.sucursal_id = s.id
LEFT JOIN estatus_instalaciones ei ON i.estatus_id = ei.id
LEFT JOIN profiles p ON i.tecnico_id = p.id
LEFT JOIN profiles pc ON i.creado_por = pc.id;

-- ============================================================================
-- 14. FUNCIÓN PARA OBTENER MANTENIMIENTOS POR MES (CALENDARIO)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_mantenimientos_por_mes(p_mes INTEGER, p_anio INTEGER)
RETURNS TABLE (
  id UUID,
  folio TEXT,
  fecha_programada DATE,
  cliente_nombre TEXT,
  tipo_mantenimiento_nombre TEXT,
  tipo_mantenimiento_color TEXT,
  estatus_nombre TEXT,
  estatus_color TEXT,
  tecnico_nombre TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.folio,
    m.fecha_programada,
    c.razon_social as cliente_nombre,
    tm.nombre as tipo_mantenimiento_nombre,
    tm.color as tipo_mantenimiento_color,
    em.nombre as estatus_nombre,
    em.color as estatus_color,
    p.nombre_completo as tecnico_nombre
  FROM mantenimientos m
  LEFT JOIN clientes c ON m.cliente_id = c.id
  LEFT JOIN tipos_mantenimiento tm ON m.tipo_mantenimiento_id = tm.id
  LEFT JOIN estatus_mantenimientos em ON m.estatus_id = em.id
  LEFT JOIN profiles p ON m.tecnico_id = p.id
  WHERE EXTRACT(MONTH FROM m.fecha_programada) = p_mes
    AND EXTRACT(YEAR FROM m.fecha_programada) = p_anio
  ORDER BY m.fecha_programada, m.hora_programada;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 15. FUNCIÓN PARA OBTENER INSTALACIONES POR ESTATUS (PIPELINE)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_instalaciones_por_estatus()
RETURNS TABLE (
  estatus_id UUID,
  estatus_nombre TEXT,
  estatus_color TEXT,
  estatus_orden INTEGER,
  total BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ei.id as estatus_id,
    ei.nombre as estatus_nombre,
    ei.color as estatus_color,
    ei.orden as estatus_orden,
    COUNT(i.id) as total
  FROM estatus_instalaciones ei
  LEFT JOIN instalaciones i ON i.estatus_id = ei.id
  GROUP BY ei.id, ei.nombre, ei.color, ei.orden
  ORDER BY ei.orden;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 16. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE tipos_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatus_mantenimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE estatus_instalaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimiento_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimiento_evidencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalacion_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalacion_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalacion_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE instalacion_evidencias ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para catálogos (todos pueden leer)
CREATE POLICY "Leer tipos mantenimiento" ON tipos_mantenimiento FOR SELECT USING (true);
CREATE POLICY "Leer estatus mantenimientos" ON estatus_mantenimientos FOR SELECT USING (true);
CREATE POLICY "Leer estatus instalaciones" ON estatus_instalaciones FOR SELECT USING (true);
CREATE POLICY "Leer modulos sistema" ON modulos_sistema FOR SELECT USING (true);
CREATE POLICY "Leer checklist templates" ON checklist_templates FOR SELECT USING (true);
CREATE POLICY "Leer checklist items template" ON checklist_items_template FOR SELECT USING (true);

-- Políticas para mantenimientos
CREATE POLICY "Admins y Supervisores ven todos los mantenimientos" ON mantenimientos FOR SELECT
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

CREATE POLICY "Técnicos ven sus mantenimientos" ON mantenimientos FOR SELECT
  USING (tecnico_id = auth.uid() OR creado_por = auth.uid());

CREATE POLICY "Usuarios pueden crear mantenimientos" ON mantenimientos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Técnicos pueden actualizar sus mantenimientos" ON mantenimientos FOR UPDATE
  USING (tecnico_id = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para instalaciones
CREATE POLICY "Admins y Supervisores ven todas las instalaciones" ON instalaciones FOR SELECT
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

CREATE POLICY "Técnicos ven sus instalaciones" ON instalaciones FOR SELECT
  USING (tecnico_id = auth.uid() OR creado_por = auth.uid());

CREATE POLICY "Usuarios pueden crear instalaciones" ON instalaciones FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Técnicos pueden actualizar sus instalaciones" ON instalaciones FOR UPDATE
  USING (tecnico_id = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para tablas relacionadas (acceso basado en entidad padre)
CREATE POLICY "Ver checklist de mantenimientos accesibles" ON mantenimiento_checklist FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mantenimientos m WHERE m.id = mantenimiento_id
    AND (m.tecnico_id = auth.uid() OR m.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
  ));

CREATE POLICY "Modificar checklist de mantenimientos" ON mantenimiento_checklist FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ver evidencias de mantenimientos accesibles" ON mantenimiento_evidencias FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM mantenimientos m WHERE m.id = mantenimiento_id
    AND (m.tecnico_id = auth.uid() OR m.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
  ));

CREATE POLICY "Subir evidencias de mantenimientos" ON mantenimiento_evidencias FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Ver modulos de instalaciones accesibles" ON instalacion_modulos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM instalaciones i WHERE i.id = instalacion_id
    AND (i.tecnico_id = auth.uid() OR i.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
  ));

CREATE POLICY "Modificar modulos de instalaciones" ON instalacion_modulos FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ver checklist de instalaciones accesibles" ON instalacion_checklist FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM instalaciones i WHERE i.id = instalacion_id
    AND (i.tecnico_id = auth.uid() OR i.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
  ));

CREATE POLICY "Modificar checklist de instalaciones" ON instalacion_checklist FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ver pendientes de instalaciones accesibles" ON instalacion_pendientes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM instalaciones i WHERE i.id = instalacion_id
    AND (i.tecnico_id = auth.uid() OR i.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
  ));

CREATE POLICY "Modificar pendientes de instalaciones" ON instalacion_pendientes FOR ALL
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Ver evidencias de instalaciones accesibles" ON instalacion_evidencias FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM instalaciones i WHERE i.id = instalacion_id
    AND (i.tecnico_id = auth.uid() OR i.creado_por = auth.uid() OR user_has_any_role(ARRAY['Administrador', 'Supervisor']))
  ));

CREATE POLICY "Subir evidencias de instalaciones" ON instalacion_evidencias FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 17. STORAGE BUCKETS
-- ============================================================================

-- Bucket para evidencias de mantenimientos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mantenimiento-evidencias',
  'mantenimiento-evidencias',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para evidencias de instalaciones
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'instalacion-evidencias',
  'instalacion-evidencias',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket para firmas de clientes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'firmas-clientes',
  'firmas-clientes',
  false,
  1048576, -- 1MB
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para mantenimiento-evidencias
CREATE POLICY "Usuarios autenticados pueden ver evidencias mtn"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mantenimiento-evidencias' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden subir evidencias mtn"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mantenimiento-evidencias' AND auth.uid() IS NOT NULL);

-- Políticas de storage para instalacion-evidencias
CREATE POLICY "Usuarios autenticados pueden ver evidencias inst"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'instalacion-evidencias' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden subir evidencias inst"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'instalacion-evidencias' AND auth.uid() IS NOT NULL);

-- Políticas de storage para firmas-clientes
CREATE POLICY "Usuarios autenticados pueden ver firmas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'firmas-clientes' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden subir firmas"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'firmas-clientes' AND auth.uid() IS NOT NULL);

-- ============================================================================
-- 18. TRIGGER PARA ACTUALIZAR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mantenimientos_updated_at ON mantenimientos;
CREATE TRIGGER trigger_update_mantenimientos_updated_at
  BEFORE UPDATE ON mantenimientos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_instalaciones_updated_at ON instalaciones;
CREATE TRIGGER trigger_update_instalaciones_updated_at
  BEFORE UPDATE ON instalaciones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_update_instalacion_pendientes_updated_at ON instalacion_pendientes;
CREATE TRIGGER trigger_update_instalacion_pendientes_updated_at
  BEFORE UPDATE ON instalacion_pendientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 'Migración 19 completada - Sistema de Mantenimientos e Instalaciones' as info;
SELECT 'Tablas creadas:' as info;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'tipos_mantenimiento', 'estatus_mantenimientos', 'estatus_instalaciones',
  'modulos_sistema', 'checklist_templates', 'checklist_items_template',
  'mantenimientos', 'mantenimiento_checklist', 'mantenimiento_evidencias',
  'instalaciones', 'instalacion_modulos', 'instalacion_checklist',
  'instalacion_pendientes', 'instalacion_evidencias'
);
