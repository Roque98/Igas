// ============================================================================
// Base Service
// ============================================================================
// Servicio base abstracto con operaciones CRUD genéricas para Supabase
// Reduce código duplicado y proporciona una interfaz consistente
// ============================================================================

import { inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ServiceResponse, PaginatedResponse, PaginationOptions } from '../models';
import { environment } from '../../../environments/environment';

// ============================================================================
// Types
// ============================================================================

/**
 * Interfaz base para entidades con ID
 */
export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Opciones de filtro base
 */
export interface BaseFilters {
  search?: string;
  [key: string]: unknown;
}

/**
 * Configuración para el servicio base
 */
export interface BaseServiceConfig {
  /** Nombre de la tabla principal para operaciones CRUD */
  tableName: string;
  /** Nombre de la vista para lecturas (opcional, usa tableName si no se especifica) */
  viewName?: string;
  /** Campos para búsqueda de texto (para filtro search) */
  searchFields?: string[];
  /** Campo por defecto para ordenar */
  defaultSortBy?: string;
  /** Orden por defecto */
  defaultSortOrder?: 'asc' | 'desc';
  /** Campos a seleccionar por defecto (usa '*' si no se especifica) */
  selectFields?: string;
  /** Usa soft delete (actualiza estatus en lugar de eliminar) */
  softDelete?: boolean;
  /** Campo de estatus para soft delete */
  statusField?: string;
  /** Valor de estatus para soft delete */
  deletedStatus?: string;
}

// ============================================================================
// Abstract Base Service
// ============================================================================

/**
 * Servicio base abstracto con operaciones CRUD genéricas
 *
 * @example
 * ```typescript
 * @Injectable({ providedIn: 'root' })
 * export class MiEntidadService extends BaseService<MiEntidad, CreateDTO, UpdateDTO, MiFilters> {
 *   protected config: BaseServiceConfig = {
 *     tableName: TABLES.MI_ENTIDAD,
 *     viewName: VIEWS.V_MI_ENTIDAD,
 *     searchFields: ['nombre', 'descripcion'],
 *     defaultSortBy: 'nombre'
 *   };
 *
 *   // Puedes agregar métodos específicos aquí
 * }
 * ```
 */
export abstract class BaseService<
  T extends BaseEntity,
  TCreate = Partial<T>,
  TUpdate = Partial<T>,
  TFilters extends BaseFilters = BaseFilters
