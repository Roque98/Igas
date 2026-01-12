# Fase 6: Notificaciones, Alertas y Reportes

## Objetivo
Implementar sistema completo de notificaciones push/email, alertas automáticas y generador de reportes operativos con dashboards y gráficas usando ApexCharts.

---

## Tareas

### 1. Sistema de Notificaciones

#### 1.1 Tabla de Notificaciones (Ya creada parcialmente)

```sql
-- Extender tabla de notificaciones
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS prioridad TEXT CHECK (prioridad IN ('Alta', 'Media', 'Baja')) DEFAULT 'Media';
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS url_accion TEXT;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS icono TEXT;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS enviado_email BOOLEAN DEFAULT false;
ALTER TABLE notificaciones ADD COLUMN IF NOT EXISTS fecha_email TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created ON notificaciones(created_at DESC);
```

#### 1.2 Tipos de Notificaciones

```sql
-- Catálogo de tipos de notificaciones
CREATE TABLE public.tipos_notificacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  enviar_push BOOLEAN DEFAULT true,
  enviar_email BOOLEAN DEFAULT false,
  template_email TEXT,
  icono TEXT,
  color TEXT,
  prioridad TEXT DEFAULT 'Media',
  activo BOOLEAN DEFAULT true
);

INSERT INTO tipos_notificacion (codigo, nombre, enviar_push, enviar_email, icono, color, prioridad) VALUES
  ('ticket_asignado', 'Ticket asignado', true, false, 'assignment', '#04a9f5', 'Media'),
  ('ticket_reasignado', 'Ticket reasignado', true, false, 'swap_horiz', '#f4c22b', 'Media'),
  ('ticket_nuevo', 'Nuevo ticket', true, false, 'add_circle', '#1de9b6', 'Baja'),
  ('ticket_comentario', 'Nuevo comentario en ticket', true, false, 'comment', '#a389d4', 'Baja'),
  ('ticket_cambio_estatus', 'Cambio de estatus de ticket', true, false, 'cached', '#3ebfea', 'Baja'),
  ('ticket_sla_amarillo', 'Ticket en SLA amarillo', true, true, 'warning', '#FFC107', 'Media'),
  ('ticket_sla_rojo', 'Ticket en SLA rojo', true, true, 'error', '#F44336', 'Alta'),
  ('caso_asignado', 'Caso asignado', true, true, 'work', '#04a9f5', 'Alta'),
  ('caso_listo_validar', 'Caso listo para validar', true, true, 'check_circle', '#00A651', 'Alta'),
  ('caso_regresado', 'Caso regresado a soporte', true, true, 'undo', '#f44236', 'Alta'),
  ('licencia_por_vencer', 'Licencia próxima a vencer', true, true, 'vpn_key', '#f4c22b', 'Alta'),
  ('licencia_vencida', 'Licencia vencida', true, true, 'vpn_key_off', '#f44236', 'Alta'),
  ('poliza_por_vencer', 'Póliza próxima a vencer', true, true, 'description', '#f4c22b', 'Alta'),
  ('poliza_vencida', 'Póliza vencida', true, true, 'report_problem', '#f44236', 'Alta'),
  ('mantenimiento_programado', 'Mantenimiento programado', true, false, 'build', '#04a9f5', 'Media'),
  ('instalacion_programada', 'Instalación programada', true, false, 'construction', '#1de9b6', 'Media');
```

#### 1.3 Preferencias de Notificaciones por Usuario

```sql
CREATE TABLE public.usuario_preferencias_notificaciones (
  usuario_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tipo_notificacion_codigo TEXT REFERENCES tipos_notificacion(codigo),
  recibir_push BOOLEAN DEFAULT true,
  recibir_email BOOLEAN DEFAULT true,
  PRIMARY KEY (usuario_id, tipo_notificacion_codigo)
);
```

#### 1.4 Función Genérica para Crear Notificaciones

