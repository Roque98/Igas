-- ============================================================================
-- 06. FUNCIONES Y TRIGGERS
-- ============================================================================
-- Descripción: Crea funciones y triggers para automatización
-- ============================================================================

-- Función para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, email, rol_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', 'Usuario'),
    NEW.email,
    (SELECT id FROM public.roles WHERE nombre = 'Agente' LIMIT 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear profile automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de updated_at a todas las tablas relevantes
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sucursales_updated_at BEFORE UPDATE ON public.sucursales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar folio de ticket
CREATE OR REPLACE FUNCTION public.generar_folio_ticket()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_folio TEXT;
  contador INTEGER;
BEGIN
  -- Obtener el contador del día actual
  SELECT COUNT(*) + 1 INTO contador
  FROM public.tickets
  WHERE DATE(fecha_creacion) = CURRENT_DATE;

  -- Generar folio: IGAS-YYYYMMDD-XXXX
  nuevo_folio := 'IGAS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(contador::TEXT, 4, '0');

  NEW.folio := nuevo_folio;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar folio automáticamente
CREATE TRIGGER generate_ticket_folio
  BEFORE INSERT ON public.tickets
  FOR EACH ROW
  WHEN (NEW.folio IS NULL)
  EXECUTE FUNCTION public.generar_folio_ticket();

-- Verificación
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('handle_new_user', 'update_updated_at_column', 'generar_folio_ticket');

SELECT
  trigger_name,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