> {
  protected supabase = inject(SupabaseService);

  /**
   * Configuración del servicio - debe ser implementada por clases hijas
   */
  protected abstract config: BaseServiceConfig;

  // ============================================================================
  // READ Operations
  // ============================================================================

  /**
   * Obtiene todos los registros con filtros y paginación
   */
  getAll(filters?: TFilters, pagination?: PaginationOptions): Observable<PaginatedResponse<T>> {
    return from(this.fetchAll(filters, pagination));
  }

  /**
   * Implementación async de getAll
   */
  protected async fetchAll(
    filters?: TFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResponse<T>> {
    const page = pagination?.page ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const sortBy = pagination?.sortBy ?? this.config.defaultSortBy ?? 'created_at';
    const sortOrder = pagination?.sortOrder ?? this.config.defaultSortOrder ?? 'desc';

    const from_row = (page - 1) * pageSize;
    const to_row = from_row + pageSize - 1;

    const source = this.config.viewName ?? this.config.tableName;
    const selectFields = this.config.selectFields ?? '*';

    let query = this.supabase.client
      .from(source)
      .select(selectFields, { count: 'exact' });

    // Aplicar filtros - pasamos como any para evitar problemas de tipos de Supabase
    query = this.applyFilters(query as any, filters) as any;

    // Ordenar y paginar
    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from_row, to_row);

    const { data, error, count } = await query;

    if (error) {
      this.logError('fetchAll', error);
      return this.emptyPaginatedResponse(page, pageSize);
    }

    const total = count ?? 0;
    return {
      data: (data ?? []) as unknown as T[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Obtiene un registro por ID
   */
  getById(id: string): Observable<ServiceResponse<T>> {
    return from(this.fetchById(id));
  }

  /**
   * Implementación async de getById
   */
  protected async fetchById(id: string): Promise<ServiceResponse<T>> {
    const source = this.config.viewName ?? this.config.tableName;
    const selectFields = this.config.selectFields ?? '*';

    const { data, error } = await this.supabase.client
      .from(source)
      .select(selectFields)
      .eq('id', id)
      .single();

    if (error) {
      this.logError('fetchById', error);
      return this.errorResponse(error.message);
    }

    return this.successResponse(data as unknown as T);
  }

  /**
   * Búsqueda simple para autocomplete
   */
  search(term: string, limit: number = 10): Observable<ServiceResponse<T[]>> {
    return from(this.searchAsync(term, limit));
  }

  /**
   * Implementación async de search
   */
  protected async searchAsync(term: string, limit: number): Promise<ServiceResponse<T[]>> {
    if (!this.config.searchFields?.length) {
      return this.errorResponse('Search fields not configured');
    }

    const searchCondition = this.config.searchFields
      .map(field => `${field}.ilike.%${term}%`)
      .join(',');

    const { data, error } = await this.supabase.client
      .from(this.config.tableName)
      .select(this.config.selectFields ?? '*')
      .or(searchCondition)
      .limit(limit);

    if (error) {
      this.logError('search', error);
      return this.errorResponse(error.message);
    }

    return this.successResponse((data ?? []) as unknown as T[]);
  }

  // ============================================================================
  // CREATE Operations
  // ============================================================================

  /**
   * Crea un nuevo registro
   */
  create(dto: TCreate): Observable<ServiceResponse<T>> {
    return from(this.insertRecord(dto));
  }

  /**
   * Implementación async de create
   */
  protected async insertRecord(dto: TCreate): Promise<ServiceResponse<T>> {
    const record = this.beforeCreate(dto);

    const { data, error } = await this.supabase.client
      .from(this.config.tableName)
      .insert(record)
      .select()
      .single();

    if (error) {
      this.logError('create', error);
      return this.errorResponse(this.mapError(error.message));
    }

    return this.successResponse(data as unknown as T);
  }

  // ============================================================================
  // UPDATE Operations
  // ============================================================================

  /**
   * Actualiza un registro existente
   */
  update(id: string, dto: TUpdate): Observable<ServiceResponse<T>> {
    return from(this.updateRecord(id, dto));
  }

  /**
   * Implementación async de update
   */
  protected async updateRecord(id: string, dto: TUpdate): Promise<ServiceResponse<T>> {
    const record = this.beforeUpdate(dto);

    const { data, error } = await this.supabase.client
      .from(this.config.tableName)
      .update({
        ...record,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logError('update', error);
      return this.errorResponse(this.mapError(error.message));
    }

    return this.successResponse(data as unknown as T);
  }

  // ============================================================================
  // DELETE Operations
  // ============================================================================

  /**
   * Elimina un registro (soft o hard delete según configuración)
   */
  delete(id: string): Observable<ServiceResponse<void>> {
    return from(this.deleteRecord(id));
  }

  /**
   * Implementación async de delete
   */
  protected async deleteRecord(id: string): Promise<ServiceResponse<void>> {
    if (this.config.softDelete) {
      return this.softDeleteRecord(id);
    }
    return this.hardDeleteRecord(id);
  }

  /**
   * Soft delete - actualiza el campo de estatus
   */
  protected async softDeleteRecord(id: string): Promise<ServiceResponse<void>> {
    const statusField = this.config.statusField ?? 'estatus';
    const deletedStatus = this.config.deletedStatus ?? 'Inactivo';

    const { error } = await this.supabase.client
      .from(this.config.tableName)
      .update({
        [statusField]: deletedStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      this.logError('softDelete', error);
      return this.errorResponse(error.message);
    }

    return { data: null, error: null, success: true };
  }

  /**
   * Hard delete - elimina el registro
   */
  protected async hardDeleteRecord(id: string): Promise<ServiceResponse<void>> {
    const { error } = await this.supabase.client
      .from(this.config.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      this.logError('hardDelete', error);
      return this.errorResponse(error.message);
    }

    return { data: null, error: null, success: true };
  }

  // ============================================================================
  // Filter Methods - Override in child classes for custom filtering
  // ============================================================================

  /**
   * Aplica filtros a una query de Supabase
   * Sobrescribir en clases hijas para filtros personalizados
   *
   * @param query - Query de Supabase (usar tipo any para flexibilidad)
   * @param filters - Filtros a aplicar
   * @returns Query con filtros aplicados
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected applyFilters(query: any, filters?: TFilters): any {
    if (!filters) return query;

    // Filtro de búsqueda genérico
    if (filters.search && this.config.searchFields?.length) {
      const searchCondition = this.config.searchFields
        .map(field => `${field}.ilike.%${filters.search}%`)
        .join(',');
      query = query.or(searchCondition);
    }

    return query;
  }

  // ============================================================================
  // Hooks - Override in child classes for custom behavior
  // ============================================================================

  /**
   * Hook antes de crear - permite modificar el DTO
   */
  protected beforeCreate(dto: TCreate): Record<string, unknown> {
    return dto as Record<string, unknown>;
  }

  /**
   * Hook antes de actualizar - permite modificar el DTO
   */
  protected beforeUpdate(dto: TUpdate): Record<string, unknown> {
    return dto as Record<string, unknown>;
  }

  // ============================================================================
  // Error Handling
  // ============================================================================

  /**
   * Mapea errores de Supabase a mensajes amigables
   * Sobrescribir en clases hijas para mensajes específicos
   */
  protected mapError(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('duplicate') || lowerMessage.includes('unique')) {
      return 'Ya existe un registro con esos datos';
    }
    if (lowerMessage.includes('foreign key')) {
      return 'Referencia inválida a otro registro';
    }
    if (lowerMessage.includes('not found')) {
      return 'Registro no encontrado';
    }

    return message;
  }

  /**
   * Log de errores solo en desarrollo
   */
  protected logError(operation: string, error: unknown): void {
    if (!environment.production) {
      console.error(`[${this.config.tableName}] Error in ${operation}:`, error);
    }
  }

  // ============================================================================
  // Response Helpers
  // ============================================================================

  /**
   * Crea una respuesta de éxito
   */
  protected successResponse<R>(data: R): ServiceResponse<R> {
    return { data, error: null, success: true };
  }

  /**
   * Crea una respuesta de error
   */
  protected errorResponse<R>(error: string): ServiceResponse<R> {
    return { data: null, error, success: false };
  }

  /**
   * Crea una respuesta paginada vacía
   */
  protected emptyPaginatedResponse(page: number, pageSize: number): PaginatedResponse<T> {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0
    };
  }
}
