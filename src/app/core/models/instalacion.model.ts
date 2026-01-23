// ============================================================================
// Instalacion Models
// ============================================================================
// Modelos y tipos para el sistema de instalaciones
// ============================================================================

import { EvidenciaTipo } from './mantenimiento.model';

// ============================================================================
// Tipos Base
// ============================================================================

export type InstalacionEstatus = 'Programada' | 'En proceso' | 'Pendientes' | 'Cerrada';
export type PendientePrioridad = 'Alta' | 'Media' | 'Baja';

// ============================================================================
// Interfaces de Catálogos
// ============================================================================

export interface EstatusInstalacion {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  orden: number;
  es_final: boolean;
  created_at: string;
}

export interface ModuloSistema {
  id: string;
  nombre: string;
  descripcion?: string;
  version_actual?: string;
  requiere_capacitacion: boolean;
  activo: boolean;
  orden: number;
  created_at: string;
}

// ============================================================================
// Interfaces de Instalación
// ============================================================================

export interface Instalacion {
  id: string;
  folio: string;
  cliente_id: string;
  sucursal_id?: string;
  estatus_id: string;
  tecnico_id?: string;

  fecha_programada: string;
  hora_programada?: string;
  fecha_inicio?: string;
  fecha_fin?: string;

  contacto_cliente?: string;
  telefono_contacto?: string;
  email_contacto?: string;

  firma_cliente_url?: string;
  nombre_firmante?: string;
  puesto_firmante?: string;
  firmado_at?: string;

  observaciones?: string;
  notas_internas?: string;

  creado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface InstalacionCompleta extends Instalacion {
  // Datos del cliente
  cliente_nombre?: string;
  cliente_nombre_comercial?: string;
  sucursal_nombre?: string;

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
  total_modulos?: number;
  checklist_total?: number;
  checklist_completados?: number;
  total_pendientes?: number;
  pendientes_abiertos?: number;
  total_evidencias?: number;
  tiene_firma?: boolean;
}

export interface InstalacionModulo {
  id: string;
  instalacion_id: string;
  modulo_id: string;
  version_instalada?: string;
  configuracion_especial?: string;
  created_at: string;

  // Relaciones
  modulo?: ModuloSistema;
}

export interface InstalacionChecklist {
  id: string;
  instalacion_id: string;
  modulo_id?: string;
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

  // Relaciones
  modulo_nombre?: string;
}

export interface InstalacionPendiente {
  id: string;
  instalacion_id: string;
  descripcion: string;
  prioridad: PendientePrioridad;
  responsable?: string;
  fecha_compromiso?: string;

  resuelto: boolean;
  resuelto_por?: string;
  resuelto_at?: string;
  notas_resolucion?: string;

  ticket_id?: string;

  creado_por?: string;
  created_at: string;
  updated_at: string;

  // Computed
  ticket_folio?: string;
}

export interface InstalacionEvidencia {
  id: string;
  instalacion_id: string;
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

export interface CreateInstalacionDTO {
  cliente_id: string;
  sucursal_id?: string;
  tecnico_id?: string;
  modulos_ids: string[];

  fecha_programada: string;
  hora_programada?: string;

  contacto_cliente?: string;
  telefono_contacto?: string;
  email_contacto?: string;
  notas_internas?: string;
}

export interface UpdateInstalacionDTO {
  cliente_id?: string;
  sucursal_id?: string;
  estatus_id?: string;
  tecnico_id?: string;

  fecha_programada?: string;
  hora_programada?: string;
  fecha_inicio?: string;
  fecha_fin?: string;

  contacto_cliente?: string;
  telefono_contacto?: string;
  email_contacto?: string;
  observaciones?: string;
  notas_internas?: string;
}

export interface FirmarInstalacionDTO {
  firma_base64: string;
  nombre_firmante: string;
  puesto_firmante?: string;
}

export interface CreatePendienteDTO {
  descripcion: string;
  prioridad?: PendientePrioridad;
  responsable?: string;
  fecha_compromiso?: string;
}

export interface UpdatePendienteDTO {
  descripcion?: string;
  prioridad?: PendientePrioridad;
  responsable?: string;
  fecha_compromiso?: string;
}

export interface ResolverPendienteDTO {
  notas_resolucion?: string;
}

// Note: EjecutarChecklistItemDTO is already defined in mantenimiento.model.ts

// ============================================================================
// Filtros
// ============================================================================

export interface InstalacionFilters {
  search?: string;
  cliente_id?: string;
  sucursal_id?: string;
  estatus_id?: string;
  estatus_nombre?: InstalacionEstatus;
  tecnico_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  tiene_pendientes?: boolean;
  solo_mis_instalaciones?: boolean;
}

// ============================================================================
// Pipeline
// ============================================================================

export interface InstalacionPorEstatus {
  estatus_id: string;
  estatus_nombre: string;
  estatus_color: string;
  estatus_orden: number;
  total: number;
}

export interface InstalacionCard {
  id: string;
  folio: string;
  cliente_nombre: string;
  sucursal_nombre?: string;
  fecha_programada: string;
  tecnico_nombre?: string;
  total_modulos: number;
  checklist_total: number;
  checklist_completados: number;
  pendientes_abiertos: number;
  tiene_firma: boolean;
}

// ============================================================================
// Estadísticas
// ============================================================================

export interface InstalacionStats {
  total: number;
  programadas: number;
  en_proceso: number;
  con_pendientes: number;
  cerradas: number;
  por_modulo: {
    nombre: string;
    cantidad: number;
  }[];
  promedio_pendientes: number;
}

// ============================================================================
// Constantes
// ============================================================================

export const PRIORIDAD_PENDIENTE_CONFIG: Record<PendientePrioridad, { color: string; icon: string; label: string }> = {
  'Alta': { color: '#dc3545', icon: 'alert-triangle', label: 'Alta' },
  'Media': { color: '#ffc107', icon: 'minus', label: 'Media' },
  'Baja': { color: '#28a745', icon: 'arrow-down', label: 'Baja' }
};

export const ESTATUS_INSTALACION_CONFIG: Record<InstalacionEstatus, { color: string; icon: string }> = {
  'Programada': { color: '#17a2b8', icon: 'calendar' },
  'En proceso': { color: '#ffc107', icon: 'loader' },
  'Pendientes': { color: '#fd7e14', icon: 'alert-circle' },
  'Cerrada': { color: '#28a745', icon: 'check-circle' }
};
