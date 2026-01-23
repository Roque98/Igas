// ============================================================================
// Reporte Models
// ============================================================================
// Modelos y tipos para el sistema de reportes
// ============================================================================

// ============================================================================
// FILTROS
// ============================================================================

export interface ReporteTicketsFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  cliente_id?: string;
  categoria_id?: string;
  responsable_id?: string;
  prioridad?: string;
  estatus_id?: string;
}

export interface ReporteCasosFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  cliente_id?: string;
  area_destino?: string;
  responsable_id?: string;
  motivo?: string;
  estatus_id?: string;
}

export interface ReporteProductividadFilters {
  fecha_inicio?: string;
  fecha_fin?: string;
  usuario_id?: string;
}

// ============================================================================
// RESUMEN DE TICKETS
// ============================================================================

export interface TicketResumen {
  total: number;
  abiertos: number;
  cerrados: number;
  por_prioridad: { prioridad: string; total: number }[];
  por_categoria: { categoria: string; total: number }[];
  por_estatus: { estatus: string; total: number }[];
  tiempo_promedio_respuesta_hrs: number | null;
  tiempo_promedio_resolucion_hrs: number | null;
  cumplimiento_sla_respuesta_pct: number | null;
  cumplimiento_sla_resolucion_pct: number | null;
  semaforo_verde: number;
  semaforo_amarillo: number;
  semaforo_rojo: number;
}

export interface TicketTendenciaMensual {
  periodo_mes: string;
  total: number;
  cerrados: number;
  abiertos: number;
}

// ============================================================================
// RESUMEN DE CASOS
// ============================================================================

export interface CasoResumen {
  total: number;
  abiertos: number;
  cerrados: number;
  por_area: { area: string; total: number }[];
  por_motivo: { motivo: string; total: number }[];
  por_estatus: { estatus: string; total: number }[];
  tiempo_promedio_resolucion_hrs: number | null;
  cumplimiento_compromiso_pct: number | null;
  semaforo_verde: number;
  semaforo_amarillo: number;
  semaforo_rojo: number;
}

export interface CasoTendenciaMensual {
  periodo_mes: string;
  total: number;
  cerrados: number;
  abiertos: number;
}

// ============================================================================
// PRODUCTIVIDAD
// ============================================================================

export interface ProductividadUsuario {
  responsable_id: string;
  responsable_nombre: string;
  tickets_asignados: number;
  tickets_cerrados: number;
  promedio_horas_respuesta: number | null;
  promedio_horas_resolucion: number | null;
  cumplimiento_sla_pct: number | null;
}

// ============================================================================
// DATOS DETALLADOS PARA TABLAS
// ============================================================================

export interface TicketReporteDetalle {
  id: string;
  folio: string;
  titulo: string;
  fecha_creacion: string;
  fecha_cierre?: string;
  prioridad: string;
  semaforo: string;
  cliente_nombre: string;
  categoria_nombre: string;
  estatus_nombre: string;
  responsable_nombre?: string;
  horas_respuesta?: number;
  horas_resolucion?: number;
  sla_respuesta_cumplido?: boolean;
  sla_resolucion_cumplido?: boolean;
}

export interface CasoReporteDetalle {
  id: string;
  folio: string;
  descripcion: string;
  fecha_creacion: string;
  fecha_compromiso?: string;
  fecha_cierre?: string;
  area_destino: string;
  motivo: string;
  prioridad: string;
  semaforo: string;
  cliente_nombre: string;
  estatus_nombre: string;
  responsable_nombre?: string;
  horas_resolucion?: number;
  cumplimiento_compromiso?: boolean;
}

// ============================================================================
// CONFIGURACIÓN DE COLORES
// ============================================================================

export const COLORES_PRIORIDAD: Record<string, string> = {
  'Crítica': '#dc3545',
  'Alta': '#fd7e14',
  'Media': '#ffc107',
  'Baja': '#28a745'
};

export const COLORES_SEMAFORO: Record<string, string> = {
  'verde': '#28a745',
  'amarillo': '#ffc107',
  'rojo': '#dc3545'
};

export const COLORES_AREA: Record<string, string> = {
  'Desarrollo': '#4680ff',
  'Calidad': '#17a2b8',
  'Soporte': '#28a745',
  'Infraestructura': '#fd7e14',
  'Comercial': '#6f42c1'
};

// Paleta de colores iGAS para gráficas
export const COLORES_IGAS = [
  '#F9B000', // Amarillo iGAS
  '#4CAF50', // Verde
  '#04a9f5', // Azul
  '#f44236', // Rojo
  '#a389d4', // Morado
  '#1de9b6', // Turquesa
  '#fd7e14', // Naranja
  '#6c757d', // Gris
  '#17a2b8', // Cyan
  '#e83e8c'  // Rosa
];

// ============================================================================
// EXPORTACIÓN
// ============================================================================

export interface ExportConfig {
  titulo: string;
  subtitulo?: string;
  fechaGeneracion: string;
  filtrosAplicados?: Record<string, string>;
}

export type ExportFormat = 'pdf' | 'excel';