```sql
CREATE OR REPLACE FUNCTION crear_notificacion(
  p_usuario_id UUID,
  p_tipo_codigo TEXT,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_datos JSONB DEFAULT NULL,
  p_url_accion TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_tipo RECORD;
  v_notif_id UUID;
  v_preferencia RECORD;
BEGIN
  -- Obtener tipo de notificación
  SELECT * INTO v_tipo FROM tipos_notificacion WHERE codigo = p_tipo_codigo;

  -- Verificar preferencias del usuario
  SELECT * INTO v_preferencia
  FROM usuario_preferencias_notificaciones
  WHERE usuario_id = p_usuario_id AND tipo_notificacion_codigo = p_tipo_codigo;

  -- Si no existe preferencia, usar defaults del tipo
  IF NOT FOUND THEN
    v_preferencia.recibir_push := v_tipo.enviar_push;
    v_preferencia.recibir_email := v_tipo.enviar_email;
  END IF;

  -- Solo crear si el usuario quiere recibirla
  IF v_preferencia.recibir_push THEN
    INSERT INTO notificaciones (
      usuario_id,
      tipo,
      titulo,
      mensaje,
      datos,
      url_accion,
      icono,
      color,
      prioridad,
      enviado_email
    ) VALUES (
      p_usuario_id,
      p_tipo_codigo,
      p_titulo,
      p_mensaje,
      p_datos,
      p_url_accion,
      v_tipo.icono,
      v_tipo.color,
      v_tipo.prioridad,
      false
    ) RETURNING id INTO v_notif_id;

    -- Si debe enviar email, marcar para envío
    IF v_preferencia.recibir_email AND v_tipo.enviar_email THEN
      -- Esto será procesado por un job/edge function
      UPDATE notificaciones
      SET enviado_email = false
      WHERE id = v_notif_id;
    END IF;

    RETURN v_notif_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Sistema de Recordatorios Automáticos

#### 2.1 Tabla de Recordatorios

```sql
CREATE TABLE public.recordatorios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT CHECK (tipo IN ('ticket_sin_respuesta', 'ticket_seguimiento', 'caso_sin_movimiento')),
  referencia_id UUID NOT NULL,
  usuario_id UUID REFERENCES profiles(id),
  mensaje TEXT,
  tiempo_sin_movimiento_horas INTEGER,
  notificacion_enviada BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2.2 Job para Recordatorios (Edge Function o pg_cron)

```sql
-- Detectar tickets sin movimiento
CREATE OR REPLACE FUNCTION generar_recordatorios_tickets()
RETURNS void AS $$
BEGIN
  -- Tickets sin respuesta en 24 horas
  INSERT INTO recordatorios (tipo, referencia_id, usuario_id, mensaje, tiempo_sin_movimiento_horas)
  SELECT
    'ticket_sin_respuesta',
    t.id,
    t.responsable_id,
    'El ticket ' || t.folio || ' no ha tenido respuesta en 24 horas',
    24
  FROM tickets t
  WHERE
    t.estatus_id NOT IN (SELECT id FROM estatus_tickets WHERE es_final = true) AND
    t.responsable_id IS NOT NULL AND
    t.fecha_primera_respuesta IS NULL AND
    EXTRACT(EPOCH FROM (NOW() - t.fecha_creacion))/3600 >= 24 AND
    NOT EXISTS (
      SELECT 1 FROM recordatorios r
      WHERE r.tipo = 'ticket_sin_respuesta'
        AND r.referencia_id = t.id
        AND r.created_at > NOW() - INTERVAL '24 hours'
    );

  -- Tickets en seguimiento demasiado tiempo
  INSERT INTO recordatorios (tipo, referencia_id, usuario_id, mensaje, tiempo_sin_movimiento_horas)
  SELECT
    'ticket_seguimiento',
    t.id,
    t.responsable_id,
    'El ticket ' || t.folio || ' está en seguimiento hace más de 48 horas',
    48
  FROM tickets t
  JOIN estatus_tickets e ON t.estatus_id = e.id
  WHERE
    e.nombre = 'Seguimiento' AND
    t.updated_at < NOW() - INTERVAL '48 hours' AND
    NOT EXISTS (
      SELECT 1 FROM recordatorios r
      WHERE r.tipo = 'ticket_seguimiento'
        AND r.referencia_id = t.id
        AND r.created_at > NOW() - INTERVAL '48 hours'
    );

  -- Crear notificaciones de recordatorios
  INSERT INTO notificaciones (usuario_id, tipo, titulo, mensaje, datos)
  SELECT
    r.usuario_id,
    'recordatorio_' || r.tipo,
    'Recordatorio',
    r.mensaje,
    jsonb_build_object('recordatorio_id', r.id, 'referencia_id', r.referencia_id)
  FROM recordatorios r
  WHERE r.notificacion_enviada = false;

  -- Marcar como enviados
  UPDATE recordatorios SET notificacion_enviada = true WHERE notificacion_enviada = false;
END;
$$ LANGUAGE plpgsql;
```

