-- ============================================================================
-- 12. FIX RLS INFINITE RECURSION V2
-- ============================================================================
-- Descripción: Solución completa para evitar recursión infinita en políticas RLS.
--
-- El problema principal: Las políticas que verifican si el usuario es participante
-- de un ticket hacen subqueries a ticket_participantes, que a su vez tiene
-- políticas RLS que verifican is_admin(), causando recursión infinita.
--
-- La solución: Crear funciones helper SECURITY DEFINER que ejecutan las
-- verificaciones sin pasar por RLS, y eliminar políticas que causan conflictos.
-- ============================================================================

-- ============================================================================
-- PASO 1: Funciones Helper con SECURITY DEFINER
-- ============================================================================
-- Estas funciones se ejecutan con privilegios del owner, evitando RLS

-- Verificar si el usuario actual es Administrador
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public;

-- Verificar si el usuario actual es Supervisor
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public;

-- Verificar si el usuario es Admin o Supervisor
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public;

-- Verificar si el usuario tiene un rol específico
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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public;

-- ============================================================================
-- NUEVAS FUNCIONES HELPER: Para verificaciones de tickets sin RLS
-- ============================================================================

-- Verificar si el usuario es dueño/responsable de un ticket
CREATE OR REPLACE FUNCTION public.is_ticket_owner_or_responsible(p_ticket_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = p_ticket_id
    AND (t.responsable_id = auth.uid() OR t.creado_por = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public;

-- Verificar si el usuario es participante de un ticket
CREATE OR REPLACE FUNCTION public.is_ticket_participant(p_ticket_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ticket_participantes tp
    WHERE tp.ticket_id = p_ticket_id
    AND tp.usuario_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public;

-- Verificar si el usuario puede ver un ticket (combinación de todas las verificaciones)
CREATE OR REPLACE FUNCTION public.can_view_ticket(p_ticket_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admin puede ver todos
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  -- Dueño o responsable puede ver
  IF public.is_ticket_owner_or_responsible(p_ticket_id) THEN
    RETURN TRUE;
  END IF;

  -- Participante puede ver
  IF public.is_ticket_participant(p_ticket_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
   SET search_path = public;

-- ============================================================================
-- PASO 2: Eliminar TODAS las políticas existentes de tablas afectadas
-- ============================================================================

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;

-- ROLES
DROP POLICY IF EXISTS "Everyone can view roles" ON public.roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.roles;
DROP POLICY IF EXISTS "roles_select_policy" ON public.roles;
DROP POLICY IF EXISTS "roles_all_policy" ON public.roles;

-- EQUIPOS
DROP POLICY IF EXISTS "Everyone can view equipos" ON public.equipos;
DROP POLICY IF EXISTS "Admins can manage equipos" ON public.equipos;
DROP POLICY IF EXISTS "equipos_select_policy" ON public.equipos;
DROP POLICY IF EXISTS "equipos_all_policy" ON public.equipos;

-- HORARIOS
DROP POLICY IF EXISTS "Everyone can view horarios" ON public.horarios;
DROP POLICY IF EXISTS "Admins can manage horarios" ON public.horarios;
DROP POLICY IF EXISTS "horarios_select_policy" ON public.horarios;
DROP POLICY IF EXISTS "horarios_all_policy" ON public.horarios;

-- CATEGORIAS_SERVICIO
DROP POLICY IF EXISTS "Everyone can view categorias_servicio" ON public.categorias_servicio;
DROP POLICY IF EXISTS "Admins can manage categorias_servicio" ON public.categorias_servicio;
DROP POLICY IF EXISTS "categorias_servicio_select_policy" ON public.categorias_servicio;
DROP POLICY IF EXISTS "categorias_servicio_all_policy" ON public.categorias_servicio;

-- ESTATUS_TICKETS
DROP POLICY IF EXISTS "Everyone can view estatus_tickets" ON public.estatus_tickets;
DROP POLICY IF EXISTS "Admins can manage estatus_tickets" ON public.estatus_tickets;
DROP POLICY IF EXISTS "estatus_tickets_select_policy" ON public.estatus_tickets;
DROP POLICY IF EXISTS "estatus_tickets_all_policy" ON public.estatus_tickets;

-- CLIENTES
DROP POLICY IF EXISTS "Admins and supervisors can manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can view clientes" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_policy" ON public.clientes;
DROP POLICY IF EXISTS "clientes_all_policy" ON public.clientes;

-- SUCURSALES
DROP POLICY IF EXISTS "Admins and supervisors can manage sucursales" ON public.sucursales;
DROP POLICY IF EXISTS "Users can view sucursales" ON public.sucursales;
DROP POLICY IF EXISTS "sucursales_select_policy" ON public.sucursales;
DROP POLICY IF EXISTS "sucursales_all_policy" ON public.sucursales;

-- TICKETS
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can view own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Responsables can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "tickets_select_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_insert_policy" ON public.tickets;
DROP POLICY IF EXISTS "tickets_update_policy" ON public.tickets;

-- TICKET_PARTICIPANTES
DROP POLICY IF EXISTS "Users can view ticket_participantes for their tickets" ON public.ticket_participantes;
DROP POLICY IF EXISTS "Admins can manage ticket_participantes" ON public.ticket_participantes;
DROP POLICY IF EXISTS "ticket_participantes_select_policy" ON public.ticket_participantes;
DROP POLICY IF EXISTS "ticket_participantes_insert_policy" ON public.ticket_participantes;
DROP POLICY IF EXISTS "ticket_participantes_delete_policy" ON public.ticket_participantes;

-- TICKET_ADJUNTOS
DROP POLICY IF EXISTS "Users can view ticket_adjuntos for their tickets" ON public.ticket_adjuntos;
DROP POLICY IF EXISTS "Users can upload ticket_adjuntos" ON public.ticket_adjuntos;
DROP POLICY IF EXISTS "ticket_adjuntos_select_policy" ON public.ticket_adjuntos;
DROP POLICY IF EXISTS "ticket_adjuntos_insert_policy" ON public.ticket_adjuntos;

-- TICKET_BITACORA
DROP POLICY IF EXISTS "Users can view ticket_bitacora for their tickets" ON public.ticket_bitacora;
DROP POLICY IF EXISTS "Users can insert ticket_bitacora" ON public.ticket_bitacora;
DROP POLICY IF EXISTS "ticket_bitacora_select_policy" ON public.ticket_bitacora;
DROP POLICY IF EXISTS "ticket_bitacora_insert_policy" ON public.ticket_bitacora;

-- TICKET_HISTORIAL_ASIGNACIONES
DROP POLICY IF EXISTS "Users can view ticket_historial_asignaciones for their tickets" ON public.ticket_historial_asignaciones;
DROP POLICY IF EXISTS "ticket_historial_asignaciones_select_policy" ON public.ticket_historial_asignaciones;

-- ============================================================================
-- PASO 3: Habilitar RLS en todas las tablas
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estatus_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_adjuntos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_bitacora ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_historial_asignaciones ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 4: Crear políticas simplificadas usando funciones helper
-- ============================================================================

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------
-- Todos pueden ver perfiles (necesario para mostrar nombres en la UI)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

-- Usuario puede actualizar su propio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Admin puede actualizar cualquier perfil
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Admin puede insertar perfiles
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- ROLES (catálogo - solo lectura para usuarios normales)
-- -----------------------------------------------------------------------------
CREATE POLICY "roles_select" ON public.roles
  FOR SELECT USING (true);

CREATE POLICY "roles_manage_admin" ON public.roles
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- EQUIPOS (catálogo - solo lectura para usuarios normales)
-- -----------------------------------------------------------------------------
CREATE POLICY "equipos_select" ON public.equipos
  FOR SELECT USING (true);

CREATE POLICY "equipos_manage_admin" ON public.equipos
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- HORARIOS (catálogo - solo lectura para usuarios normales)
-- -----------------------------------------------------------------------------
CREATE POLICY "horarios_select" ON public.horarios
  FOR SELECT USING (true);

CREATE POLICY "horarios_manage_admin" ON public.horarios
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- CATEGORIAS_SERVICIO (catálogo - solo lectura para usuarios normales)
-- -----------------------------------------------------------------------------
CREATE POLICY "categorias_servicio_select" ON public.categorias_servicio
  FOR SELECT USING (true);

CREATE POLICY "categorias_servicio_manage_admin" ON public.categorias_servicio
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- ESTATUS_TICKETS (catálogo - solo lectura para usuarios normales)
-- -----------------------------------------------------------------------------
CREATE POLICY "estatus_tickets_select" ON public.estatus_tickets
  FOR SELECT USING (true);

CREATE POLICY "estatus_tickets_manage_admin" ON public.estatus_tickets
  FOR ALL USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- CLIENTES
-- -----------------------------------------------------------------------------
CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT USING (true);

CREATE POLICY "clientes_manage" ON public.clientes
  FOR ALL USING (public.is_admin_or_supervisor());

-- -----------------------------------------------------------------------------
-- SUCURSALES
-- -----------------------------------------------------------------------------
CREATE POLICY "sucursales_select" ON public.sucursales
  FOR SELECT USING (true);

CREATE POLICY "sucursales_manage" ON public.sucursales
  FOR ALL USING (public.is_admin_or_supervisor());

-- -----------------------------------------------------------------------------
-- TICKETS
-- -----------------------------------------------------------------------------
-- Admin puede ver todos los tickets
CREATE POLICY "tickets_select_admin" ON public.tickets
  FOR SELECT USING (public.is_admin());

-- Usuario puede ver sus tickets (creados por él o asignados a él)
CREATE POLICY "tickets_select_own" ON public.tickets
  FOR SELECT USING (
    responsable_id = auth.uid()
    OR creado_por = auth.uid()
  );

-- Usuario puede ver tickets donde es participante
CREATE POLICY "tickets_select_participant" ON public.tickets
  FOR SELECT USING (public.is_ticket_participant(id));

-- Usuarios autenticados pueden crear tickets
CREATE POLICY "tickets_insert" ON public.tickets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Responsable puede actualizar su ticket
CREATE POLICY "tickets_update_responsable" ON public.tickets
  FOR UPDATE USING (responsable_id = auth.uid());

-- Admin puede actualizar cualquier ticket
CREATE POLICY "tickets_update_admin" ON public.tickets
  FOR UPDATE USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- TICKET_PARTICIPANTES
-- -----------------------------------------------------------------------------
-- Lectura: usuario es participante, o es dueño del ticket, o es admin
CREATE POLICY "ticket_participantes_select" ON public.ticket_participantes
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR public.is_ticket_owner_or_responsible(ticket_id)
    OR public.is_admin()
  );

-- Insert: admin o dueño del ticket
CREATE POLICY "ticket_participantes_insert" ON public.ticket_participantes
  FOR INSERT WITH CHECK (
    public.is_ticket_owner_or_responsible(ticket_id)
    OR public.is_admin()
  );

-- Delete: admin o dueño del ticket
CREATE POLICY "ticket_participantes_delete" ON public.ticket_participantes
  FOR DELETE USING (
    public.is_ticket_owner_or_responsible(ticket_id)
    OR public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- TICKET_ADJUNTOS
-- -----------------------------------------------------------------------------
CREATE POLICY "ticket_adjuntos_select" ON public.ticket_adjuntos
  FOR SELECT USING (
    subido_por = auth.uid()
    OR public.can_view_ticket(ticket_id)
  );

CREATE POLICY "ticket_adjuntos_insert" ON public.ticket_adjuntos
  FOR INSERT WITH CHECK (
    public.can_view_ticket(ticket_id)
  );

-- -----------------------------------------------------------------------------
-- TICKET_BITACORA
-- -----------------------------------------------------------------------------
CREATE POLICY "ticket_bitacora_select" ON public.ticket_bitacora
  FOR SELECT USING (
    usuario_id = auth.uid()
    OR public.can_view_ticket(ticket_id)
  );

CREATE POLICY "ticket_bitacora_insert" ON public.ticket_bitacora
  FOR INSERT WITH CHECK (
    public.can_view_ticket(ticket_id)
  );

-- -----------------------------------------------------------------------------
-- TICKET_HISTORIAL_ASIGNACIONES
-- -----------------------------------------------------------------------------
CREATE POLICY "ticket_historial_asignaciones_select" ON public.ticket_historial_asignaciones
  FOR SELECT USING (
    de_usuario_id = auth.uid()
    OR a_usuario_id = auth.uid()
    OR public.can_view_ticket(ticket_id)
  );

CREATE POLICY "ticket_historial_asignaciones_insert" ON public.ticket_historial_asignaciones
  FOR INSERT WITH CHECK (
    public.is_admin_or_supervisor()
    OR public.is_ticket_owner_or_responsible(ticket_id)
  );

-- ============================================================================
-- PASO 5: Políticas de Storage para avatars
-- ============================================================================
-- Nota: Estas políticas deben crearse en la UI de Supabase o via SQL directo

-- La siguiente es una referencia para crear en Supabase Dashboard:
-- INSERT INTO storage.policies (bucket_id, name, definition, operation, ...)
-- Para el bucket 'avatars':
-- SELECT: true (público)
-- INSERT: auth.uid() = (storage.foldername(name))[1]::uuid
-- UPDATE: auth.uid() = (storage.foldername(name))[1]::uuid
-- DELETE: auth.uid() = (storage.foldername(name))[1]::uuid

-- ============================================================================
-- PASO 6: Verificación
-- ============================================================================
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
