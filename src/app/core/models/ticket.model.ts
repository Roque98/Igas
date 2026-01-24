// ============================================================================
// Ticket Models
// ============================================================================
// Modelos y tipos para el sistema de tickets de soporte
// ============================================================================

// ============================================================================
// Tipos Base
// ============================================================================

export type TicketPrioridad = 'Crítica' | 'Alta' | 'Media' | 'Baja';
export type TicketCanal = 'Teléfono' | 'WhatsApp' | 'Correo' | 'Portal' | 'Presencial';
export type TicketSemaforo = 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris';
export type BitacoraTipo = 'nota' | 'cambio_estatus' | 'asignacion' | 'adjunto' | 'escalamiento' | 'pausa' | 'reanudacion';

// Aliases for components
export type Prioridad = TicketPrioridad;
export type SemaforoSLA = TicketSemaforo;

// ============================================================================
// Interfaces de Catálogos
// ============================================================================

export interface CategoriaServicio {
  id: string;
  nombre: string;
  descripcion?: string;
  sla_minutos: number;
  color: string;
  icono?: string;
  parent_id?: string;
  orden: number;
  estatus: 'Activo' | 'Inactivo';
  created_at: string;
}

export interface EstatusTicket {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  orden: number;
  es_final: boolean;
  pausa_sla: boolean;
  created_at: string;
}

export interface CanalContacto {
  id: string;
  nombre: string;
  icono?: string;
  activo: boolean;
  created_at: string;
}

export interface SLAConfig {
  id: string;
  nombre: string;
  prioridad?: TicketPrioridad;
  categoria_id?: string;
  cliente_id?: string;
  tiempo_objetivo_minutos: number;
  tiempo_primera_respuesta_minutos?: number;
  aplica_horario_habil: boolean;
  activo: boolean;
  created_at: string;
}

export interface DiaFestivo {
  id: string;
  fecha: string;
  descripcion?: string;
  anual: boolean;
  created_at: string;
}

// ============================================================================
// Interfaces de Ticket
// ============================================================================

export interface Ticket {
  id: string;
  folio: string;
  cliente_id?: string;
  sucursal_id?: string;
  categoria_id: string;
  prioridad: TicketPrioridad;
  canal: TicketCanal;
  responsable_id?: string;
  equipo_id?: string;
  titulo?: string;
  descripcion: string;
  estatus_id: string;
  sla_objetivo_minutos: number;
  fecha_creacion: string;
  fecha_primera_respuesta?: string;
  fecha_resolucion?: string;
  fecha_cierre?: string;
  tiempo_pausado_minutos: number;
  creado_por: string;
  cerrado_por?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TicketConSLA extends Ticket {
  // Datos del cliente
  cliente_nombre?: string;
  cliente_nombre_comercial?: string;
  sucursal_nombre?: string;

  // Datos de categoría
  categoria_nombre?: string;
  categoria_color?: string;
  categoria_icono?: string;

  // Datos de estatus
  estatus_nombre?: string;
  estatus_color?: string;
  estatus_es_final?: boolean;
  estatus_pausa_sla?: boolean;

  // Datos de responsable
  responsable_nombre?: string;
  responsable_avatar?: string;

  // Datos del creador
  creador_nombre?: string;

  // Datos del equipo
  equipo_nombre?: string;

  // Cálculos de SLA
  minutos_transcurridos?: number;
  semaforo?: TicketSemaforo;
  porcentaje_sla?: number;
  minutos_restantes?: number;

  // Conteos
  total_notas?: number;
  total_adjuntos?: number;
}

// ============================================================================
// Interfaces de Tablas Relacionadas
// ============================================================================

export interface TicketParticipante {
  ticket_id: string;
  usuario_id: string;
  rol_participacion: 'Responsable' | 'Observador' | 'Colaborador';
  created_at: string;

  // Relaciones
  usuario?: {
    nombre_completo: string;
    avatar_url?: string;
    email: string;
  };
}

export interface TicketAdjunto {
  id: string;
  ticket_id: string;
  nombre_archivo: string;
  ruta_storage: string;
  tipo_archivo?: string;
  tamanio_bytes?: number;
  subido_por: string;
  created_at: string;

  // Relaciones
  usuario?: {
    nombre_completo: string;
  };

  // Computed
  url?: string;
}

export interface TicketBitacora {
  id: string;
  ticket_id: string;
  usuario_id?: string;
  tipo: BitacoraTipo;
  mensaje?: string;
  datos_adicionales?: Record<string, any>;
  es_publico: boolean;
  created_at: string;

  // Relaciones
  usuario?: {
    nombre_completo: string;
    avatar_url?: string;
  };
}

export interface TicketHistorialAsignacion {
  id: string;
  ticket_id: string;
  de_usuario_id?: string;
  a_usuario_id: string;
  motivo?: string;
  created_at: string;

