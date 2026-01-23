# Fase 3: Escalamiento - Módulo de Casos

## Objetivo
Implementar el módulo de Casos para escalamiento de tickets a otras áreas (Dev, Implementación, Facturación, Proveedor, Cobranza) con control de tiempo y notificaciones por email.

---

## Tareas

### 1. Modelo de Datos - Casos en Supabase

#### 1.1 Tabla Principal de Casos

```sql
CREATE TABLE public.casos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folio TEXT UNIQUE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) NOT NULL,
  cliente_id UUID REFERENCES clientes(id) NOT NULL, -- Denormalizado para facilitar queries
  problema_descripcion TEXT,
  area_destino TEXT CHECK (area_destino IN ('Dev', 'Implementación', 'Facturación', 'Proveedor', 'Cobranza')) NOT NULL,
  motivo TEXT CHECK (motivo IN ('Bug', 'Mejora', 'Configuración', 'Proveedor', 'Administrativo')) NOT NULL,
  responsable_id UUID REFERENCES profiles(id),
  prioridad TEXT CHECK (prioridad IN ('Crítica', 'Alta', 'Media', 'Baja')),
  estatus_id UUID REFERENCES estatus_casos(id) NOT NULL,
  sla_objetivo_minutos INTEGER NOT NULL,
  fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
  fecha_primera_respuesta TIMESTAMPTZ,
  fecha_resolucion TIMESTAMPTZ,
  fecha_compromiso DATE,
  tiempo_pausado_minutos INTEGER DEFAULT 0,
  resultado TEXT CHECK (resultado IN ('Listo para validar', 'Regresa a soporte', 'Cerrado')),
  numero_caso_externo TEXT, -- Número de caso del área de desarrollo
  email_enviado BOOLEAN DEFAULT false,
  creado_por UUID REFERENCES profiles(id) NOT NULL,
  cerrado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_casos_folio ON casos(folio);
CREATE INDEX idx_casos_ticket ON casos(ticket_id);
CREATE INDEX idx_casos_cliente ON casos(cliente_id);
CREATE INDEX idx_casos_area ON casos(area_destino);
CREATE INDEX idx_casos_responsable ON casos(responsable_id);
CREATE INDEX idx_casos_estatus ON casos(estatus_id);
CREATE INDEX idx_casos_fecha_creacion ON casos(fecha_creacion DESC);
```

#### 1.2 Tablas Relacionadas

```sql
-- Bitácora de casos
CREATE TABLE public.caso_bitacora (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  tipo TEXT CHECK (tipo IN ('nota', 'cambio_estatus', 'asignacion', 'adjunto', 'email_enviado', 'numero_caso_recibido')) NOT NULL,
  mensaje TEXT,
  datos_adicionales JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adjuntos de casos
CREATE TABLE public.caso_adjuntos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  ruta_storage TEXT NOT NULL,
  tipo_archivo TEXT,
  tamanio_bytes BIGINT,
  subido_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Participantes
CREATE TABLE public.caso_participantes (
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (caso_id, usuario_id)
);

-- Historial de asignaciones
CREATE TABLE public.caso_historial_asignaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  caso_id UUID REFERENCES casos(id) ON DELETE CASCADE,
  de_usuario_id UUID REFERENCES profiles(id),
  a_usuario_id UUID REFERENCES profiles(id),
  motivo TEXT,
  asignado_por UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.3 Catálogos

```sql
-- Estatus de casos
CREATE TABLE public.estatus_casos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  orden INTEGER,
  pausa_sla BOOLEAN DEFAULT false,
  es_final BOOLEAN DEFAULT false,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO estatus_casos (nombre, orden, pausa_sla, es_final, color) VALUES
  ('Nuevo', 1, false, false, '#1de9b6'),
  ('En proceso', 2, false, false, '#04a9f5'),
  ('En espera', 3, true, false, '#f4c22b'),
  ('Listo para validar', 4, false, false, '#00A651'),
  ('Regresado a soporte', 5, false, true, '#a389d4'),
  ('Cerrado', 6, false, true, '#748892');

