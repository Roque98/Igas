// ============================================================================
// Cliente Model
// ============================================================================
// Modelos para el módulo de Gestión de Clientes
// ============================================================================

// ============================================================================
// Tipos base
// ============================================================================

export type TipoCliente = 'Cliente' | 'Prospecto' | 'Inactivo';
export type EstatusCliente = 'Activo' | 'Suspendido' | 'Sin póliza' | 'En cobranza';
export type EstatusSucursal = 'Activa' | 'Inactiva';
export type TipoContacto = 'Administrador' | 'Encargado' | 'Facturación' | 'TI' | 'Operaciones' | 'Otro';
export type TipoPoliza = 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual' | 'Por Evento';
export type EstatusLicencia = 'Activa' | 'Por vencer' | 'Vencida' | 'Suspendida' | 'Cancelada';
export type EstatusPoliza = 'Activa' | 'Por vencer' | 'Vencida' | 'En cobranza' | 'Suspendida' | 'Cancelada';
export type TipoAlertaVencimiento = 'licencia' | 'poliza';
export type PrioridadAlerta = 'alta' | 'media' | 'baja';

// ============================================================================
// Interfaces principales
// ============================================================================

export interface Cliente {
  id: string;
  codigo_cliente?: string;
  nombre_comercial?: string;
  razon_social: string;
  rfc?: string;
  telefono?: string;
  telefono_secundario?: string;
  email?: string;
  email_secundario?: string;
  anydesk?: string;
  contacto_principal?: string;
  tipo_servicio?: string;
  tipo_cliente: TipoCliente;
  estatus?: string;
  estatus_cliente: EstatusCliente;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface ClienteResumen extends Cliente {
  total_sucursales?: number;
  total_contactos?: number;
  total_licencias?: number;
  licencias_vencidas?: number;
  licencias_por_vencer?: number;
  total_polizas?: number;
  poliza_vencimiento?: string;
  poliza_estatus?: string;
  tiene_datos_fiscales?: boolean;
}

export interface Sucursal {
  id: string;
  cliente_id: string;
  nombre: string;
  es_matriz: boolean;
  // Dirección
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  municipio?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  pais?: string;
  referencias?: string;
  latitud?: number;
  longitud?: number;
  // Contacto
  telefono?: string;
  email?: string;
  contacto_local?: string;
  estatus: EstatusSucursal;
  created_at: string;
  updated_at: string;
}

export interface ContactoCliente {
  id: string;
  cliente_id: string;
  sucursal_id?: string;
  tipo: TipoContacto;
  nombre_completo: string;
  puesto?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  es_contacto_principal: boolean;
  notas?: string;
  estatus: 'Activo' | 'Inactivo';
  created_at: string;
  updated_at: string;
  // Expandido
  sucursal_nombre?: string;
}

export interface DatosFiscales {
  id: string;
  cliente_id: string;
  razon_social_fiscal: string;
  rfc: string;
  regimen_fiscal: string;
  uso_cfdi_default?: string;
  codigo_postal_fiscal: string;
  // Dirección fiscal
  calle_fiscal?: string;
  numero_exterior_fiscal?: string;
  numero_interior_fiscal?: string;
  colonia_fiscal?: string;
  municipio_fiscal?: string;
  estado_fiscal?: string;
  // Emails
  email_facturacion: string;
  emails_copia?: string[];
  // Preferencias
  forma_pago_preferida?: string;
  metodo_pago_preferido?: string;
  created_at: string;
  updated_at: string;
}

export interface LicenciaHasp {
  id: string;
  cliente_id: string;
  sucursal_id?: string;
  tipo: string;
  folio?: string;
  numero_serie?: string;
  producto?: string;
  version?: string;
  fecha_activacion?: string;
  fecha_vencimiento?: string;
  dias_alerta_previa: number;
  estatus: EstatusLicencia;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface LicenciaConEstado extends LicenciaHasp {
  cliente_nombre?: string;
  cliente_razon_social?: string;
  sucursal_nombre?: string;
  estado_calculado?: EstatusLicencia;
  dias_restantes?: number;
}

export interface LicenciaRenovacion {
  id: string;
  licencia_id: string;
  fecha_renovacion: string;
  fecha_vencimiento_anterior?: string;
  fecha_vencimiento_nueva: string;
  costo?: number;
  renovado_por?: string;
  notas?: string;
  created_at: string;
  // Expandido
  renovado_por_nombre?: string;
}

export interface PolizaSoporte {
  id: string;
  cliente_id: string;
  numero_poliza?: string;
  tipo: TipoPoliza;
  fecha_inicio: string;
  fecha_vencimiento: string;
  costo?: number;
  cobertura?: string;
  horas_incluidas?: number;
  horas_consumidas?: number;
  estatus: EstatusPoliza;
  dias_alerta_previa: number;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface PolizaConEstado extends PolizaSoporte {
  cliente_nombre?: string;
  cliente_razon_social?: string;
  estado_calculado?: EstatusPoliza;
  dias_restantes?: number;
  porcentaje_horas_consumidas?: number;
}

export interface PolizaRenovacion {
  id: string;
  poliza_id: string;
  fecha_renovacion: string;
  fecha_vencimiento_anterior?: string;
  fecha_vencimiento_nueva: string;
  costo?: number;
  renovado_por?: string;
  notas?: string;
  created_at: string;
  // Expandido
  renovado_por_nombre?: string;
}

export interface AlertaVencimiento {
  id: string;
  tipo: TipoAlertaVencimiento;
  referencia_id: string;
  cliente_id?: string;
  fecha_vencimiento: string;
  dias_para_vencer?: number;
  mensaje?: string;
  prioridad: PrioridadAlerta;
  notificado: boolean;
  fecha_notificacion?: string;
  atendido: boolean;
  atendido_por?: string;
  fecha_atencion?: string;
  created_at: string;
  // Expandido
  cliente_nombre?: string;
}

// ============================================================================
// Catálogos SAT
// ============================================================================

export interface RegimenFiscal {
  clave: string;
  descripcion: string;
  persona_fisica: boolean;
  persona_moral: boolean;
  activo: boolean;
}

export interface UsoCFDI {
  clave: string;
  descripcion: string;
  persona_fisica: boolean;
  persona_moral: boolean;
  activo: boolean;
}

// ============================================================================
// DTOs
// ============================================================================

export interface CreateClienteDTO {
  codigo_cliente?: string;
  nombre_comercial?: string;
  razon_social: string;
  rfc?: string;
  telefono?: string;
  telefono_secundario?: string;
  email?: string;
  email_secundario?: string;
  anydesk?: string;
  contacto_principal?: string;
  tipo_servicio?: string;
  tipo_cliente?: TipoCliente;
  estatus_cliente?: EstatusCliente;
  notas?: string;
}

export interface UpdateClienteDTO extends Partial<CreateClienteDTO> {}

export interface CreateSucursalDTO {
  cliente_id: string;
  nombre: string;
  es_matriz?: boolean;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string;
  colonia?: string;
  municipio?: string;
  ciudad?: string;
  estado?: string;
  codigo_postal?: string;
  pais?: string;
  referencias?: string;
  latitud?: number;
  longitud?: number;
  telefono?: string;
  email?: string;
  contacto_local?: string;
}

export interface UpdateSucursalDTO extends Partial<Omit<CreateSucursalDTO, 'cliente_id'>> {}

export interface CreateContactoDTO {
  cliente_id: string;
  sucursal_id?: string;
  tipo: TipoContacto;
  nombre_completo: string;
  puesto?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  es_contacto_principal?: boolean;
  notas?: string;
}

export interface UpdateContactoDTO extends Partial<Omit<CreateContactoDTO, 'cliente_id'>> {}

export interface CreateDatosFiscalesDTO {
  cliente_id: string;
  razon_social_fiscal: string;
  rfc: string;
  regimen_fiscal: string;
  uso_cfdi_default?: string;
  codigo_postal_fiscal: string;
  calle_fiscal?: string;
  numero_exterior_fiscal?: string;
  numero_interior_fiscal?: string;
  colonia_fiscal?: string;
  municipio_fiscal?: string;
  estado_fiscal?: string;
  email_facturacion: string;
  emails_copia?: string[];
  forma_pago_preferida?: string;
  metodo_pago_preferido?: string;
}

export interface UpdateDatosFiscalesDTO extends Partial<Omit<CreateDatosFiscalesDTO, 'cliente_id'>> {}

export interface CreateLicenciaDTO {
  cliente_id: string;
  sucursal_id?: string;
  tipo: string;
  folio?: string;
  numero_serie?: string;
  producto?: string;
  version?: string;
  fecha_activacion?: string;
  fecha_vencimiento?: string;
  dias_alerta_previa?: number;
  notas?: string;
}

export interface UpdateLicenciaDTO extends Partial<Omit<CreateLicenciaDTO, 'cliente_id'>> {}

export interface RenovarLicenciaDTO {
  nueva_fecha_vencimiento: string;
  costo?: number;
  notas?: string;
}

export interface CreatePolizaDTO {
  cliente_id: string;
  numero_poliza?: string;
  tipo: TipoPoliza;
  fecha_inicio: string;
  fecha_vencimiento: string;
  costo?: number;
  cobertura?: string;
  horas_incluidas?: number;
  dias_alerta_previa?: number;
  notas?: string;
}

export interface UpdatePolizaDTO extends Partial<Omit<CreatePolizaDTO, 'cliente_id'>> {}

export interface RenovarPolizaDTO {
  nueva_fecha_vencimiento: string;
  costo?: number;
  notas?: string;
}

// ============================================================================
// Filtros
// ============================================================================

export interface ClienteFilters {
  search?: string;
  tipo_cliente?: TipoCliente;
  estatus_cliente?: EstatusCliente;
  con_poliza_activa?: boolean;
  con_licencias_por_vencer?: boolean;
  con_alertas?: boolean;
}

export interface LicenciaFilters {
  cliente_id?: string;
  sucursal_id?: string;
  estatus?: EstatusLicencia;
  tipo?: string;
  por_vencer?: boolean;
  vencidas?: boolean;
}

export interface PolizaFilters {
  cliente_id?: string;
  estatus?: EstatusPoliza;
  tipo?: TipoPoliza;
  por_vencer?: boolean;
  vencidas?: boolean;
}

export interface AlertaFilters {
  tipo?: TipoAlertaVencimiento;
  cliente_id?: string;
  prioridad?: PrioridadAlerta;
  atendido?: boolean;
  dias_max?: number;
}

// ============================================================================
// Estadísticas
// ============================================================================

export interface ClienteStats {
  total_clientes: number;
  clientes_activos: number;
  clientes_sin_poliza: number;
  clientes_en_cobranza: number;
  licencias_por_vencer: number;
  licencias_vencidas: number;
  polizas_por_vencer: number;
  polizas_vencidas: number;
  alertas_pendientes: number;
}

// ============================================================================
// Constantes
// ============================================================================

export const TIPOS_CLIENTE: { value: TipoCliente; label: string }[] = [
  { value: 'Cliente', label: 'Cliente' },
  { value: 'Prospecto', label: 'Prospecto' },
  { value: 'Inactivo', label: 'Inactivo' }
];

export const ESTATUS_CLIENTE: { value: EstatusCliente; label: string; color: string }[] = [
  { value: 'Activo', label: 'Activo', color: '#4CAF50' },
  { value: 'Sin póliza', label: 'Sin póliza', color: '#FFC107' },
  { value: 'En cobranza', label: 'En cobranza', color: '#F44336' },
  { value: 'Suspendido', label: 'Suspendido', color: '#9E9E9E' }
];

export const TIPOS_CONTACTO: { value: TipoContacto; label: string }[] = [
  { value: 'Administrador', label: 'Administrador' },
  { value: 'Encargado', label: 'Encargado' },
  { value: 'Facturación', label: 'Facturación' },
  { value: 'TI', label: 'TI / Sistemas' },
  { value: 'Operaciones', label: 'Operaciones' },
  { value: 'Otro', label: 'Otro' }
];

export const TIPOS_POLIZA: { value: TipoPoliza; label: string }[] = [
  { value: 'Mensual', label: 'Mensual' },
  { value: 'Trimestral', label: 'Trimestral' },
  { value: 'Semestral', label: 'Semestral' },
  { value: 'Anual', label: 'Anual' },
  { value: 'Por Evento', label: 'Por Evento' }
];

export const ESTATUS_LICENCIA: { value: EstatusLicencia; label: string; color: string }[] = [
  { value: 'Activa', label: 'Activa', color: '#4CAF50' },
  { value: 'Por vencer', label: 'Por vencer', color: '#FFC107' },
  { value: 'Vencida', label: 'Vencida', color: '#F44336' },
  { value: 'Suspendida', label: 'Suspendida', color: '#9E9E9E' },
  { value: 'Cancelada', label: 'Cancelada', color: '#607D8B' }
];

export const ESTATUS_POLIZA: { value: EstatusPoliza; label: string; color: string }[] = [
  { value: 'Activa', label: 'Activa', color: '#4CAF50' },
  { value: 'Por vencer', label: 'Por vencer', color: '#FFC107' },
  { value: 'Vencida', label: 'Vencida', color: '#F44336' },
  { value: 'En cobranza', label: 'En cobranza', color: '#FF5722' },
  { value: 'Suspendida', label: 'Suspendida', color: '#9E9E9E' },
  { value: 'Cancelada', label: 'Cancelada', color: '#607D8B' }
];

export const PRIORIDAD_ALERTA: { value: PrioridadAlerta; label: string; color: string }[] = [
  { value: 'alta', label: 'Alta', color: '#F44336' },
  { value: 'media', label: 'Media', color: '#FFC107' },
  { value: 'baja', label: 'Baja', color: '#4CAF50' }
];

export const ESTADOS_MEXICO = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
];