### 3. Sistema de Emails

#### 3.1 Supabase Edge Function para Envío de Emails

```typescript
// supabase/functions/enviar-notificaciones-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Obtener notificaciones pendientes de envío por email
  const { data: notificaciones } = await supabaseAdmin
    .from('notificaciones')
    .select(`
      *,
      usuario:profiles(email, nombre_completo)
    `)
    .eq('enviado_email', false)
    .eq('leida', false)
    .limit(50)

  for (const notif of notificaciones) {
    // Obtener template del tipo
    const { data: tipo } = await supabaseAdmin
      .from('tipos_notificacion')
      .select('template_email')
      .eq('codigo', notif.tipo)
      .single()

    const emailHTML = renderTemplate(tipo.template_email, {
      nombre: notif.usuario.nombre_completo,
      titulo: notif.titulo,
      mensaje: notif.mensaje,
      url_accion: notif.url_accion
    })

    // Enviar email
    await sendEmail({
      to: notif.usuario.email,
      subject: `[iGAS] ${notif.titulo}`,
      html: emailHTML
    })

    // Marcar como enviado
    await supabaseAdmin
      .from('notificaciones')
      .update({ enviado_email: true, fecha_email: new Date() })
      .eq('id', notif.id)
  }

  return new Response(JSON.stringify({ enviados: notificaciones.length }))
})
```

- [ ] Crear Edge Function para envío de emails
- [ ] Configurar Resend o SendGrid
- [ ] Crear templates HTML de emails
- [ ] Programar ejecución cada 5 minutos

### 4. Frontend - Sistema de Notificaciones

#### 4.1 Servicio de Notificaciones

```typescript
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificaciones$ = new BehaviorSubject<Notificacion[]>([]);
  private noLeidas$ = new BehaviorSubject<number>(0);

  constructor(private supabase: SupabaseService) {
    this.subscribeToNotifications();
  }

  private subscribeToNotifications() {
    // Suscribirse a cambios en tiempo real con Supabase Realtime
    this.supabase.client
      .channel('notificaciones')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${this.supabase.user?.id}`
      }, (payload) => {
        this.addNotification(payload.new);
        this.playNotificationSound();
        this.showToast(payload.new);
      })
      .subscribe();

    this.loadNotifications();
  }
}
```

- [ ] Crear NotificationService
- [ ] Implementar suscripción a Realtime
- [ ] Implementar getNotificaciones()
- [ ] Implementar marcarComoLeida(id)
- [ ] Implementar marcarTodasComoLeidas()
- [ ] Implementar eliminarNotificacion(id)
- [ ] Implementar contador de no leídas
- [ ] Implementar sonido de notificación
- [ ] Implementar toast/snackbar para nuevas notificaciones

#### 4.2 Componente de Notificaciones en Navbar

- [ ] Crear componente notification-bell:
  - [ ] Icono de campana
  - [ ] Badge con contador de no leídas (rojo iGAS si >0)
  - [ ] Dropdown con últimas 10 notificaciones
  - [ ] Scroll infinito para cargar más
  - [ ] Click en notificación:
    - Marcar como leída
    - Navegar a url_accion si existe
  - [ ] Botón "Marcar todas como leídas"
  - [ ] Link "Ver todas"

#### 4.3 Página de Centro de Notificaciones

- [ ] Crear página completa de notificaciones:
  - [ ] Tabs: Todas / No leídas / Leídas
  - [ ] Filtros por tipo
  - [ ] Agrupadas por fecha (Hoy, Ayer, Esta semana, etc.)
  - [ ] Acciones: Eliminar, Marcar leída/no leída
  - [ ] Paginación

#### 4.4 Configuración de Preferencias

- [ ] Crear página de preferencias de notificaciones:
  - [ ] Tabla con todos los tipos de notificación
  - [ ] Switches para activar/desactivar push
  - [ ] Switches para activar/desactivar email
  - [ ] Guardar preferencias por usuario

### 5. Sistema de Reportes

#### 5.1 Modelos de Reportes

```sql
-- Vista para reporte de tickets
CREATE OR REPLACE VIEW reporte_tickets AS
SELECT
  t.id,
  t.folio,
  t.fecha_creacion,
  c.nombre_comercial as cliente,
  cat.nombre as categoria,
  t.prioridad,
  e.nombre as estatus,
  p.nombre_completo as responsable,
  CASE
    WHEN t.fecha_cierre IS NOT NULL THEN
      EXTRACT(EPOCH FROM (t.fecha_cierre - t.fecha_creacion))/3600
    ELSE NULL
  END as horas_resolucion,
  CASE
    WHEN t.semaforo = 'verde' THEN 'Cumplido'
    ELSE 'Incumplido'
  END as cumplimiento_sla
