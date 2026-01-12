-- ============================================================================
-- 07. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Descripción: Habilita y configura políticas de seguridad a nivel de fila
-- ============================================================================

-- Habilitar RLS en tablas principales
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
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
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Policies para tickets (básicas, se refinan en siguiente fase)
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
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  );

-- Verificación
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
