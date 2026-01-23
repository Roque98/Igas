-- ============================================================================
-- Migration: Módulo Completo de Clientes
-- ============================================================================
-- Amplía la gestión de clientes con: contactos, datos fiscales,
-- licencias HASP, pólizas de soporte y alertas de vencimiento
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. AMPLIAR TABLA DE CLIENTES
-- ============================================================================

-- Agregar nuevas columnas a clientes
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS codigo_cliente TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS telefono_secundario TEXT,
  ADD COLUMN IF NOT EXISTS email_secundario TEXT,
  ADD COLUMN IF NOT EXISTS anydesk TEXT,
  ADD COLUMN IF NOT EXISTS estatus_cliente TEXT CHECK (estatus_cliente IN ('Activo', 'Suspendido', 'Sin póliza', 'En cobranza')) DEFAULT 'Activo',
  ADD COLUMN IF NOT EXISTS tipo_cliente TEXT CHECK (tipo_cliente IN ('Cliente', 'Prospecto', 'Inactivo')) DEFAULT 'Cliente';

-- Renombrar columnas para consistencia (si existen con nombres diferentes)
DO $$
BEGIN
  -- Actualizar estatus existente a estatus_cliente si está vacío
  UPDATE clientes SET estatus_cliente = estatus WHERE estatus_cliente IS NULL AND estatus IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Crear índice para búsqueda full-text
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_fts ON clientes USING gin(to_tsvector('spanish', COALESCE(nombre_comercial, '') || ' ' || COALESCE(razon_social, '')));
CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes(codigo_cliente);

-- ============================================================================
-- 2. AMPLIAR TABLA DE SUCURSALES
-- ============================================================================

ALTER TABLE public.sucursales
  ADD COLUMN IF NOT EXISTS es_matriz BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS numero_exterior TEXT,
  ADD COLUMN IF NOT EXISTS numero_interior TEXT,
  ADD COLUMN IF NOT EXISTS colonia TEXT,
  ADD COLUMN IF NOT EXISTS municipio TEXT,
  ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'México',
  ADD COLUMN IF NOT EXISTS referencias TEXT,
  ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8);

-- Renombrar direccion a calle si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sucursales' AND column_name = 'direccion') THEN
    ALTER TABLE sucursales RENAME COLUMN direccion TO calle;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================================