FROM tickets_con_sla t
JOIN clientes c ON t.cliente_id = c.id
JOIN categorias_servicio cat ON t.categoria_id = cat.id
JOIN estatus_tickets e ON t.estatus_id = e.id
LEFT JOIN profiles p ON t.responsable_id = p.id;

-- Vista para reporte de casos
CREATE OR REPLACE VIEW reporte_casos AS
SELECT
  c.id,
  c.folio,
  c.fecha_creacion,
  cli.nombre_comercial as cliente,
  c.area_destino,
  c.motivo,
  e.nombre as estatus,
  p.nombre_completo as responsable,
  c.fecha_compromiso,
  CASE
    WHEN c.fecha_cierre IS NOT NULL THEN
      EXTRACT(EPOCH FROM (c.fecha_cierre - c.fecha_creacion))/3600
    ELSE NULL
  END as horas_resolucion,
  c.semaforo
FROM casos_con_sla c
JOIN clientes cli ON c.cliente_id = cli.id
JOIN estatus_casos e ON c.estatus_id = e.id
LEFT JOIN profiles p ON c.responsable_id = p.id;
```

#### 5.2 Backend - ReporteService

```typescript
export interface ReporteTickets {
  total: number;
  nuevos: number;
  en_proceso: number;
  resueltos: number;
  cerrados: number;
  cumplimiento_sla: number;
  tiempo_promedio_resolucion: number;
  por_categoria: { categoria: string; total: number }[];
  por_prioridad: { prioridad: string; total: number }[];
  tendencia_mensual: { mes: string; total: number }[];
}
```

- [ ] Crear ReporteService
- [ ] Implementar getReporteTickets(filtros)
- [ ] Implementar getReporteCasos(filtros)
- [ ] Implementar getReporteProductividad(usuarioId, fechas)
- [ ] Implementar getReporteClientes()
- [ ] Implementar getReporteVencimientos()
- [ ] Implementar exportarAPDF(reporte)
- [ ] Implementar exportarAExcel(reporte)

### 6. Frontend - Módulo de Reportes

#### 6.1 Dashboard Principal

- [ ] Crear dashboard principal con widgets:
  - **Tickets**:
    - Total activos
    - Nuevos hoy
    - En SLA rojo
    - Mis tickets
  - **Casos**:
    - Total activos
    - Por área
    - Casos vencidos
  - **Clientes**:
    - Total clientes activos
    - Licencias por vencer (30 días)
    - Pólizas por vencer (30 días)
  - **Gráficas (ApexCharts)**:
    - Tickets por categoría (Pie chart)
    - Tendencia mensual de tickets (Line chart)
    - Cumplimiento de SLA (Gauge/Radial bar)
    - Casos por área (Bar chart)
  - Usar colores corporativos iGAS

#### 6.2 Reporte de Tickets

- [ ] Crear página de reporte de tickets:
  - [ ] Filtros:
    - Rango de fechas
    - Cliente
    - Categoría
    - Prioridad
    - Responsable
    - Estatus
  - [ ] Métricas:
    - Total de tickets
    - % Cumplimiento SLA
    - Tiempo promedio de resolución
    - Tickets reabiertos
  - [ ] Gráficas:
    - Tickets por periodo (línea)
    - Por categoría (pie)
    - Por prioridad (bar)
    - Por responsable (bar horizontal)
  - [ ] Tabla detallada
  - [ ] Botones: Exportar PDF, Exportar Excel

#### 6.3 Reporte de Casos

- [ ] Crear página de reporte de casos:
  - [ ] Filtros similares a tickets
  - [ ] Métricas:
    - Total de casos
    - Por área
    - % Cumplimiento
    - Tiempo promedio por área
  - [ ] Gráficas con ApexCharts
  - [ ] Exportación

#### 6.4 Reporte de Productividad

- [ ] Crear página de productividad por usuario:
  - [ ] Selector de usuario
  - [ ] Selector de periodo
  - [ ] Métricas:
    - Tickets atendidos
    - Tickets resueltos
    - % Cumplimiento SLA
    - Tiempo promedio de respuesta
    - Tiempo promedio de resolución
  - [ ] Ranking de usuarios
  - [ ] Gráfica de tendencia

#### 6.5 Reporte de Vencimientos

- [ ] Crear página de vencimientos:
  - [ ] Tab: Licencias
    - Vencidas
    - Por vencer (45/30/15 días)
    - Lista detallada con cliente
  - [ ] Tab: Pólizas
    - Vencidas
    - Por vencer (30 días)
    - Lista detallada
  - [ ] Exportación a Excel
  - [ ] Gráficas de vencimientos por mes

### 7. Componentes de Gráficas (ApexCharts)

#### 7.1 Wrapper Components

```typescript
@Component({
  selector: 'app-chart-line',
  template: `<apx-chart [series]="series" [chart]="chart" [xaxis]="xaxis"></apx-chart>`
})
export class ChartLineComponent {
  @Input() series: any[];
  @Input() categories: string[];
  chart = { type: 'line', height: 350 };
  xaxis = { categories: this.categories };
}
```

- [ ] Crear ChartLineComponent
- [ ] Crear ChartBarComponent
- [ ] Crear ChartPieComponent
- [ ] Crear ChartDonutComponent
- [ ] Crear ChartRadialBarComponent (para SLA)
- [ ] Crear ChartAreaComponent
- [ ] Aplicar colores iGAS en todos los charts

### 8. Exportación de Reportes

#### 8.1 Exportar a PDF

```typescript
// Usar jsPDF + html2canvas
exportToPDF(elemento: ElementRef, nombreArchivo: string) {
  html2canvas(elemento.nativeElement).then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF();
    pdf.addImage(imgData, 'PNG', 10, 10);
    pdf.save(nombreArchivo);
  });
}
```

- [ ] Instalar jsPDF y html2canvas
- [ ] Crear servicio ExportService
- [ ] Implementar exportToPDF()
- [ ] Agregar logo iGAS en PDF
- [ ] Agregar encabezado y pie de página

#### 8.2 Exportar a Excel

```typescript
// Usar xlsx (SheetJS)
exportToExcel(data: any[], nombreArchivo: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, nombreArchivo);
}
```

- [ ] Instalar xlsx
- [ ] Implementar exportToExcel()
- [ ] Formatear columnas (fechas, números)
- [ ] Agregar estilos (opcional con xlsx-style)

---

## Entregables

- [ ] Sistema de notificaciones push en tiempo real
- [ ] Sistema de emails automáticos
- [ ] Centro de notificaciones completo
- [ ] Preferencias de notificaciones configurables
- [ ] Recordatorios automáticos
- [ ] Dashboard principal con métricas
- [ ] Reportes de tickets completos
- [ ] Reportes de casos
- [ ] Reporte de productividad
- [ ] Reporte de vencimientos
- [ ] Gráficas interactivas con ApexCharts
- [ ] Exportación a PDF y Excel

## Dependencias

- Todas las fases anteriores (0-5)
- Supabase Realtime
- Supabase Edge Functions

## Criterios de Aceptación

- [ ] Notificaciones aparecen en tiempo real
- [ ] Contador de no leídas se actualiza automáticamente
- [ ] Emails se envían según preferencias
- [ ] Recordatorios se generan automáticamente
- [ ] Dashboard muestra métricas actualizadas
- [ ] Reportes se pueden filtrar por fechas
- [ ] Gráficas son interactivas y responsivas
- [ ] Exportación a PDF incluye logo y formato
- [ ] Exportación a Excel incluye datos formateados

## Notas Técnicas

- **Supabase Realtime** para notificaciones instantáneas
- **Edge Functions** para envío de emails programado
- **ApexCharts** para todas las gráficas
- **jsPDF** para exportación PDF
- **xlsx** para exportación Excel
- Usar **Web Push API** para notificaciones de navegador (opcional)
- Considerar **Service Worker** para notificaciones offline
- **Colores iGAS** en todas las gráficas (#F9B000, #4CAF50, #FFC107, #F44336)
