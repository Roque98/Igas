-- ============================================================================
-- 07. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Descripción: Habilita y configura políticas de seguridad a nivel de fila
-- ============================================================================

-- ============================================================================
-- FUNCIONES HELPER CON SECURITY DEFINER
-- ============================================================================
-- Estas funciones evitan recursión infinita al verificar roles dentro de policies

-- Función para verificar si el usuario actual es Administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.roles r ON p.rol_id = r.id
    WHERE p.id = auth.uid()
    AND r.nombre = 'Administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para verificar si el usuario actual es Supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.roles r ON p.rol_id = r.id
    WHERE p.id = auth.uid()
    AND r.nombre = 'Supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para verificar si el usuario es Admin o Supervisor
CREATE OR REPLACE FUNCTION public.is_admin_or_supervisor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.roles r ON p.rol_id = r.id
    WHERE p.id = auth.uid()
    AND r.nombre IN ('Administrador', 'Supervisor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para verificar si el usuario tiene un rol específico
CREATE OR REPLACE FUNCTION public.has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles p
    INNER JOIN public.roles r ON p.rol_id = r.id
    WHERE p.id = auth.uid()
    AND r.nombre = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- HABILITAR RLS EN TABLAS
-- ============================================================================

-- Habilitar RLS en tablas de catálogo
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estatus_tickets ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tablas principales
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en tablas de tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_bitacora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_historial_asignaciones ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES PARA PROFILES
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins pueden ver y gestionar todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- POLICIES PARA TICKETS
-- ============================================================================

CREATE POLICY "Users can view tickets assigned to them"
  ON public.tickets FOR SELECT
  USING (
    responsable_id = auth.uid()
    OR creado_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = tickets.id AND usuario_id = auth.uid()
    )
  );

-- Admins pueden ver todos los tickets
CREATE POLICY "Admins can view all tickets"
  ON public.tickets FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- POLICIES PARA CATÁLOGOS (solo lectura para todos, admins pueden todo)
-- ============================================================================

-- Roles
CREATE POLICY "Authenticated users can view roles"
  ON public.roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  USING (public.is_admin());

-- Equipos
CREATE POLICY "Authenticated users can view equipos"
  ON public.equipos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage equipos"
  ON public.equipos FOR ALL
  USING (public.is_admin());

-- Horarios
CREATE POLICY "Authenticated users can view horarios"
  ON public.horarios FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage horarios"
  ON public.horarios FOR ALL
  USING (public.is_admin());

-- Categorías de Servicio
CREATE POLICY "Authenticated users can view categorias_servicio"
  ON public.categorias_servicio FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage categorias_servicio"
  ON public.categorias_servicio FOR ALL
  USING (public.is_admin());

-- Estatus de Tickets
CREATE POLICY "Authenticated users can view estatus_tickets"
  ON public.estatus_tickets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage estatus_tickets"
  ON public.estatus_tickets FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- POLICIES PARA CLIENTES Y SUCURSALES
-- ============================================================================

-- Clientes - Todos los usuarios autenticados pueden ver
CREATE POLICY "Authenticated users can view clientes"
  ON public.clientes FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins y supervisores pueden modificar clientes
CREATE POLICY "Admins and supervisors can manage clientes"
  ON public.clientes FOR ALL
  USING (public.is_admin_or_supervisor());

-- Sucursales - Todos los usuarios autenticados pueden ver
CREATE POLICY "Authenticated users can view sucursales"
  ON public.sucursales FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admins y supervisores pueden modificar sucursales
CREATE POLICY "Admins and supervisors can manage sucursales"
  ON public.sucursales FOR ALL
  USING (public.is_admin_or_supervisor());

-- ============================================================================
-- POLICIES PARA TABLAS RELACIONADAS CON TICKETS
-- ============================================================================

-- Ticket Participantes
CREATE POLICY "Users can view ticket_participantes for their tickets"
  ON public.ticket_participantes FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_participantes.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR public.is_admin()
  );

-- Ticket Adjuntos
CREATE POLICY "Users can view ticket_adjuntos for their tickets"
  ON public.ticket_adjuntos FOR SELECT
  USING (
    subido_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_adjuntos.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_adjuntos.ticket_id AND usuario_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can upload ticket_adjuntos for their tickets"
  ON public.ticket_adjuntos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_adjuntos.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_adjuntos.ticket_id AND usuario_id = auth.uid()
    )
  );

-- Ticket Bitácora
CREATE POLICY "Users can view ticket_bitacora for their tickets"
  ON public.ticket_bitacora FOR SELECT
  USING (
    usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_bitacora.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_bitacora.ticket_id AND usuario_id = auth.uid()
    )
    OR public.is_admin()
  );

CREATE POLICY "Users can add ticket_bitacora entries for their tickets"
  ON public.ticket_bitacora FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_bitacora.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.ticket_participantes
      WHERE ticket_id = ticket_bitacora.ticket_id AND usuario_id = auth.uid()
    )
  );

-- Ticket Historial de Asignaciones
CREATE POLICY "Users can view ticket_historial_asignaciones for their tickets"
  ON public.ticket_historial_asignaciones FOR SELECT
  USING (
    de_usuario_id = auth.uid()
    OR a_usuario_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_historial_asignaciones.ticket_id
      AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
    )
    OR public.is_admin_or_supervisor()
  );

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