-- 3. TABLA DE CONTACTOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.contactos_cliente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  tipo TEXT CHECK (tipo IN ('Administrador', 'Encargado', 'Facturación', 'TI', 'Operaciones', 'Otro')) NOT NULL,
  nombre_completo TEXT NOT NULL,
  puesto TEXT,
  telefono TEXT,
  celular TEXT,
  email TEXT,
  es_contacto_principal BOOLEAN DEFAULT false,
  notas TEXT,
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contactos_cliente ON contactos_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contactos_sucursal ON contactos_cliente(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_contactos_principal ON contactos_cliente(cliente_id, es_contacto_principal) WHERE es_contacto_principal = true;

-- ============================================================================
-- 4. TABLA DE DATOS FISCALES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.datos_fiscales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE NOT NULL,
  razon_social_fiscal TEXT NOT NULL,
  rfc TEXT NOT NULL CHECK (LENGTH(rfc) >= 12 AND LENGTH(rfc) <= 13),
  regimen_fiscal TEXT NOT NULL,
  uso_cfdi_default TEXT,
  codigo_postal_fiscal TEXT NOT NULL CHECK (LENGTH(codigo_postal_fiscal) = 5),

  -- Dirección fiscal
  calle_fiscal TEXT,
  numero_exterior_fiscal TEXT,
  numero_interior_fiscal TEXT,
  colonia_fiscal TEXT,
  municipio_fiscal TEXT,
  estado_fiscal TEXT,

  -- Emails
  email_facturacion TEXT NOT NULL,
  emails_copia TEXT[], -- Array de emails adicionales

  -- Preferencias de pago
  forma_pago_preferida TEXT,
  metodo_pago_preferido TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datos_fiscales_cliente ON datos_fiscales(cliente_id);
CREATE INDEX IF NOT EXISTS idx_datos_fiscales_rfc ON datos_fiscales(rfc);

-- ============================================================================
-- 5. CATÁLOGOS SAT
-- ============================================================================

-- Régimen fiscal
CREATE TABLE IF NOT EXISTS public.cat_regimen_fiscal (
  clave TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  persona_fisica BOOLEAN DEFAULT true,
  persona_moral BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true
);

-- Uso CFDI
CREATE TABLE IF NOT EXISTS public.cat_uso_cfdi (
  clave TEXT PRIMARY KEY,
  descripcion TEXT NOT NULL,
  persona_fisica BOOLEAN DEFAULT true,
  persona_moral BOOLEAN DEFAULT true,
  activo BOOLEAN DEFAULT true
);

-- Poblar catálogo de Régimen Fiscal (SAT 4.0)
INSERT INTO cat_regimen_fiscal (clave, descripcion, persona_fisica, persona_moral) VALUES
  ('601', 'General de Ley Personas Morales', false, true),
  ('603', 'Personas Morales con Fines no Lucrativos', false, true),
  ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', true, false),
  ('606', 'Arrendamiento', true, false),
  ('607', 'Régimen de Enajenación o Adquisición de Bienes', true, false),
  ('608', 'Demás ingresos', true, false),
  ('610', 'Residentes en el Extranjero sin Establecimiento Permanente en México', true, true),
  ('611', 'Ingresos por Dividendos (socios y accionistas)', true, false),
  ('612', 'Personas Físicas con Actividades Empresariales y Profesionales', true, false),
  ('614', 'Ingresos por intereses', true, false),
  ('615', 'Régimen de los ingresos por obtención de premios', true, false),
  ('616', 'Sin obligaciones fiscales', true, false),
  ('620', 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', false, true),
  ('621', 'Incorporación Fiscal', true, false),
  ('622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', true, true),
  ('623', 'Opcional para Grupos de Sociedades', false, true),
  ('624', 'Coordinados', false, true),
  ('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', true, false),
  ('626', 'Régimen Simplificado de Confianza', true, true)
ON CONFLICT (clave) DO NOTHING;

-- Poblar catálogo de Uso CFDI (SAT 4.0)
INSERT INTO cat_uso_cfdi (clave, descripcion, persona_fisica, persona_moral) VALUES
  ('G01', 'Adquisición de mercancías', true, true),
  ('G02', 'Devoluciones, descuentos o bonificaciones', true, true),
  ('G03', 'Gastos en general', true, true),
  ('I01', 'Construcciones', true, true),
  ('I02', 'Mobiliario y equipo de oficina por inversiones', true, true),
  ('I03', 'Equipo de transporte', true, true),
  ('I04', 'Equipo de cómputo y accesorios', true, true),
  ('I05', 'Dados, troqueles, moldes, matrices y herramental', true, true),
  ('I06', 'Comunicaciones telefónicas', true, true),
  ('I07', 'Comunicaciones satelitales', true, true),
  ('I08', 'Otra maquinaria y equipo', true, true),
  ('D01', 'Honorarios médicos, dentales y gastos hospitalarios', true, false),
  ('D02', 'Gastos médicos por incapacidad o discapacidad', true, false),
  ('D03', 'Gastos funerales', true, false),
  ('D04', 'Donativos', true, false),
  ('D05', 'Intereses reales efectivamente pagados por créditos hipotecarios', true, false),
  ('D06', 'Aportaciones voluntarias al SAR', true, false),
  ('D07', 'Primas por seguros de gastos médicos', true, false),
  ('D08', 'Gastos de transportación escolar obligatoria', true, false),
  ('D09', 'Depósitos en cuentas para el ahorro, primas de pensiones', true, false),
  ('D10', 'Pagos por servicios educativos (colegiaturas)', true, false),
  ('S01', 'Sin efectos fiscales', true, true),
  ('CP01', 'Pagos', true, true),
  ('CN01', 'Nómina', true, false)
ON CONFLICT (clave) DO NOTHING;

-- ============================================================================
-- 6. LICENCIAS HASP
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.licencias_hasp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  sucursal_id UUID REFERENCES sucursales(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'HASP', -- 'HASP', 'Licencia Software', 'Certificado', etc.
  folio TEXT,
  numero_serie TEXT,
  producto TEXT, -- 'Volumétrico A30', 'POS', 'Facturación', etc.
  version TEXT,
  fecha_activacion DATE,
  fecha_vencimiento DATE,
  dias_alerta_previa INTEGER DEFAULT 30,
  estatus TEXT CHECK (estatus IN ('Activa', 'Por vencer', 'Vencida', 'Suspendida', 'Cancelada')) DEFAULT 'Activa',
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_licencias_cliente ON licencias_hasp(cliente_id);
CREATE INDEX IF NOT EXISTS idx_licencias_sucursal ON licencias_hasp(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_licencias_vencimiento ON licencias_hasp(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_licencias_estatus ON licencias_hasp(estatus);

-- ============================================================================
-- 7. HISTORIAL DE RENOVACIONES DE LICENCIAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.licencias_renovaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  licencia_id UUID REFERENCES licencias_hasp(id) ON DELETE CASCADE NOT NULL,
  fecha_renovacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento_anterior DATE,
  fecha_vencimiento_nueva DATE NOT NULL,
  costo DECIMAL(10, 2),
  renovado_por UUID REFERENCES profiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renovaciones_licencia ON licencias_renovaciones(licencia_id);

-- ============================================================================
-- 8. PÓLIZAS DE SOPORTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.polizas_soporte (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
  numero_poliza TEXT,
  tipo TEXT CHECK (tipo IN ('Mensual', 'Trimestral', 'Semestral', 'Anual', 'Por Evento')) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  costo DECIMAL(10, 2),
  cobertura TEXT, -- Descripción de lo que cubre
  horas_incluidas INTEGER, -- Horas de soporte incluidas
  horas_consumidas INTEGER DEFAULT 0,
  estatus TEXT CHECK (estatus IN ('Activa', 'Por vencer', 'Vencida', 'En cobranza', 'Suspendida', 'Cancelada')) DEFAULT 'Activa',
  dias_alerta_previa INTEGER DEFAULT 30,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polizas_cliente ON polizas_soporte(cliente_id);
CREATE INDEX IF NOT EXISTS idx_polizas_vencimiento ON polizas_soporte(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_polizas_estatus ON polizas_soporte(estatus);

-- ============================================================================
-- 9. HISTORIAL DE RENOVACIONES DE PÓLIZAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.polizas_renovaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poliza_id UUID REFERENCES polizas_soporte(id) ON DELETE CASCADE NOT NULL,
  fecha_renovacion DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento_anterior DATE,
  fecha_vencimiento_nueva DATE NOT NULL,
  costo DECIMAL(10, 2),
  renovado_por UUID REFERENCES profiles(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renovaciones_poliza ON polizas_renovaciones(poliza_id);

-- ============================================================================
-- 10. ALERTAS DE VENCIMIENTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.alertas_vencimiento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT CHECK (tipo IN ('licencia', 'poliza')) NOT NULL,
  referencia_id UUID NOT NULL, -- ID de licencia o póliza
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  fecha_vencimiento DATE NOT NULL,
  dias_para_vencer INTEGER,
  mensaje TEXT,
  prioridad TEXT CHECK (prioridad IN ('alta', 'media', 'baja')) DEFAULT 'media',
  notificado BOOLEAN DEFAULT false,
  fecha_notificacion TIMESTAMPTZ,
  atendido BOOLEAN DEFAULT false,
  atendido_por UUID REFERENCES profiles(id),
  fecha_atencion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertas_tipo_ref ON alertas_vencimiento(tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_alertas_cliente ON alertas_vencimiento(cliente_id);
CREATE INDEX IF NOT EXISTS idx_alertas_fecha ON alertas_vencimiento(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_alertas_pendientes ON alertas_vencimiento(atendido) WHERE atendido = false;

-- ============================================================================
-- 11. VISTAS
-- ============================================================================

-- Vista de licencias con estado calculado
CREATE OR REPLACE VIEW v_licencias_estado AS
SELECT
  l.*,
  c.nombre_comercial as cliente_nombre,
  c.razon_social as cliente_razon_social,
  s.nombre as sucursal_nombre,
  CASE
    WHEN l.estatus IN ('Suspendida', 'Cancelada') THEN l.estatus
    WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
    WHEN l.fecha_vencimiento <= CURRENT_DATE + (l.dias_alerta_previa || ' days')::INTERVAL THEN 'Por vencer'
    ELSE 'Activa'
  END as estado_calculado,
  CASE
    WHEN l.fecha_vencimiento IS NULL THEN NULL
    ELSE l.fecha_vencimiento - CURRENT_DATE
  END as dias_restantes
FROM licencias_hasp l
LEFT JOIN clientes c ON l.cliente_id = c.id
LEFT JOIN sucursales s ON l.sucursal_id = s.id;

-- Vista de pólizas con estado calculado
CREATE OR REPLACE VIEW v_polizas_estado AS
SELECT
  p.*,
  c.nombre_comercial as cliente_nombre,
  c.razon_social as cliente_razon_social,
  CASE
    WHEN p.estatus IN ('En cobranza', 'Suspendida', 'Cancelada') THEN p.estatus
    WHEN p.fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
    WHEN p.fecha_vencimiento <= CURRENT_DATE + (p.dias_alerta_previa || ' days')::INTERVAL THEN 'Por vencer'
    ELSE 'Activa'
  END as estado_calculado,
  CASE
    WHEN p.fecha_vencimiento IS NULL THEN NULL
    ELSE p.fecha_vencimiento - CURRENT_DATE
  END as dias_restantes,
  CASE
    WHEN p.horas_incluidas IS NULL OR p.horas_incluidas = 0 THEN 0
    ELSE ROUND((p.horas_consumidas::DECIMAL / p.horas_incluidas) * 100, 2)
  END as porcentaje_horas_consumidas
FROM polizas_soporte p
LEFT JOIN clientes c ON p.cliente_id = c.id;

-- Vista de cliente con resumen
CREATE OR REPLACE VIEW v_clientes_resumen AS
SELECT
  c.*,
  (SELECT COUNT(*) FROM sucursales s WHERE s.cliente_id = c.id AND s.estatus = 'Activa') as total_sucursales,
  (SELECT COUNT(*) FROM contactos_cliente cc WHERE cc.cliente_id = c.id AND cc.estatus = 'Activo') as total_contactos,
  (SELECT COUNT(*) FROM licencias_hasp l WHERE l.cliente_id = c.id AND l.estatus NOT IN ('Cancelada')) as total_licencias,
  (SELECT COUNT(*) FROM licencias_hasp l WHERE l.cliente_id = c.id AND l.fecha_vencimiento < CURRENT_DATE AND l.estatus NOT IN ('Cancelada', 'Suspendida')) as licencias_vencidas,
  (SELECT COUNT(*) FROM licencias_hasp l WHERE l.cliente_id = c.id AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' AND l.estatus = 'Activa') as licencias_por_vencer,
  (SELECT COUNT(*) FROM polizas_soporte p WHERE p.cliente_id = c.id AND p.estatus NOT IN ('Cancelada')) as total_polizas,
  (SELECT p.fecha_vencimiento FROM polizas_soporte p WHERE p.cliente_id = c.id AND p.estatus IN ('Activa', 'Por vencer') ORDER BY p.fecha_vencimiento DESC LIMIT 1) as poliza_vencimiento,
  (SELECT p.estatus FROM polizas_soporte p WHERE p.cliente_id = c.id AND p.estatus IN ('Activa', 'Por vencer') ORDER BY p.fecha_vencimiento DESC LIMIT 1) as poliza_estatus,
  EXISTS (SELECT 1 FROM datos_fiscales df WHERE df.cliente_id = c.id) as tiene_datos_fiscales
FROM clientes c;

-- Dar permisos a las vistas
GRANT SELECT ON v_licencias_estado TO authenticated;
GRANT SELECT ON v_polizas_estado TO authenticated;
GRANT SELECT ON v_clientes_resumen TO authenticated;

-- ============================================================================
-- 12. FUNCIONES PARA ALERTAS
-- ============================================================================

-- Función para generar alertas de licencias
CREATE OR REPLACE FUNCTION generar_alertas_licencias()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO alertas_vencimiento (tipo, referencia_id, cliente_id, fecha_vencimiento, dias_para_vencer, mensaje, prioridad)
  SELECT
    'licencia',
    l.id,
    l.cliente_id,
    l.fecha_vencimiento,
    l.fecha_vencimiento - CURRENT_DATE,
    'Licencia ' || COALESCE(l.producto, '') || ' (' || COALESCE(l.folio, l.numero_serie, 'S/N') || ') vence el ' || TO_CHAR(l.fecha_vencimiento, 'DD/MM/YYYY'),
    CASE
      WHEN l.fecha_vencimiento - CURRENT_DATE <= 7 THEN 'alta'
      WHEN l.fecha_vencimiento - CURRENT_DATE <= 15 THEN 'media'
      ELSE 'baja'
    END
  FROM licencias_hasp l
  WHERE
    l.estatus NOT IN ('Vencida', 'Suspendida', 'Cancelada') AND
    l.fecha_vencimiento >= CURRENT_DATE AND
    l.fecha_vencimiento <= CURRENT_DATE + (COALESCE(l.dias_alerta_previa, 30) || ' days')::INTERVAL AND
    NOT EXISTS (
      SELECT 1 FROM alertas_vencimiento a
      WHERE a.tipo = 'licencia'
        AND a.referencia_id = l.id
        AND a.fecha_vencimiento = l.fecha_vencimiento
        AND a.atendido = false
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para generar alertas de pólizas
CREATE OR REPLACE FUNCTION generar_alertas_polizas()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO alertas_vencimiento (tipo, referencia_id, cliente_id, fecha_vencimiento, dias_para_vencer, mensaje, prioridad)
  SELECT
    'poliza',
    p.id,
    p.cliente_id,
    p.fecha_vencimiento,
    p.fecha_vencimiento - CURRENT_DATE,
    'Póliza de soporte ' || p.tipo || ' vence el ' || TO_CHAR(p.fecha_vencimiento, 'DD/MM/YYYY'),
    CASE
      WHEN p.fecha_vencimiento - CURRENT_DATE <= 7 THEN 'alta'
      WHEN p.fecha_vencimiento - CURRENT_DATE <= 15 THEN 'media'
      ELSE 'baja'
    END
  FROM polizas_soporte p
  WHERE
    p.estatus NOT IN ('Vencida', 'Suspendida', 'Cancelada', 'En cobranza') AND
    p.fecha_vencimiento >= CURRENT_DATE AND
    p.fecha_vencimiento <= CURRENT_DATE + (COALESCE(p.dias_alerta_previa, 30) || ' days')::INTERVAL AND
    NOT EXISTS (
      SELECT 1 FROM alertas_vencimiento a
      WHERE a.tipo = 'poliza'
        AND a.referencia_id = p.id
        AND a.fecha_vencimiento = p.fecha_vencimiento
        AND a.atendido = false
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar estados de licencias
CREATE OR REPLACE FUNCTION actualizar_estados_licencias()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE licencias_hasp
  SET
    estatus = CASE
      WHEN fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
      WHEN fecha_vencimiento <= CURRENT_DATE + (dias_alerta_previa || ' days')::INTERVAL THEN 'Por vencer'
      ELSE 'Activa'
    END,
    updated_at = NOW()
  WHERE estatus NOT IN ('Suspendida', 'Cancelada')
    AND (
      (estatus != 'Vencida' AND fecha_vencimiento < CURRENT_DATE) OR
      (estatus != 'Por vencer' AND fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + (dias_alerta_previa || ' days')::INTERVAL) OR
      (estatus NOT IN ('Activa') AND fecha_vencimiento > CURRENT_DATE + (dias_alerta_previa || ' days')::INTERVAL)
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar estados de pólizas
CREATE OR REPLACE FUNCTION actualizar_estados_polizas()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE polizas_soporte
  SET
    estatus = CASE
      WHEN fecha_vencimiento < CURRENT_DATE THEN 'Vencida'
      WHEN fecha_vencimiento <= CURRENT_DATE + (dias_alerta_previa || ' days')::INTERVAL THEN 'Por vencer'
      ELSE 'Activa'
    END,
    updated_at = NOW()
  WHERE estatus NOT IN ('En cobranza', 'Suspendida', 'Cancelada')
    AND (
      (estatus != 'Vencida' AND fecha_vencimiento < CURRENT_DATE) OR
      (estatus != 'Por vencer' AND fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + (dias_alerta_previa || ' days')::INTERVAL) OR
      (estatus NOT IN ('Activa') AND fecha_vencimiento > CURRENT_DATE + (dias_alerta_previa || ' days')::INTERVAL)
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para renovar licencia
CREATE OR REPLACE FUNCTION renovar_licencia(
  p_licencia_id UUID,
  p_nueva_fecha_vencimiento DATE,
  p_costo DECIMAL DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_fecha_anterior DATE;
  v_renovacion_id UUID;
BEGIN
  -- Obtener fecha anterior
  SELECT fecha_vencimiento INTO v_fecha_anterior
  FROM licencias_hasp WHERE id = p_licencia_id;

  IF v_fecha_anterior IS NULL THEN
    RAISE EXCEPTION 'Licencia no encontrada: %', p_licencia_id;
  END IF;

  -- Registrar renovación
  INSERT INTO licencias_renovaciones (licencia_id, fecha_vencimiento_anterior, fecha_vencimiento_nueva, costo, renovado_por, notas)
  VALUES (p_licencia_id, v_fecha_anterior, p_nueva_fecha_vencimiento, p_costo, auth.uid(), p_notas)
  RETURNING id INTO v_renovacion_id;

  -- Actualizar licencia
  UPDATE licencias_hasp
  SET
    fecha_vencimiento = p_nueva_fecha_vencimiento,
    estatus = 'Activa',
    updated_at = NOW()
  WHERE id = p_licencia_id;

  -- Marcar alertas como atendidas
  UPDATE alertas_vencimiento
  SET atendido = true, atendido_por = auth.uid(), fecha_atencion = NOW()
  WHERE tipo = 'licencia' AND referencia_id = p_licencia_id AND atendido = false;

  RETURN v_renovacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para renovar póliza
CREATE OR REPLACE FUNCTION renovar_poliza(
  p_poliza_id UUID,
  p_nueva_fecha_vencimiento DATE,
  p_costo DECIMAL DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_fecha_anterior DATE;
  v_renovacion_id UUID;
BEGIN
  -- Obtener fecha anterior
  SELECT fecha_vencimiento INTO v_fecha_anterior
  FROM polizas_soporte WHERE id = p_poliza_id;

  IF v_fecha_anterior IS NULL THEN
    RAISE EXCEPTION 'Póliza no encontrada: %', p_poliza_id;
  END IF;

  -- Registrar renovación
  INSERT INTO polizas_renovaciones (poliza_id, fecha_vencimiento_anterior, fecha_vencimiento_nueva, costo, renovado_por, notas)
  VALUES (p_poliza_id, v_fecha_anterior, p_nueva_fecha_vencimiento, p_costo, auth.uid(), p_notas)
  RETURNING id INTO v_renovacion_id;

  -- Actualizar póliza
  UPDATE polizas_soporte
  SET
    fecha_vencimiento = p_nueva_fecha_vencimiento,
    estatus = 'Activa',
    updated_at = NOW()
  WHERE id = p_poliza_id;

  -- Marcar alertas como atendidas
  UPDATE alertas_vencimiento
  SET atendido = true, atendido_por = auth.uid(), fecha_atencion = NOW()
  WHERE tipo = 'poliza' AND referencia_id = p_poliza_id AND atendido = false;

  RETURN v_renovacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 13. ROW LEVEL SECURITY
-- ============================================================================

-- Habilitar RLS
ALTER TABLE contactos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_fiscales ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencias_hasp ENABLE ROW LEVEL SECURITY;
ALTER TABLE licencias_renovaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_soporte ENABLE ROW LEVEL SECURITY;
ALTER TABLE polizas_renovaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_vencimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_regimen_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE cat_uso_cfdi ENABLE ROW LEVEL SECURITY;

-- Políticas para catálogos (lectura para todos)
DROP POLICY IF EXISTS "Todos pueden ver regimen fiscal" ON cat_regimen_fiscal;
CREATE POLICY "Todos pueden ver regimen fiscal"
  ON cat_regimen_fiscal FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Todos pueden ver uso cfdi" ON cat_uso_cfdi;
CREATE POLICY "Todos pueden ver uso cfdi"
  ON cat_uso_cfdi FOR SELECT
  USING (true);

-- Políticas para contactos_cliente
DROP POLICY IF EXISTS "Usuarios autenticados ven contactos" ON contactos_cliente;
CREATE POLICY "Usuarios autenticados ven contactos"
  ON contactos_cliente FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gestionan contactos" ON contactos_cliente;
CREATE POLICY "Admins gestionan contactos"
  ON contactos_cliente FOR ALL
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para datos_fiscales
DROP POLICY IF EXISTS "Usuarios autenticados ven datos fiscales" ON datos_fiscales;
CREATE POLICY "Usuarios autenticados ven datos fiscales"
  ON datos_fiscales FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gestionan datos fiscales" ON datos_fiscales;
CREATE POLICY "Admins gestionan datos fiscales"
  ON datos_fiscales FOR ALL
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para licencias_hasp
DROP POLICY IF EXISTS "Usuarios autenticados ven licencias" ON licencias_hasp;
CREATE POLICY "Usuarios autenticados ven licencias"
  ON licencias_hasp FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gestionan licencias" ON licencias_hasp;
CREATE POLICY "Admins gestionan licencias"
  ON licencias_hasp FOR ALL
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para licencias_renovaciones
DROP POLICY IF EXISTS "Usuarios autenticados ven renovaciones licencias" ON licencias_renovaciones;
CREATE POLICY "Usuarios autenticados ven renovaciones licencias"
  ON licencias_renovaciones FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gestionan renovaciones licencias" ON licencias_renovaciones;
CREATE POLICY "Admins gestionan renovaciones licencias"
  ON licencias_renovaciones FOR ALL
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para polizas_soporte
DROP POLICY IF EXISTS "Usuarios autenticados ven polizas" ON polizas_soporte;
CREATE POLICY "Usuarios autenticados ven polizas"
  ON polizas_soporte FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gestionan polizas" ON polizas_soporte;
CREATE POLICY "Admins gestionan polizas"
  ON polizas_soporte FOR ALL
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para polizas_renovaciones
DROP POLICY IF EXISTS "Usuarios autenticados ven renovaciones polizas" ON polizas_renovaciones;
CREATE POLICY "Usuarios autenticados ven renovaciones polizas"
  ON polizas_renovaciones FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gestionan renovaciones polizas" ON polizas_renovaciones;
CREATE POLICY "Admins gestionan renovaciones polizas"
  ON polizas_renovaciones FOR ALL
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- Políticas para alertas_vencimiento
DROP POLICY IF EXISTS "Usuarios autenticados ven alertas" ON alertas_vencimiento;
CREATE POLICY "Usuarios autenticados ven alertas"
  ON alertas_vencimiento FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admins gestionan alertas" ON alertas_vencimiento;
CREATE POLICY "Admins gestionan alertas"
  ON alertas_vencimiento FOR ALL
  USING (user_has_any_role(ARRAY['Administrador', 'Supervisor']));

-- ============================================================================
-- 14. TRIGGERS
-- ============================================================================

-- Trigger para updated_at en contactos_cliente
CREATE OR REPLACE FUNCTION update_contactos_cliente_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contactos_cliente_timestamp ON contactos_cliente;
CREATE TRIGGER trigger_update_contactos_cliente_timestamp
  BEFORE UPDATE ON contactos_cliente
  FOR EACH ROW EXECUTE FUNCTION update_contactos_cliente_timestamp();

-- Trigger para updated_at en datos_fiscales
DROP TRIGGER IF EXISTS trigger_update_datos_fiscales_timestamp ON datos_fiscales;
CREATE TRIGGER trigger_update_datos_fiscales_timestamp
  BEFORE UPDATE ON datos_fiscales
  FOR EACH ROW EXECUTE FUNCTION update_contactos_cliente_timestamp();

-- Trigger para updated_at en licencias_hasp
DROP TRIGGER IF EXISTS trigger_update_licencias_hasp_timestamp ON licencias_hasp;
CREATE TRIGGER trigger_update_licencias_hasp_timestamp
  BEFORE UPDATE ON licencias_hasp
  FOR EACH ROW EXECUTE FUNCTION update_contactos_cliente_timestamp();

-- Trigger para updated_at en polizas_soporte
DROP TRIGGER IF EXISTS trigger_update_polizas_soporte_timestamp ON polizas_soporte;
CREATE TRIGGER trigger_update_polizas_soporte_timestamp
  BEFORE UPDATE ON polizas_soporte
  FOR EACH ROW EXECUTE FUNCTION update_contactos_cliente_timestamp();

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
