-- ============================================================================
-- 01. EXTENSIONES NECESARIAS
-- ============================================================================
-- Descripción: Habilita las extensiones de PostgreSQL necesarias para el sistema
-- Ejecutar primero antes de cualquier otra migración
-- ============================================================================

-- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Extensión para funciones criptográficas
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Verificación
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto');