-- Áreas destino
CREATE TABLE public.areas_destino (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  email_notificacion TEXT,
  responsable_default_id UUID REFERENCES profiles(id),
  sla_default_horas INTEGER,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO areas_destino (nombre, email_notificacion, sla_default_horas) VALUES
  ('Dev', 'desarrollo@igas.mx', 48),
  ('Implementación', 'implementacion@igas.mx', 72),
  ('Facturación', 'facturacion@igas.mx', 24),
  ('Proveedor', 'proveedores@igas.mx', 96),
  ('Cobranza', 'cobranza@igas.mx', 48);
```

### 2. Sistema de Folios para Casos

```sql
-- Secuencia por año
CREATE SEQUENCE caso_folio_seq;

-- Función para generar folio CASO-AAAA-####
CREATE OR REPLACE FUNCTION generar_folio_caso()
RETURNS TEXT AS $$
DECLARE
  anio TEXT;
  numero INTEGER;
  folio TEXT;
BEGIN
  anio := EXTRACT(YEAR FROM NOW())::TEXT;
  numero := nextval('caso_folio_seq');

  -- Reset secuencia si cambió el año
  IF numero > 1 AND NOT EXISTS (
    SELECT 1 FROM casos
    WHERE folio LIKE 'CASO-' || anio || '-%'
  ) THEN
    ALTER SEQUENCE caso_folio_seq RESTART WITH 1;
    numero := nextval('caso_folio_seq');
  END IF;

  folio := 'CASO-' || anio || '-' || LPAD(numero::TEXT, 4, '0');
  RETURN folio;
END;
$$ LANGUAGE plpgsql;

-- Trigger para asignar folio automáticamente
CREATE OR REPLACE FUNCTION asignar_folio_caso()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.folio IS NULL THEN
    NEW.folio := generar_folio_caso();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asignar_folio_caso
  BEFORE INSERT ON casos
  FOR EACH ROW EXECUTE FUNCTION asignar_folio_caso();
```

### 3. Sistema de Email para Escalamiento

#### 3.1 Función para Enviar Email (Supabase Edge Function)

```typescript
// supabase/functions/enviar-email-escalamiento/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { caso_id } = await req.json()

  // Obtener datos del caso
  const { data: caso } = await supabaseAdmin
    .from('casos')
    .select(`
      *,
      ticket:tickets(folio, descripcion),
      cliente:clientes(nombre_comercial),
      area:areas_destino(email_notificacion)
    `)
    .eq('id', caso_id)
    .single()

  // Enviar email usando Resend o SendGrid
  const emailHTML = `
    <h2>Nuevo Caso Escalado - ${caso.folio}</h2>
    <p><strong>Ticket Origen:</strong> ${caso.ticket.folio}</p>
    <p><strong>Cliente:</strong> ${caso.cliente.nombre_comercial}</p>
    <p><strong>Área:</strong> ${caso.area_destino}</p>
    <p><strong>Motivo:</strong> ${caso.motivo}</p>
    <p><strong>Prioridad:</strong> ${caso.prioridad}</p>
    <p><strong>Descripción:</strong> ${caso.problema_descripcion}</p>
    <p><a href="${Deno.env.get('APP_URL')}/casos/${caso.id}">Ver caso en el sistema</a></p>
  `

  await enviarEmail({
    to: caso.area.email_notificacion,
    subject: `[iGAS] Nuevo Caso ${caso.folio} - ${caso.motivo}`,
    html: emailHTML
  })

  // Actualizar flag de email enviado
  await supabaseAdmin
    .from('casos')
    .update({ email_enviado: true })
    .eq('id', caso_id)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

- [ ] Crear Edge Function para envío de emails
- [ ] Configurar servicio de email (Resend/SendGrid)
- [ ] Crear templates de email HTML
- [ ] Implementar llamada desde trigger o desde Angular

#### 3.2 Trigger para Enviar Email Automáticamente

```sql
-- Opción: Usar webhook de Supabase para llamar Edge Function
CREATE OR REPLACE FUNCTION notificar_nuevo_caso()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en bitácora
  INSERT INTO caso_bitacora (caso_id, usuario_id, tipo, mensaje, datos_adicionales)
  VALUES (
    NEW.id,
    NEW.creado_por,
    'email_enviado',
    'Email de escalamiento enviado',
    jsonb_build_object('area', NEW.area_destino)
  );

  -- Aquí se podría invocar Edge Function o usar webhook
  -- Por ahora registramos el evento

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_nuevo_caso
  AFTER INSERT ON casos
  FOR EACH ROW EXECUTE FUNCTION notificar_nuevo_caso();
```

### 4. Integración Ticket ↔ Caso

#### 4.1 Vincular Ticket con Caso

```sql
-- Agregar campo a tickets
ALTER TABLE tickets ADD COLUMN caso_id UUID REFERENCES casos(id);
ALTER TABLE tickets ADD COLUMN esta_escalado BOOLEAN DEFAULT false;

-- Agregar estatus "Escalado" a tickets
INSERT INTO estatus_tickets (nombre, orden, pausa_sla, es_final, color)
VALUES ('Escalado', 7, true, false, '#9575cd');

-- Función para crear caso desde ticket
CREATE OR REPLACE FUNCTION escalar_ticket_a_caso(
  p_ticket_id UUID,
  p_area_destino TEXT,
  p_motivo TEXT,
  p_descripcion TEXT,
  p_fecha_compromiso DATE
) RETURNS UUID AS $$
DECLARE
  v_caso_id UUID;
  v_ticket RECORD;
  v_estatus_escalado UUID;
BEGIN
  -- Obtener ticket
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;

  -- Obtener estatus "Escalado"
  SELECT id INTO v_estatus_escalado FROM estatus_tickets WHERE nombre = 'Escalado';

  -- Crear caso
  INSERT INTO casos (
    ticket_id,
    cliente_id,
    problema_descripcion,
    area_destino,
    motivo,
    prioridad,
    estatus_id,
    sla_objetivo_minutos,
    fecha_compromiso,
    creado_por
  )
  SELECT
    v_ticket.id,
    v_ticket.cliente_id,
    p_descripcion,
    p_area_destino,
    p_motivo,
    v_ticket.prioridad,
    (SELECT id FROM estatus_casos WHERE nombre = 'Nuevo'),
    (SELECT sla_default_horas * 60 FROM areas_destino WHERE nombre = p_area_destino),
    p_fecha_compromiso,
    auth.uid()
  RETURNING id INTO v_caso_id;

  -- Actualizar ticket
  UPDATE tickets
  SET
    caso_id = v_caso_id,
    esta_escalado = true,
    estatus_id = v_estatus_escalado
  WHERE id = p_ticket_id;

  -- Registrar en bitácora del ticket
  INSERT INTO ticket_bitacora (ticket_id, usuario_id, tipo, mensaje, datos_adicionales)
  VALUES (
    p_ticket_id,
    auth.uid(),
    'escalamiento',
    'Ticket escalado a ' || p_area_destino,
    jsonb_build_object('caso_id', v_caso_id, 'area', p_area_destino, 'motivo', p_motivo)
  );

  RETURN v_caso_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. Vista de Casos con SLA

```sql
CREATE OR REPLACE VIEW casos_con_sla AS
SELECT
  c.*,
  EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos as minutos_transcurridos,
  CASE
    WHEN EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos < c.sla_objetivo_minutos * 0.7
      THEN 'verde'
    WHEN EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos <= c.sla_objetivo_minutos
      THEN 'amarillo'
    ELSE 'rojo'
  END as semaforo,
  ROUND(
    ((EXTRACT(EPOCH FROM (NOW() - c.fecha_creacion))/60 - c.tiempo_pausado_minutos) / c.sla_objetivo_minutos * 100)::NUMERIC,
    2
  ) as porcentaje_sla
FROM casos c;
```

### 6. Row Level Security para Casos

```sql
ALTER TABLE casos ENABLE ROW LEVEL SECURITY;

-- Usuarios del área pueden ver sus casos
CREATE POLICY "Usuarios ven casos de su área"
  ON casos FOR SELECT
  USING (
    area_destino IN (
      SELECT e.nombre
      FROM profiles p
      JOIN equipos e ON p.area_equipo_id = e.id
      WHERE p.id = auth.uid()
    ) OR
    responsable_id = auth.uid()
  );

-- Coordinadores y Admins ven todos
CREATE POLICY "Coordinadores y Admins ven todos los casos"
  ON casos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.rol_id = r.id
      WHERE p.id = auth.uid()
        AND r.nombre IN ('Coordinador', 'Admin')
    )
  );

