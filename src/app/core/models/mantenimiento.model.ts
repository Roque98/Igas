// ============================================================================
// Mantenimiento Models
// ============================================================================
// Modelos y tipos para el sistema de mantenimientos
// ============================================================================

// ============================================================================
// Tipos Base
// ============================================================================

export type MantenimientoResultado = 'Completado' | 'Parcial' | 'Requiere acción' | 'No realizado';
export type EvidenciaTipo = 'foto' | 'documento' | 'video' | 'otro';

// ============================================================================
// Interfaces de Catálogos
// ============================================================================

export interface TipoMantenimiento {
  id: string;
  nombre: string;
  descripcion?: string;
  requiere_checklist: boolean;
  color: string;
  icono: string;
  activo: boolean;
  created_at: string;
}

export interface EstatusMantenimiento {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  orden: number;
  es_final: boolean;
  created_at: string;
}

export interface ChecklistTemplate {
  id: string;
  nombre: string;
  tipo: 'mantenimiento' | 'instalacion';
  tipo_mantenimiento_id?: string;
  modulo_id?: string;
  descripcion?: string;
  activo: boolean;
  created_at: string;
  updated_at: string;

  // Relaciones
  items?: ChecklistItemTemplate[];
}

export interface ChecklistItemTemplate {
  id: string;
  template_id: string;
  descripcion: string;
  orden: number;
  obligatorio: boolean;
  requiere_evidencia: boolean;
  requiere_notas: boolean;
  created_at: string;
}

// ============================================================================
// Interfaces de Mantenimiento
// ============================================================================

export interface Mantenimiento {
  id: string;
  folio: string;
  cliente_id: string;
  sucursal_id?: string;
  tipo_mantenimiento_id: string;
  estatus_id: string;
  tecnico_id?: string;
  template_checklist_id?: string;

  fecha_programada: string;
  hora_programada?: string;
  fecha_inicio?: string;
  fecha_fin?: string;

  resultado?: MantenimientoResultado;
  observaciones?: string;
  recomendaciones?: string;

  ticket_generado_id?: string;

  contacto_cliente?: string;
  telefono_contacto?: string;
  notas_internas?: string;

  creado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface MantenimientoCompleto extends Mantenimiento {
  // Datos del cliente
  cliente_nombre?: string;
  cliente_nombre_comercial?: string;
  sucursal_nombre?: string;

  // Datos del tipo
  tipo_mantenimiento_nombre?: string;
  tipo_mantenimiento_color?: string;
  tipo_mantenimiento_icono?: string;

  // Datos del estatus
  estatus_nombre?: string;
  estatus_color?: string;
  estatus_es_final?: boolean;

  // Datos del técnico
  tecnico_nombre?: string;
  tecnico_avatar?: string;

  // Datos del creador
  creador_nombre?: string;

  // Conteos
  checklist_total?: number;
  checklist_completados?: number;
  total_evidencias?: number;
}

export interface MantenimientoChecklist {
  id: string;
  mantenimiento_id: string;
  item_template_id?: string;
  descripcion: string;
  orden: number;
  obligatorio: boolean;

  completado: boolean;
  completado_por?: string;
  completado_at?: string;
  notas?: string;

  requiere_evidencia: boolean;
  tiene_evidencia: boolean;

  created_at: string;
}

export interface MantenimientoEvidencia {
  id: string;
  mantenimiento_id: string;
  checklist_item_id?: string;

  tipo: EvidenciaTipo;
  nombre_archivo: string;
  ruta_storage: string;
  tipo_archivo?: string;
  tamanio_bytes?: number;
  descripcion?: string;

  subido_por?: string;
  created_at: string;

  // Computed
  url?: string;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateMantenimientoDTO {
  cliente_id: string;
  sucursal_id?: string;
  tipo_mantenimiento_id: string;
  tecnico_id?: string;
  template_checklist_id?: string;

  fecha_programada: string;
  hora_programada?: string;

  contacto_cliente?: string;
  telefono_contacto?: string;
  notas_internas?: string;
}

export interface UpdateMantenimientoDTO {
  cliente_id?: string;
  sucursal_id?: string;
  tipo_mantenimiento_id?: string;
  estatus_id?: string;
  tecnico_id?: string;

  fecha_programada?: string;
  hora_programada?: string;
  fecha_inicio?: string;
  fecha_fin?: string;

  resultado?: MantenimientoResultado;
  observaciones?: string;
  recomendaciones?: string;

  contacto_cliente?: string;
  telefono_contacto?: string;
  notas_internas?: string;
}

export interface FinalizarMantenimientoDTO {
  resultado: MantenimientoResultado;
  observaciones?: string;
  recomendaciones?: string;
}

export interface EjecutarChecklistItemDTO {
  completado: boolean;
  notas?: string;
}

// ============================================================================
// Filtros
// ============================================================================

export interface MantenimientoFilters {
  search?: string;
  cliente_id?: string;
  sucursal_id?: string;
  tipo_mantenimiento_id?: string;
  estatus_id?: string;
  tecnico_id?: string;
  resultado?: MantenimientoResultado;
  fecha_desde?: string;
  fecha_hasta?: string;
  mes?: number;
  anio?: number;
  solo_mis_mantenimientos?: boolean;
}

// ============================================================================
// Calendario
// ============================================================================

export interface MantenimientoCalendario {
  id: string;
  folio: string;
  fecha_programada: string;
  cliente_nombre: string;
  tipo_mantenimiento_nombre: string;
  tipo_mantenimiento_color: string;
  estatus_nombre: string;
  estatus_color: string;
  tecnico_nombre?: string;
}

export interface DiaCalendario {
  fecha: Date;
  dia: number;
  esHoy: boolean;
  esMesActual: boolean;
  mantenimientos: MantenimientoCalendario[];
}

// ============================================================================
// Estadísticas
// ============================================================================

export interface MantenimientoStats {
  total: number;
  programados: number;
  en_proceso: number;
  completados: number;
  cancelados: number;
  por_tipo: {
    nombre: string;
    cantidad: number;
    color: string;
  }[];
  por_resultado: {
    resultado: MantenimientoResultado;
    cantidad: number;
  }[];
}

// ============================================================================
// Constantes
// ============================================================================

export const RESULTADO_CONFIG: Record<MantenimientoResultado, { color: string; icon: string; label: string }> = {
  'Completado': { color: '#28a745', icon: 'check-circle', label: 'Completado' },
  'Parcial': { color: '#ffc107', icon: 'alert-triangle', label: 'Parcial' },
  'Requiere acción': { color: '#dc3545', icon: 'alert-circle', label: 'Requiere acción' },
  'No realizado': { color: '#6c757d', icon: 'x-circle', label: 'No realizado' }
};

export const EVIDENCIA_TIPO_CONFIG: Record<EvidenciaTipo, { icon: string; label: string }> = {
  'foto': { icon: 'feather icon-image', label: 'Foto' },
  'documento': { icon: 'feather icon-file-text', label: 'Documento' },
  'video': { icon: 'feather icon-video', label: 'Video' },
  'otro': { icon: 'feather icon-file', label: 'Otro' }
};

export const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
