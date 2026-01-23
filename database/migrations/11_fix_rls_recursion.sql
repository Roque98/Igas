-- ============================================================================
-- 11. FIX RLS INFINITE RECURSION
-- ============================================================================
-- Descripción: Corrige las políticas RLS que causan recursión infinita
-- al consultar la tabla roles dentro de sus propias políticas.
--
-- El problema: Las políticas que verifican si el usuario es admin/supervisor
-- consultaban la tabla `roles` dentro de policies de la misma tabla `roles`,
-- causando el error: "infinite recursion detected in policy for relation roles"
-- ============================================================================

-- ============================================================================
-- PASO 1: Crear funciones helper con SECURITY DEFINER
-- ============================================================================
-- Estas funciones se ejecutan con privilegios del creador, evitando RLS

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
-- PASO 2: Eliminar políticas problemáticas
-- ============================================================================

-- Políticas de profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Políticas de roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;

-- Políticas de equipos
DROP POLICY IF EXISTS "Admins can manage equipos" ON public.equipos;

-- Políticas de horarios
DROP POLICY IF EXISTS "Admins can manage horarios" ON public.horarios;

-- Políticas de categorias_servicio
DROP POLICY IF EXISTS "Admins can manage categorias_servicio" ON public.categorias_servicio;

-- Políticas de estatus_tickets
DROP POLICY IF EXISTS "Admins can manage estatus_tickets" ON public.estatus_tickets;

-- Políticas de clientes
DROP POLICY IF EXISTS "Admins and supervisors can manage clientes" ON public.clientes;

-- Políticas de sucursales
DROP POLICY IF EXISTS "Admins and supervisors can manage sucursales" ON public.sucursales;

-- Políticas de tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;

-- Políticas de ticket_participantes
DROP POLICY IF EXISTS "Users can view ticket_participantes for their tickets" ON public.ticket_participantes;

-- Políticas de ticket_adjuntos
DROP POLICY IF EXISTS "Users can view ticket_adjuntos for their tickets" ON public.ticket_adjuntos;

-- Políticas de ticket_bitacora
DROP POLICY IF EXISTS "Users can view ticket_bitacora for their tickets" ON public.ticket_bitacora;

-- Políticas de ticket_historial_asignaciones
DROP POLICY IF EXISTS "Users can view ticket_historial_asignaciones for their tickets" ON public.ticket_historial_asignaciones;

-- ============================================================================
-- PASO 3: Recrear políticas usando las funciones helper
-- ============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- ROLES (esta era la que causaba el error principal)
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can manage roles"
  ON public.roles FOR ALL
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- EQUIPOS
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can manage equipos"
  ON public.equipos FOR ALL
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- HORARIOS
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can manage horarios"
  ON public.horarios FOR ALL
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- CATEGORIAS_SERVICIO
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can manage categorias_servicio"
  ON public.categorias_servicio FOR ALL
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- ESTATUS_TICKETS
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can manage estatus_tickets"
  ON public.estatus_tickets FOR ALL
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- CLIENTES
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins and supervisors can manage clientes"
  ON public.clientes FOR ALL
  USING (public.is_admin_or_supervisor());

-- -----------------------------------------------------------------------------
-- SUCURSALES
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins and supervisors can manage sucursales"
  ON public.sucursales FOR ALL
  USING (public.is_admin_or_supervisor());

-- -----------------------------------------------------------------------------
-- TICKETS
-- -----------------------------------------------------------------------------
CREATE POLICY "Admins can view all tickets"
  ON public.tickets FOR SELECT
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- TICKET_PARTICIPANTES
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TICKET_ADJUNTOS
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TICKET_BITACORA
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- TICKET_HISTORIAL_ASIGNACIONES
-- -----------------------------------------------------------------------------
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
-- PASO 4: Verificación
-- ============================================================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