  // Relaciones
  de_usuario?: {
    nombre_completo: string;
  };
  a_usuario?: {
    nombre_completo: string;
  };
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateTicketDTO {
  cliente_id?: string;
  sucursal_id?: string;
  categoria_id: string;
  prioridad: TicketPrioridad;
  canal: TicketCanal;
  responsable_id?: string;
  equipo_id?: string;
  titulo?: string;
  descripcion: string;
  sla_objetivo_minutos?: number;
  metadata?: Record<string, any>;
}

export interface UpdateTicketDTO {
  cliente_id?: string;
  sucursal_id?: string;
  categoria_id?: string;
  prioridad?: TicketPrioridad;
  canal?: TicketCanal;
  responsable_id?: string;
  equipo_id?: string;
  titulo?: string;
  descripcion?: string;
  estatus_id?: string;
  metadata?: Record<string, any>;
}

export interface CambiarEstatusDTO {
  estatus_id: string;
  nota?: string;
}

export interface AsignarTicketDTO {
  usuario_id: string;
  motivo?: string;
}

export interface AgregarNotaDTO {
  mensaje: string;
  es_publico?: boolean;
}

// ============================================================================
// Filtros
// ============================================================================

export interface TicketFilters {
  search?: string;
  folio?: string;
  cliente_id?: string;
  categoria_id?: string;
  prioridad?: TicketPrioridad;
  estatus_id?: string;
  estatus_ids?: string[];
  responsable_id?: string;
  equipo_id?: string;
  semaforo?: TicketSemaforo;
  canal?: TicketCanal;
  fecha_desde?: string;
  fecha_hasta?: string;
  solo_mis_tickets?: boolean;
  solo_sin_asignar?: boolean;
  fecha_hoy?: boolean;
  solo_abiertos?: boolean;
}

// ============================================================================
// Estadísticas
// ============================================================================

export interface TicketStats {
  total: number;
  abiertos: number;
  en_progreso: number;
  resueltos: number;
  cerrados: number;
  sin_asignar: number;
  mis_tickets: number;
  por_semaforo: {
    verde: number;
    amarillo: number;
    rojo: number;
  };
  por_prioridad: {
    critica: number;
    alta: number;
    media: number;
    baja: number;
  };
  por_categoria: {
    nombre: string;
    cantidad: number;
    color: string;
  }[];
  cumplimiento_sla: number;
}

export interface TicketAlerta {
  id: string;
  folio: string;
  cliente_nombre: string;
  categoria_nombre: string;
  prioridad: TicketPrioridad;
  responsable_nombre?: string;
  semaforo: TicketSemaforo;
  porcentaje_sla: number;
  minutos_restantes: number;
}

// ============================================================================
// Constantes
// ============================================================================

export const PRIORIDAD_CONFIG: Record<TicketPrioridad, { color: string; icon: string; orden: number; label: string; descripcion: string }> = {
  'Crítica': { color: '#dc3545', icon: 'alert-triangle', orden: 1, label: 'Crítica', descripcion: 'Requiere atención inmediata' },
  'Alta': { color: '#fd7e14', icon: 'arrow-up', orden: 2, label: 'Alta', descripcion: 'Impacto significativo en operaciones' },
  'Media': { color: '#ffc107', icon: 'minus', orden: 3, label: 'Media', descripcion: 'Impacto moderado' },
  'Baja': { color: '#28a745', icon: 'arrow-down', orden: 4, label: 'Baja', descripcion: 'Sin urgencia' }
};

export const SEMAFORO_CONFIG: Record<TicketSemaforo, { color: string; label: string; icon: string }> = {
  'verde': { color: '#4CAF50', label: 'En tiempo', icon: 'check-circle' },
  'amarillo': { color: '#FFC107', label: 'Por vencer', icon: 'alert-triangle' },
  'rojo': { color: '#F44336', label: 'Vencido', icon: 'alert-circle' },
  'azul': { color: '#17a2b8', label: 'Pausado', icon: 'pause-circle' },
  'gris': { color: '#6c757d', label: 'Cerrado', icon: 'x-circle' }
};

export const CANAL_CONFIG: Record<TicketCanal, { icon: string; color: string }> = {
  'Teléfono': { icon: 'feather icon-phone', color: '#007bff' },
  'WhatsApp': { icon: 'fab fa-whatsapp', color: '#25D366' },
  'Correo': { icon: 'feather icon-mail', color: '#6c757d' },
  'Portal': { icon: 'feather icon-globe', color: '#17a2b8' },
  'Presencial': { icon: 'feather icon-user', color: '#ffc107' }
};

export const BITACORA_TIPO_CONFIG: Record<BitacoraTipo, { icon: string; color: string; label: string }> = {
  'nota': { icon: 'feather icon-message-square', color: '#007bff', label: 'Nota' },
  'cambio_estatus': { icon: 'feather icon-refresh-cw', color: '#17a2b8', label: 'Cambio de estatus' },
  'asignacion': { icon: 'feather icon-user-plus', color: '#28a745', label: 'Asignación' },
  'adjunto': { icon: 'feather icon-paperclip', color: '#6c757d', label: 'Adjunto' },
  'escalamiento': { icon: 'feather icon-trending-up', color: '#fd7e14', label: 'Escalamiento' },
  'pausa': { icon: 'feather icon-pause-circle', color: '#ffc107', label: 'Pausa' },
  'reanudacion': { icon: 'feather icon-play-circle', color: '#28a745', label: 'Reanudación' }
};
