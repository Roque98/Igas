-- ============================================================================
-- Migration: Enable Realtime for Notifications
-- ============================================================================
-- Habilita Supabase Realtime para la tabla notificaciones
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================================

-- 1. Habilitar la publicación de la tabla notificaciones para Realtime
-- Esto permite que los cambios en la tabla se transmitan a los clientes
ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;

-- Verificar que la tabla está en la publicación
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================================================
-- NOTA IMPORTANTE:
-- Si obtienes un error "relation already exists in publication", la tabla
-- ya está habilitada para Realtime y puedes ignorar el error.
-- ============================================================================
