// ============================================================================
// Cliente Service
// ============================================================================
// Servicio para gestión completa de clientes, sucursales, contactos,
// datos fiscales, licencias, pólizas y alertas
// ============================================================================

import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import {
  Cliente,
  ClienteResumen,
  Sucursal,
  ContactoCliente,
  DatosFiscales,
  LicenciaHasp,
  LicenciaConEstado,
  LicenciaRenovacion,
  PolizaSoporte,
  PolizaConEstado,
  PolizaRenovacion,
  AlertaVencimiento,
  RegimenFiscal,
  UsoCFDI,
  CreateClienteDTO,
  UpdateClienteDTO,
  CreateSucursalDTO,
  UpdateSucursalDTO,
  CreateContactoDTO,
  UpdateContactoDTO,
  CreateDatosFiscalesDTO,
  UpdateDatosFiscalesDTO,
  CreateLicenciaDTO,
  UpdateLicenciaDTO,
  RenovarLicenciaDTO,
  CreatePolizaDTO,
  UpdatePolizaDTO,
  RenovarPolizaDTO,
  ClienteFilters,
  LicenciaFilters,
  PolizaFilters,
  AlertaFilters,
  ClienteStats,
  PaginationOptions,
  PaginatedResponse,
  ServiceResponse
} from '../models';
import { environment } from '../../../environments/environment';
import { TABLES, VIEWS } from '../constants/tables';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private supabase = inject(SupabaseService);

  // ============================================================================
  // CLIENTES - CRUD
  // ============================================================================

  getClientes(
    filters?: ClienteFilters,
    pagination?: PaginationOptions
  ): Observable<PaginatedResponse<ClienteResumen>> {
    return from(this.fetchClientes(filters, pagination));
  }

  private async fetchClientes(
    filters?: ClienteFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<ClienteResumen>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? 'nombre_comercial';
    const sortOrder = pagination?.sortOrder ?? 'asc';

    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from(VIEWS.V_CLIENTES_RESUMEN)
      .select('*', { count: 'exact' });

    // Aplicar filtros
    if (filters) {
      if (filters.search) {
        query = query.or(`nombre_comercial.ilike.%${filters.search}%,razon_social.ilike.%${filters.search}%,rfc.ilike.%${filters.search}%,codigo_cliente.ilike.%${filters.search}%`);
      }
      if (filters.tipo_cliente) {
        query = query.eq('tipo_cliente', filters.tipo_cliente);
      }
      if (filters.estatus_cliente) {
        query = query.eq('estatus_cliente', filters.estatus_cliente);
      }
      if (filters.con_poliza_activa === true) {
        query = query.in('poliza_estatus', ['Activa', 'Por vencer']);
      }
      if (filters.con_poliza_activa === false) {
        query = query.or('poliza_estatus.is.null,poliza_estatus.in.(Vencida,Cancelada,Suspendida)');
      }
      if (filters.con_licencias_por_vencer) {
        query = query.gt('licencias_por_vencer', 0);
      }
    }

    // Ordenar y paginar
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      if (!environment.production) { console.error('Error fetching clientes:', error); }
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const total = count || 0;
    return {
      data: data as ClienteResumen[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  getClienteById(id: string): Observable<ServiceResponse<ClienteResumen>> {
    return from(this.fetchClienteById(id));
  }

  private async fetchClienteById(id: string): Promise<ServiceResponse<ClienteResumen>> {
    const { data, error } = await this.supabase.client
      .from(VIEWS.V_CLIENTES_RESUMEN)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as ClienteResumen, error: null, success: true };
  }

  createCliente(dto: CreateClienteDTO): Observable<ServiceResponse<Cliente>> {
    return from(this.insertCliente(dto));
  }

  private async insertCliente(dto: CreateClienteDTO): Promise<ServiceResponse<Cliente>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CLIENTES)
      .insert({
        ...dto,
        tipo_cliente: dto.tipo_cliente || 'Cliente',
        estatus_cliente: dto.estatus_cliente || 'Activo'
      })
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error creating cliente:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Cliente, error: null, success: true };
  }

  updateCliente(id: string, dto: UpdateClienteDTO): Observable<ServiceResponse<Cliente>> {
    return from(this.patchCliente(id, dto));
  }

  private async patchCliente(id: string, dto: UpdateClienteDTO): Promise<ServiceResponse<Cliente>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CLIENTES)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (!environment.production) { console.error('Error updating cliente:', error); }
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Cliente, error: null, success: true };
  }

  deleteCliente(id: string): Observable<ServiceResponse<void>> {
    return from(this.removeCliente(id));
  }

  private async removeCliente(id: string): Promise<ServiceResponse<void>> {
    const { error } = await this.supabase.client
      .from(TABLES.CLIENTES)
      .delete()
      .eq('id', id);

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: null, error: null, success: true };
  }

  // Búsqueda para autocomplete
  searchClientes(term: string, limit: number = 10): Observable<ServiceResponse<Cliente[]>> {
    return from(this.searchClientesAsync(term, limit));
  }

  private async searchClientesAsync(term: string, limit: number): Promise<ServiceResponse<Cliente[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CLIENTES)
      .select('id, nombre_comercial, razon_social, rfc, telefono, email, estatus_cliente')
      .or(`nombre_comercial.ilike.%${term}%,razon_social.ilike.%${term}%,rfc.ilike.%${term}%`)
      .limit(limit);

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Cliente[], error: null, success: true };
  }

  // ============================================================================
  // SUCURSALES
  // ============================================================================

  getSucursales(clienteId: string): Observable<ServiceResponse<Sucursal[]>> {
    return from(this.fetchSucursales(clienteId));
  }

  private async fetchSucursales(clienteId: string): Promise<ServiceResponse<Sucursal[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.SUCURSALES)
      .select('*')
      .eq('cliente_id', clienteId)
      .order('es_matriz', { ascending: false })
      .order('nombre');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Sucursal[], error: null, success: true };
  }

  createSucursal(dto: CreateSucursalDTO): Observable<ServiceResponse<Sucursal>> {
    return from(this.insertSucursal(dto));
  }

  private async insertSucursal(dto: CreateSucursalDTO): Promise<ServiceResponse<Sucursal>> {
    // Si es matriz, desmarcar otras matrices del mismo cliente
    if (dto.es_matriz) {
      await this.supabase.client
        .from(TABLES.SUCURSALES)
        .update({ es_matriz: false })
        .eq('cliente_id', dto.cliente_id);
    }

    const { data, error } = await this.supabase.client
      .from(TABLES.SUCURSALES)
      .insert(dto)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Sucursal, error: null, success: true };
  }

  updateSucursal(id: string, dto: UpdateSucursalDTO): Observable<ServiceResponse<Sucursal>> {
    return from(this.patchSucursal(id, dto));
  }

  private async patchSucursal(id: string, dto: UpdateSucursalDTO): Promise<ServiceResponse<Sucursal>> {
    // Si se marca como matriz, desmarcar otras
    if (dto.es_matriz) {
      const { data: sucursal } = await this.supabase.client
        .from(TABLES.SUCURSALES)
        .select('cliente_id')
        .eq('id', id)
        .single();

      if (sucursal) {
        await this.supabase.client
          .from(TABLES.SUCURSALES)
          .update({ es_matriz: false })
          .eq('cliente_id', sucursal.cliente_id)
          .neq('id', id);
      }
    }

    const { data, error } = await this.supabase.client
      .from(TABLES.SUCURSALES)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as Sucursal, error: null, success: true };
  }

  deleteSucursal(id: string): Observable<ServiceResponse<void>> {
    return from(this.removeSucursal(id));
  }

  private async removeSucursal(id: string): Promise<ServiceResponse<void>> {
    const { error } = await this.supabase.client
      .from(TABLES.SUCURSALES)
      .delete()
      .eq('id', id);

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: null, error: null, success: true };
  }

  // ============================================================================
  // CONTACTOS
  // ============================================================================

  getContactos(clienteId: string): Observable<ServiceResponse<ContactoCliente[]>> {
    return from(this.fetchContactos(clienteId));
  }

  private async fetchContactos(clienteId: string): Promise<ServiceResponse<ContactoCliente[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CONTACTOS_CLIENTE)
      .select(`
        *,
        sucursal:sucursales(nombre)
      `)
      .eq('cliente_id', clienteId)
      .eq('estatus', 'Activo')
      .order('es_contacto_principal', { ascending: false })
      .order('nombre_completo');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    const contactos = data.map(c => ({
      ...c,
      sucursal_nombre: c.sucursal?.nombre
    }));

    return { data: contactos as ContactoCliente[], error: null, success: true };
  }

  createContacto(dto: CreateContactoDTO): Observable<ServiceResponse<ContactoCliente>> {
    return from(this.insertContacto(dto));
  }

  private async insertContacto(dto: CreateContactoDTO): Promise<ServiceResponse<ContactoCliente>> {
    // Si es principal, desmarcar otros
    if (dto.es_contacto_principal) {
      await this.supabase.client
        .from(TABLES.CONTACTOS_CLIENTE)
        .update({ es_contacto_principal: false })
        .eq('cliente_id', dto.cliente_id);
    }

    const { data, error } = await this.supabase.client
      .from(TABLES.CONTACTOS_CLIENTE)
      .insert(dto)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as ContactoCliente, error: null, success: true };
  }

  updateContacto(id: string, dto: UpdateContactoDTO): Observable<ServiceResponse<ContactoCliente>> {
    return from(this.patchContacto(id, dto));
  }

  private async patchContacto(id: string, dto: UpdateContactoDTO): Promise<ServiceResponse<ContactoCliente>> {
    if (dto.es_contacto_principal) {
      const { data: contacto } = await this.supabase.client
        .from(TABLES.CONTACTOS_CLIENTE)
        .select('cliente_id')
        .eq('id', id)
        .single();

      if (contacto) {
        await this.supabase.client
          .from(TABLES.CONTACTOS_CLIENTE)
          .update({ es_contacto_principal: false })
          .eq('cliente_id', contacto.cliente_id)
          .neq('id', id);
      }
    }

    const { data, error } = await this.supabase.client
      .from(TABLES.CONTACTOS_CLIENTE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as ContactoCliente, error: null, success: true };
  }

  deleteContacto(id: string): Observable<ServiceResponse<void>> {
    return from(this.removeContacto(id));
  }

  private async removeContacto(id: string): Promise<ServiceResponse<void>> {
    const { error } = await this.supabase.client
      .from(TABLES.CONTACTOS_CLIENTE)
      .update({ estatus: 'Inactivo', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: null, error: null, success: true };
  }

  // ============================================================================
  // DATOS FISCALES
  // ============================================================================

  getDatosFiscales(clienteId: string): Observable<ServiceResponse<DatosFiscales | null>> {
    return from(this.fetchDatosFiscales(clienteId));
  }

  private async fetchDatosFiscales(clienteId: string): Promise<ServiceResponse<DatosFiscales | null>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.DATOS_FISCALES)
      .select('*')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as DatosFiscales | null, error: null, success: true };
  }

  saveDatosFiscales(dto: CreateDatosFiscalesDTO): Observable<ServiceResponse<DatosFiscales>> {
    return from(this.upsertDatosFiscales(dto));
  }

  private async upsertDatosFiscales(dto: CreateDatosFiscalesDTO): Promise<ServiceResponse<DatosFiscales>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.DATOS_FISCALES)
      .upsert(dto, { onConflict: 'cliente_id' })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as DatosFiscales, error: null, success: true };
  }

  // ============================================================================
  // LICENCIAS HASP
  // ============================================================================

  getLicencias(filters?: LicenciaFilters, pagination?: PaginationOptions): Observable<PaginatedResponse<LicenciaConEstado>> {
    return from(this.fetchLicencias(filters, pagination));
  }

  private async fetchLicencias(filters?: LicenciaFilters, pagination?: PaginationOptions): Promise<PaginatedResponse<LicenciaConEstado>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from(VIEWS.V_LICENCIAS_ESTADO)
      .select('*', { count: 'exact' });

    if (filters) {
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }
      if (filters.sucursal_id) {
        query = query.eq('sucursal_id', filters.sucursal_id);
      }
      if (filters.estatus) {
        query = query.eq('estatus', filters.estatus);
      }
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.por_vencer) {
        query = query.eq('estado_calculado', 'Por vencer');
      }
      if (filters.vencidas) {
        query = query.eq('estado_calculado', 'Vencida');
      }
    }

    query = query
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const total = count || 0;
    return { data: data as LicenciaConEstado[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  getLicenciasByCliente(clienteId: string): Observable<ServiceResponse<LicenciaConEstado[]>> {
    return from(this.fetchLicenciasByCliente(clienteId));
  }

  private async fetchLicenciasByCliente(clienteId: string): Promise<ServiceResponse<LicenciaConEstado[]>> {
    const { data, error } = await this.supabase.client
      .from(VIEWS.V_LICENCIAS_ESTADO)
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false });

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as LicenciaConEstado[], error: null, success: true };
  }

  createLicencia(dto: CreateLicenciaDTO): Observable<ServiceResponse<LicenciaHasp>> {
    return from(this.insertLicencia(dto));
  }

  private async insertLicencia(dto: CreateLicenciaDTO): Promise<ServiceResponse<LicenciaHasp>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.LICENCIAS_HASP)
      .insert(dto)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as LicenciaHasp, error: null, success: true };
  }

  updateLicencia(id: string, dto: UpdateLicenciaDTO): Observable<ServiceResponse<LicenciaHasp>> {
    return from(this.patchLicencia(id, dto));
  }

  private async patchLicencia(id: string, dto: UpdateLicenciaDTO): Promise<ServiceResponse<LicenciaHasp>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.LICENCIAS_HASP)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as LicenciaHasp, error: null, success: true };
  }

  renovarLicencia(id: string, dto: RenovarLicenciaDTO): Observable<ServiceResponse<{ renovacion_id: string }>> {
    return from(this.renovarLicenciaAsync(id, dto));
  }

  private async renovarLicenciaAsync(id: string, dto: RenovarLicenciaDTO): Promise<ServiceResponse<{ renovacion_id: string }>> {
    const { data, error } = await this.supabase.client
      .rpc('renovar_licencia', {
        p_licencia_id: id,
        p_nueva_fecha_vencimiento: dto.nueva_fecha_vencimiento,
        p_costo: dto.costo || null,
        p_notas: dto.notas || null
      });

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: { renovacion_id: data }, error: null, success: true };
  }

  getRenovacionesLicencia(licenciaId: string): Observable<ServiceResponse<LicenciaRenovacion[]>> {
    return from(this.fetchRenovacionesLicencia(licenciaId));
  }

  private async fetchRenovacionesLicencia(licenciaId: string): Promise<ServiceResponse<LicenciaRenovacion[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.LICENCIAS_RENOVACIONES)
      .select(`
        *,
        renovado_por_profile:profiles(nombre_completo)
      `)
      .eq('licencia_id', licenciaId)
      .order('fecha_renovacion', { ascending: false });

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    const renovaciones = data.map(r => ({
      ...r,
      renovado_por_nombre: r.renovado_por_profile?.nombre_completo
    }));

    return { data: renovaciones as LicenciaRenovacion[], error: null, success: true };
  }

  // ============================================================================
  // PÓLIZAS DE SOPORTE
  // ============================================================================

  getPolizas(filters?: PolizaFilters, pagination?: PaginationOptions): Observable<PaginatedResponse<PolizaConEstado>> {
    return from(this.fetchPolizas(filters, pagination));
  }

  private async fetchPolizas(filters?: PolizaFilters, pagination?: PaginationOptions): Promise<PaginatedResponse<PolizaConEstado>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    let query = this.supabase.client
      .from(VIEWS.V_POLIZAS_ESTADO)
      .select('*', { count: 'exact' });

    if (filters) {
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }
      if (filters.estatus) {
        query = query.eq('estatus', filters.estatus);
      }
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.por_vencer) {
        query = query.eq('estado_calculado', 'Por vencer');
      }
      if (filters.vencidas) {
        query = query.eq('estado_calculado', 'Vencida');
      }
    }

    query = query
      .order('fecha_vencimiento', { ascending: true, nullsFirst: false })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      return { data: [], total: 0, page, pageSize, totalPages: 0 };
    }

    const total = count || 0;
    return { data: data as PolizaConEstado[], total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  getPolizasByCliente(clienteId: string): Observable<ServiceResponse<PolizaConEstado[]>> {
    return from(this.fetchPolizasByCliente(clienteId));
  }

  private async fetchPolizasByCliente(clienteId: string): Promise<ServiceResponse<PolizaConEstado[]>> {
    const { data, error } = await this.supabase.client
      .from(VIEWS.V_POLIZAS_ESTADO)
      .select('*')
      .eq('cliente_id', clienteId)
      .order('fecha_vencimiento', { ascending: false });

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as PolizaConEstado[], error: null, success: true };
  }

  createPoliza(dto: CreatePolizaDTO): Observable<ServiceResponse<PolizaSoporte>> {
    return from(this.insertPoliza(dto));
  }

  private async insertPoliza(dto: CreatePolizaDTO): Promise<ServiceResponse<PolizaSoporte>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.POLIZAS_SOPORTE)
      .insert(dto)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as PolizaSoporte, error: null, success: true };
  }

  updatePoliza(id: string, dto: UpdatePolizaDTO): Observable<ServiceResponse<PolizaSoporte>> {
    return from(this.patchPoliza(id, dto));
  }

  private async patchPoliza(id: string, dto: UpdatePolizaDTO): Promise<ServiceResponse<PolizaSoporte>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.POLIZAS_SOPORTE)
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as PolizaSoporte, error: null, success: true };
  }

  renovarPoliza(id: string, dto: RenovarPolizaDTO): Observable<ServiceResponse<{ renovacion_id: string }>> {
    return from(this.renovarPolizaAsync(id, dto));
  }

  private async renovarPolizaAsync(id: string, dto: RenovarPolizaDTO): Promise<ServiceResponse<{ renovacion_id: string }>> {
    const { data, error } = await this.supabase.client
      .rpc('renovar_poliza', {
        p_poliza_id: id,
        p_nueva_fecha_vencimiento: dto.nueva_fecha_vencimiento,
        p_costo: dto.costo || null,
        p_notas: dto.notas || null
      });

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: { renovacion_id: data }, error: null, success: true };
  }

  // ============================================================================
  // ALERTAS
  // ============================================================================

  getAlertas(filters?: AlertaFilters, limit: number = 20): Observable<ServiceResponse<AlertaVencimiento[]>> {
    return from(this.fetchAlertas(filters, limit));
  }

  private async fetchAlertas(filters?: AlertaFilters, limit: number = 20): Promise<ServiceResponse<AlertaVencimiento[]>> {
    let query = this.supabase.client
      .from(TABLES.ALERTAS_VENCIMIENTO)
      .select(`
        *,
        cliente:clientes(nombre_comercial)
      `);

    if (filters) {
      if (filters.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters.cliente_id) {
        query = query.eq('cliente_id', filters.cliente_id);
      }
      if (filters.prioridad) {
        query = query.eq('prioridad', filters.prioridad);
      }
      if (filters.atendido !== undefined) {
        query = query.eq('atendido', filters.atendido);
      }
      if (filters.dias_max) {
        query = query.lte('dias_para_vencer', filters.dias_max);
      }
    }

    query = query
      .order('prioridad', { ascending: true })
      .order('dias_para_vencer', { ascending: true })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    const alertas = data.map(a => ({
      ...a,
      cliente_nombre: a.cliente?.nombre_comercial
    }));

    return { data: alertas as AlertaVencimiento[], error: null, success: true };
  }

  marcarAlertaAtendida(id: string): Observable<ServiceResponse<void>> {
    return from(this.markAlertaAtendida(id));
  }

  private async markAlertaAtendida(id: string): Promise<ServiceResponse<void>> {
    const userId = this.supabase.user?.id;

    const { error } = await this.supabase.client
      .from(TABLES.ALERTAS_VENCIMIENTO)
      .update({
        atendido: true,
        atendido_por: userId,
        fecha_atencion: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: null, error: null, success: true };
  }

  // ============================================================================
  // CATÁLOGOS SAT
  // ============================================================================

  getRegimenesFiscales(): Observable<ServiceResponse<RegimenFiscal[]>> {
    return from(this.fetchRegimenesFiscales());
  }

  private async fetchRegimenesFiscales(): Promise<ServiceResponse<RegimenFiscal[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CAT_REGIMEN_FISCAL)
      .select('*')
      .eq('activo', true)
      .order('clave');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as RegimenFiscal[], error: null, success: true };
  }

  getUsosCFDI(): Observable<ServiceResponse<UsoCFDI[]>> {
    return from(this.fetchUsosCFDI());
  }

  private async fetchUsosCFDI(): Promise<ServiceResponse<UsoCFDI[]>> {
    const { data, error } = await this.supabase.client
      .from(TABLES.CAT_USO_CFDI)
      .select('*')
      .eq('activo', true)
      .order('clave');

    if (error) {
      return { data: null, error: error.message, success: false };
    }

    return { data: data as UsoCFDI[], error: null, success: true };
  }

  // ============================================================================
  // ESTADÍSTICAS
  // ============================================================================

  async getClienteStats(): Promise<ClienteStats> {
    try {
      // Total clientes
      const { count: total } = await this.supabase.client
        .from(TABLES.CLIENTES)
        .select('*', { count: 'exact', head: true });

      // Clientes activos
      const { count: activos } = await this.supabase.client
        .from(TABLES.CLIENTES)
        .select('*', { count: 'exact', head: true })
        .eq('estatus_cliente', 'Activo');

      // Sin póliza
      const { count: sinPoliza } = await this.supabase.client
        .from(TABLES.CLIENTES)
        .select('*', { count: 'exact', head: true })
        .eq('estatus_cliente', 'Sin póliza');

      // En cobranza
      const { count: enCobranza } = await this.supabase.client
        .from(TABLES.CLIENTES)
        .select('*', { count: 'exact', head: true })
        .eq('estatus_cliente', 'En cobranza');

      // Licencias por vencer
      const { count: licPorVencer } = await this.supabase.client
        .from(VIEWS.V_LICENCIAS_ESTADO)
        .select('*', { count: 'exact', head: true })
        .eq('estado_calculado', 'Por vencer');

      // Licencias vencidas
      const { count: licVencidas } = await this.supabase.client
        .from(VIEWS.V_LICENCIAS_ESTADO)
        .select('*', { count: 'exact', head: true })
        .eq('estado_calculado', 'Vencida');

      // Pólizas por vencer
      const { count: polPorVencer } = await this.supabase.client
        .from(VIEWS.V_POLIZAS_ESTADO)
        .select('*', { count: 'exact', head: true })
        .eq('estado_calculado', 'Por vencer');

      // Pólizas vencidas
      const { count: polVencidas } = await this.supabase.client
        .from(VIEWS.V_POLIZAS_ESTADO)
        .select('*', { count: 'exact', head: true })
        .eq('estado_calculado', 'Vencida');

      // Alertas pendientes
      const { count: alertas } = await this.supabase.client
        .from(TABLES.ALERTAS_VENCIMIENTO)
        .select('*', { count: 'exact', head: true })
        .eq('atendido', false);

      return {
        total_clientes: total || 0,
        clientes_activos: activos || 0,
        clientes_sin_poliza: sinPoliza || 0,
        clientes_en_cobranza: enCobranza || 0,
        licencias_por_vencer: licPorVencer || 0,
        licencias_vencidas: licVencidas || 0,
        polizas_por_vencer: polPorVencer || 0,
        polizas_vencidas: polVencidas || 0,
        alertas_pendientes: alertas || 0
      };
    } catch (error) {
      if (!environment.production) { console.error('Error getting cliente stats:', error); }
      return {
        total_clientes: 0,
        clientes_activos: 0,
        clientes_sin_poliza: 0,
        clientes_en_cobranza: 0,
        licencias_por_vencer: 0,
        licencias_vencidas: 0,
        polizas_por_vencer: 0,
        polizas_vencidas: 0,
        alertas_pendientes: 0
      };
    }
  }
}
