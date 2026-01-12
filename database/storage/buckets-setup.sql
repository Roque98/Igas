-- ============================================================================
-- CONFIGURACIÓN DE STORAGE BUCKETS
-- ============================================================================
-- Descripción: Configuración de buckets de almacenamiento para adjuntos
-- ============================================================================

-- ============================================================================
-- 1. CREAR BUCKET PRINCIPAL PARA ADJUNTOS DE TICKETS
-- ============================================================================

-- Nota: Los buckets se crean desde la interfaz de Supabase Storage o mediante API
-- Este archivo documenta la configuración que debe aplicarse

-- CONFIGURACIÓN DEL BUCKET "ticket-attachments":
-- - Nombre: ticket-attachments
-- - Public: false (archivos privados, solo accesibles con autenticación)
-- - File size limit: 10MB
-- - Allowed MIME types:
--   - images/*
--   - application/pdf
--   - application/msword
--   - application/vnd.openxmlformats-officedocument.wordprocessingml.document
--   - application/vnd.ms-excel
--   - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
--   - text/plain
--   - application/zip

-- ============================================================================
-- 2. POLÍTICAS DE STORAGE (STORAGE POLICIES)
-- ============================================================================

-- Política: Los usuarios pueden subir archivos a sus propios tickets
CREATE POLICY "Users can upload files to their tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    -- El path debe seguir el patrón: ticket_id/filename
    -- Verificar que el usuario tiene acceso al ticket
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.responsable_id = auth.uid()
        OR t.creado_por = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.ticket_participantes tp
          WHERE tp.ticket_id = t.id AND tp.usuario_id = auth.uid()
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  )
);

-- Política: Los usuarios pueden ver archivos de sus tickets
CREATE POLICY "Users can view files from their tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.responsable_id = auth.uid()
        OR t.creado_por = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.ticket_participantes tp
          WHERE tp.ticket_id = t.id AND tp.usuario_id = auth.uid()
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  )
);

-- Política: Los usuarios pueden actualizar archivos de sus tickets
CREATE POLICY "Users can update files from their tickets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.responsable_id = auth.uid()
        OR t.creado_por = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  )
);

-- Política: Solo responsables/creadores y admins pueden eliminar archivos
CREATE POLICY "Users can delete files from their tickets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments'
  AND auth.uid() IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id::text = (storage.foldername(name))[1]
      AND (
        t.responsable_id = auth.uid()
        OR t.creado_por = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.rol_id IN (SELECT id FROM public.roles WHERE nombre = 'Administrador')
    )
  )
);

-- ============================================================================
-- 3. VERIFICACIÓN
-- ============================================================================

-- Verificar políticas de storage
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
ORDER BY policyname;

-- ============================================================================
-- 4. ESTRUCTURA DE PATHS RECOMENDADA
-- ============================================================================

-- Los archivos deben organizarse de la siguiente manera:
-- ticket-attachments/
--   └── {ticket_id}/
--       ├── {timestamp}_{filename}.pdf
--       ├── {timestamp}_{filename}.jpg
--       └── ...

-- Ejemplo:
-- ticket-attachments/a1b2c3d4-e5f6-7890-abcd-ef1234567890/1736611200_cotizacion.pdf

-- ============================================================================
-- 5. NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

/*
PASO 1: Crear el bucket desde la interfaz de Supabase
  1. Ir a Storage en el dashboard de Supabase
  2. Crear nuevo bucket con nombre "ticket-attachments"
  3. Configurar como privado (public: false)
  4. Establecer límite de tamaño: 10MB

PASO 2: Aplicar políticas de Storage
  1. En Supabase dashboard, ir a Storage > Policies
  2. Ejecutar cada una de las políticas CREATE POLICY de arriba
  3. Verificar que las políticas se crearon correctamente

PASO 3: Configurar en la aplicación Angular
  1. Usar SupabaseService para subir archivos
  2. Al subir un archivo, usar el path: {ticket_id}/{timestamp}_{filename}
  3. Registrar en la tabla ticket_adjuntos los metadatos del archivo

PASO 4: Ejemplo de uso en TypeScript
  ```typescript
  async uploadAttachment(ticketId: string, file: File): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const filePath = `${ticketId}/${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('ticket-attachments')
      .upload(filePath, file);

    if (error) throw error;

    // Registrar en ticket_adjuntos
    await this.supabase.from('ticket_adjuntos').insert({
      ticket_id: ticketId,
      nombre_archivo: file.name,
      ruta_storage: filePath,
      tipo_archivo: file.type,
      tamanio_bytes: file.size
    });

    return data.path;
  }
  ```

TIPOS DE ARCHIVO PERMITIDOS:
  - Imágenes: .jpg, .jpeg, .png, .gif, .webp
  - Documentos: .pdf, .doc, .docx, .xls, .xlsx, .txt
  - Comprimidos: .zip

LÍMITES:
  - Tamaño máximo por archivo: 10MB
  - Total de almacenamiento: Según plan de Supabase
*/