-- Solo usuarios autenticados pueden crear casos
CREATE POLICY "Usuarios pueden crear casos"
  ON casos FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Responsable o coordinador puede actualizar
CREATE POLICY "Responsable o Coordinador puede actualizar caso"
  ON casos FOR UPDATE
  USING (
    responsable_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.rol_id = r.id
      WHERE p.id = auth.uid()
        AND r.nombre IN ('Coordinador', 'Admin')
    )
  );
```

### 7. Backend - Servicio Angular

#### 7.1 CasoService

```typescript
export interface Caso {
  id: string;
  folio: string;
  ticket_id: string;
  cliente_id: string;
  problema_descripcion?: string;
  area_destino: 'Dev' | 'Implementación' | 'Facturación' | 'Proveedor' | 'Cobranza';
  motivo: 'Bug' | 'Mejora' | 'Configuración' | 'Proveedor' | 'Administrativo';
  responsable_id?: string;
  prioridad?: string;
  estatus_id: string;
  sla_objetivo_minutos: number;
  fecha_creacion: string;
  fecha_compromiso?: string;
  resultado?: 'Listo para validar' | 'Regresa a soporte' | 'Cerrado';
  numero_caso_externo?: string;
  email_enviado: boolean;

  // Campos calculados
  semaforo?: 'verde' | 'amarillo' | 'rojo';
  porcentaje_sla?: number;
  minutos_transcurridos?: number;
}
```

- [ ] Crear CasoService
- [ ] Implementar escalarTicket(ticketId, datos)
- [ ] Implementar getCasos(filtros)
- [ ] Implementar getCasoById(id)
- [ ] Implementar updateCaso(id, data)
- [ ] Implementar cambiarEstatus(id, estatusId, nota)
- [ ] Implementar asignarCaso(id, usuarioId)
- [ ] Implementar marcarListoParaValidar(id, notas)
- [ ] Implementar regresarASoporte(id, motivo)
- [ ] Implementar cerrarCaso(id, resultado)
- [ ] Implementar registrarNumeroExterno(id, numero)
- [ ] Implementar getCasoTimeline(id)
- [ ] Implementar agregarNota(casoId, nota)
- [ ] Implementar subirAdjunto(casoId, file)
- [ ] Implementar enviarEmailEscalamiento(casoId)

### 8. Frontend - Módulo de Casos

#### 8.1 Vista Principal de Casos

- [ ] Crear módulo features/casos
- [ ] Crear componente de listado:
  - [ ] Tabla con columnas: Folio, Ticket Origen, Cliente, Área, Motivo, Responsable, Estatus, Semáforo, SLA %, Fecha Compromiso
  - [ ] Badge de área con color por tipo
  - [ ] Badge de motivo
  - [ ] Semáforo visual
  - [ ] Indicador si tiene número externo
  - [ ] Indicador si email fue enviado
  - [ ] Filtros:
    - Por área (select)
    - Por semáforo
    - Por estatus
    - Por responsable
    - Por motivo
    - Por fecha compromiso (vencidos/por vencer)
  - [ ] Búsqueda por folio
  - [ ] Ordenamiento
  - [ ] Paginación

#### 8.2 Modal de Escalamiento (desde Ticket)

- [ ] Crear componente modal de escalamiento:
  - [ ] Se abre desde detalle de ticket
  - [ ] Selector de área destino
  - [ ] Selector de motivo
  - [ ] Textarea de descripción adicional
  - [ ] Date picker de fecha compromiso
  - [ ] Checkbox "Enviar email inmediatamente"
  - [ ] Preview de datos antes de confirmar
  - [ ] Loading state
  - [ ] Confirmación de creación
  - [ ] Redirigir a detalle del caso creado

#### 8.3 Detalle de Caso

- [ ] Crear componente de detalle:
  - [ ] Header con folio del caso
  - [ ] Link al ticket origen (prominente)
  - [ ] Badge de área con color corporativo
  - [ ] Badge de semáforo
  - [ ] Barra de progreso SLA
  - [ ] Card de información:
    - Cliente
    - Área destino
    - Motivo
    - Prioridad
    - Responsable
    - Estatus
    - Fecha compromiso (destacado si está próximo/vencido)
    - Número de caso externo (si existe)
    - Email enviado (check/cross)
  - [ ] Timeline de bitácora
  - [ ] Sección de adjuntos
  - [ ] Área de acciones:
    - Cambiar estatus
    - Asignar/reasignar
    - Registrar número de caso externo
    - Marcar como "Listo para validar"
    - Regresar a soporte
    - Cerrar caso
    - Agregar nota
    - Subir adjunto
    - Reenviar email

#### 8.4 Acciones sobre Casos

- [ ] Implementar cambio de estatus:
  - [ ] Modal con selector
  - [ ] Nota obligatoria
  - [ ] Actualizar fechas
- [ ] Implementar asignación/reasignación:
  - [ ] Filtrar usuarios por área
  - [ ] Registrar en historial
  - [ ] Notificar
- [ ] Implementar "Listo para validar":
  - [ ] Modal con notas de resolución
  - [ ] Cambiar estatus
  - [ ] Notificar a soporte/ticket original
  - [ ] Actualizar ticket relacionado
- [ ] Implementar "Regresar a soporte":
  - [ ] Modal con motivo obligatorio
  - [ ] Cambiar estatus del caso
  - [ ] Cambiar estatus del ticket a "En atención"
  - [ ] Notificar al responsable del ticket
  - [ ] Agregar nota en ticket
- [ ] Implementar cierre de caso:
  - [ ] Validar que tenga resultado
  - [ ] Modal de confirmación
  - [ ] Actualizar ticket relacionado si aplica
  - [ ] Cerrar caso
- [ ] Implementar registro de número externo:
  - [ ] Modal simple con input
  - [ ] Guardar y registrar en bitácora

#### 8.5 Integración en Vista de Ticket

- [ ] En detalle de ticket, mostrar:
  - [ ] Badge "Escalado" si tiene caso
  - [ ] Link al caso relacionado
  - [ ] Estatus actual del caso
  - [ ] Área a la que se escaló
  - [ ] Botón "Escalar a caso" (si no está escalado)

### 9. Panel de Reportes de Casos

#### 9.1 Dashboard de Casos

- [ ] Crear dashboard de casos:
  - [ ] Widget: Total de casos activos
  - [ ] Widget: Casos por área (gráfica pie)
  - [ ] Widget: Casos por semáforo
  - [ ] Widget: Casos próximos a vencer
  - [ ] Gráfica de cumplimiento SLA por área
  - [ ] Top 5 casos más antiguos
  - [ ] Lista de casos vencidos

---

## Entregables

- [ ] Módulo de casos completamente funcional
- [ ] Integración ticket → caso operativa
- [ ] Sistema de email para escalamiento
- [ ] Control de tiempo y SLA para casos
- [ ] Vista separada de casos con filtros por área
- [ ] Flujo completo de escalamiento
- [ ] Flujo de regreso a soporte
- [ ] Registro de número de caso externo
- [ ] RLS policies implementadas

## Dependencias

- Fase 1: Usuarios y autenticación
- Fase 2: Módulo de tickets (CRÍTICO)
- Supabase Edge Functions (para emails)

## Criterios de Aceptación

- [ ] Tickets pueden escalarse a casos correctamente
- [ ] Email se envía al área correspondiente automáticamente
- [ ] Número de caso externo puede registrarse
- [ ] SLA de casos se calcula correctamente
- [ ] Casos pueden marcarse como "Listo para validar"
- [ ] Casos pueden regresar a soporte con notas
- [ ] Filtros por área, semáforo y estatus funcionan
- [ ] Permisos por área se respetan (RLS)
- [ ] Ticket y caso permanecen vinculados

## Notas Técnicas Supabase

- Usar **Edge Functions** para envío de emails
- **Triggers** para automatizar creación de bitácora
- **RLS** para seguridad por área
- Considerar **Realtime** para actualizaciones de casos
- **Storage** para adjuntos de casos
- Función **escalar_ticket_a_caso()** como transacción atómica
