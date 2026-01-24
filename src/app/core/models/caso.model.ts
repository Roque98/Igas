// ============================================================================
// Caso Model
// ============================================================================
// Modelos para el módulo de Casos (Escalamiento)
// ============================================================================

// Tipos base
export type AreaDestino = 'Dev' | 'Implementación' | 'Facturación' | 'Proveedor' | 'Cobranza';
export type MotivoEscalamiento = 'Bug' | 'Mejora' | 'Configuración' | 'Proveedor' | 'Administrativo';
export type ResultadoCaso = 'Listo para validar' | 'Regresa a soporte' | 'Cerrado';
export type CasoPrioridad = 'Crítica' | 'Alta' | 'Media' | 'Baja';
export type CasoSemaforo = 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris';

// ============================================================================
// Interfaces principales
// ============================================================================

export interface Caso {
  id: string;
  folio: string;
  ticket_id: string;
  cliente_id?: string;
  problema_descripcion?: string;
  area_destino: AreaDestino;
  motivo: MotivoEscalamiento;
  responsable_id?: string;
  prioridad: CasoPrioridad;
  estatus_id: string;
  sla_objetivo_minutos: number;
  fecha_creacion: string;
  fecha_primera_respuesta?: string;
  fecha_resolucion?: string;
  fecha_compromiso?: string;
  tiempo_pausado_minutos: number;
  resultado?: ResultadoCaso;
  numero_caso_externo?: string;
  email_enviado: boolean;
  creado_por: string;
  cerrado_por?: string;
  created_at: string;
  updated_at: string;
}

export interface CasoConSLA extends Caso {
  // Datos del ticket
  ticket_folio?: string;
  ticket_descripcion?: string;
  // Datos del cliente
  cliente_nombre?: string;
  cliente_nombre_comercial?: string;
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
  // Campos calculados SLA
  minutos_transcurridos?: number;
  semaforo?: CasoSemaforo;
  porcentaje_sla?: number;
  minutos_restantes?: number;
  compromiso_vencido?: boolean;
}

export interface EstatusCaso {
  id: string;
  nombre: string;
  orden: number;
  pausa_sla: boolean;
  es_final: boolean;
  color?: string;
  created_at: string;
}

export interface AreaDestinoConfig {
  id: string;
  nombre: AreaDestino;
  email_notificacion?: string;
  responsable_default_id?: string;
  sla_default_horas: number;
  descripcion?: string;
  estatus: 'Activo' | 'Inactivo';
  created_at: string;
}

export interface CasoBitacora {
  id: string;
  caso_id: string;
  usuario_id?: string;
  tipo: 'nota' | 'cambio_estatus' | 'asignacion' | 'adjunto' | 'email_enviado' | 'numero_caso_recibido';
  mensaje?: string;
  datos_adicionales?: Record<string, unknown>;
  created_at: string;
  // Campos expandidos
  usuario?: {
    nombre_completo: string;
    avatar_url?: string;
  };
}

export interface CasoAdjunto {
  id: string;
  caso_id: string;
  nombre_archivo: string;
  ruta_storage: string;
  tipo_archivo?: string;
  tamanio_bytes?: number;
  subido_por?: string;
  created_at: string;
  // Campos expandidos
  subido_por_nombre?: string;
}

// ============================================================================
// DTOs
// ============================================================================

export interface EscalarTicketDTO {
  ticket_id: string;
  area_destino: AreaDestino;
  motivo: MotivoEscalamiento;
  descripcion?: string;
  fecha_compromiso?: string;
  enviar_email?: boolean;
}

export interface CreateCasoDTO {
  ticket_id: string;
  cliente_id?: string;
  problema_descripcion?: string;
  area_destino: AreaDestino;
  motivo: MotivoEscalamiento;
  prioridad?: CasoPrioridad;
  fecha_compromiso?: string;
}

export interface UpdateCasoDTO {
  problema_descripcion?: string;
  responsable_id?: string;
  prioridad?: CasoPrioridad;
  fecha_compromiso?: string;
  numero_caso_externo?: string;
}

export interface CambiarEstatusCasoDTO {
  estatus_id: string;
  nota?: string;
}

export interface MarcarListoDTO {
  notas_resolucion: string;
}

export interface RegresarSoporteDTO {
  motivo: string;
}

export interface CerrarCasoDTO {
  resultado: ResultadoCaso;
  notas?: string;
}

// ============================================================================
// Filtros y Paginación
// ============================================================================

export interface CasoFilters {
  area_destino?: AreaDestino;
  motivo?: MotivoEscalamiento;
  estatus_id?: string;
  responsable_id?: string;
  semaforo?: CasoSemaforo;
  search?: string; // búsqueda por folio
  solo_mis_casos?: boolean;
  solo_sin_asignar?: boolean;
  compromiso_vencido?: boolean;
  solo_abiertos?: boolean;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export interface CasoStats {
  total_activos: number;
  total_por_area: Record<AreaDestino, number>;
  total_por_semaforo: Record<CasoSemaforo, number>;
  casos_vencidos: number;
}

// ============================================================================
// Constantes
// ============================================================================

export const AREAS_DESTINO: { value: AreaDestino; label: string; color: string }[] = [
  { value: 'Dev', label: 'Desarrollo', color: '#9c27b0' },
  { value: 'Implementación', label: 'Implementación', color: '#2196f3' },
  { value: 'Facturación', label: 'Facturación', color: '#ff9800' },
  { value: 'Proveedor', label: 'Proveedor', color: '#607d8b' },
  { value: 'Cobranza', label: 'Cobranza', color: '#4caf50' }
];

export const MOTIVOS_ESCALAMIENTO: { value: MotivoEscalamiento; label: string; icon: string }[] = [
  { value: 'Bug', label: 'Bug / Error', icon: 'alert-circle' },
  { value: 'Mejora', label: 'Mejora / Nueva funcionalidad', icon: 'plus-circle' },
  { value: 'Configuración', label: 'Configuración', icon: 'settings' },
  { value: 'Proveedor', label: 'Requiere proveedor', icon: 'truck' },
  { value: 'Administrativo', label: 'Administrativo', icon: 'file-text' }
];

export const RESULTADOS_CASO: { value: ResultadoCaso; label: string; color: string }[] = [
  { value: 'Listo para validar', label: 'Listo para validar', color: '#4caf50' },
  { value: 'Regresa a soporte', label: 'Regresa a soporte', color: '#ff9800' },
  { value: 'Cerrado', label: 'Cerrado', color: '#9e9e9e' }
];

export const CASO_BITACORA_TIPOS: Record<string, { label: string; icon: string; color: string }> = {
  'nota': { label: 'Nota', icon: 'message-square', color: '#2196f3' },
  'cambio_estatus': { label: 'Cambio de estatus', icon: 'refresh-cw', color: '#9c27b0' },
  'asignacion': { label: 'Asignación', icon: 'user-check', color: '#4caf50' },
  'adjunto': { label: 'Adjunto', icon: 'paperclip', color: '#607d8b' },
  'email_enviado': { label: 'Email enviado', icon: 'mail', color: '#ff9800' },
  'numero_caso_recibido': { label: 'Número externo', icon: 'hash', color: '#795548' }
};
