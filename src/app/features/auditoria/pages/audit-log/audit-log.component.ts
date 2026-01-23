// ============================================================================
// Audit Log Component
// ============================================================================
// Componente para visualizar logs de auditoría y sesiones (solo admin)
// ============================================================================

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule, NgbPaginationModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { AuditService } from 'src/app/core/services/audit.service';
import {
  AuditLogDetail,
  SessionLogDetail,
  AuditFilters,
  SessionFilters,
  AuditAction,
  SessionAction,
  ACCION_NOMBRES,
  ACCION_COLORES,
  SESSION_ACCION_NOMBRES,
  SESSION_ACCION_COLORES
} from 'src/app/core/models';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbTooltipModule,
    NgbPaginationModule,
    NgbNavModule,
    SharedModule
  ],
  templateUrl: './audit-log.component.html',
  styleUrls: ['./audit-log.component.scss']
})
export class AuditLogComponent implements OnInit {
  private auditService = inject(AuditService);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  // Tab activo
  activeTab = signal<'cambios' | 'sesiones'>('cambios');

  // Logs de auditoría
  auditLogs = signal<AuditLogDetail[]>([]);
  loadingAudit = signal(false);
  auditTotal = signal(0);
  auditPage = signal(1);
  auditPageSize = signal(15);

  // Logs de sesiones
  sessionLogs = signal<SessionLogDetail[]>([]);
  loadingSessions = signal(false);
  sessionTotal = signal(0);
  sessionPage = signal(1);
  sessionPageSize = signal(15);

  // Filtros de auditoría
  auditFilters = signal<AuditFilters>({});
  filterTabla = '';
  filterAccion = '';
  filterFechaDesde = '';
  filterFechaHasta = '';
  filterSearch = '';

  // Filtros de sesiones
  sessionFilters = signal<SessionFilters>({});
  filterSessionAccion = '';
  filterSessionFechaDesde = '';
  filterSessionFechaHasta = '';
  filterSessionEmail = '';

  // Estadísticas
  auditStats = signal<{ totalCambios: number; cambiosHoy: number; porTabla: { tabla: string; count: number }[] }>({
    totalCambios: 0,
    cambiosHoy: 0,
    porTabla: []
  });
  sessionStats = signal<{ loginsHoy: number; loginsFallidosHoy: number; logoutsHoy: number }>({
    loginsHoy: 0,
    loginsFallidosHoy: 0,
    logoutsHoy: 0
  });

  // Detalle seleccionado
  selectedLog = signal<AuditLogDetail | null>(null);
  showDetailModal = signal(false);

  // Tablas disponibles
  tablasDisponibles = this.auditService.getTablasDisponibles();

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadAuditLogs();
    this.loadStats();
  }

  // ============================================================================
  // Carga de datos
  // ============================================================================

  loadAuditLogs(): void {
    this.loadingAudit.set(true);

    this.auditService.getAuditLogs(this.auditFilters(), {
      page: this.auditPage(),
      pageSize: this.auditPageSize(),
      sortBy: 'created_at',
      sortOrder: 'desc'
    }).subscribe({
      next: (response) => {
        this.auditLogs.set(response.data);
        this.auditTotal.set(response.total);
        this.loadingAudit.set(false);
      },
      error: () => {
        this.loadingAudit.set(false);
      }
    });
  }

  loadSessionLogs(): void {
    this.loadingSessions.set(true);

    this.auditService.getSessionLogs(this.sessionFilters(), {
      page: this.sessionPage(),
      pageSize: this.sessionPageSize(),
      sortBy: 'created_at',
      sortOrder: 'desc'
    }).subscribe({
      next: (response) => {
        this.sessionLogs.set(response.data);
        this.sessionTotal.set(response.total);
        this.loadingSessions.set(false);
      },
      error: () => {
        this.loadingSessions.set(false);
      }
    });
  }

  async loadStats(): Promise<void> {
    const [auditStats, sessionStats] = await Promise.all([
      this.auditService.getAuditStats(),
      this.auditService.getSessionStats()
    ]);
    this.auditStats.set(auditStats);
    this.sessionStats.set(sessionStats);
  }

  // ============================================================================
  // Navegación de tabs
  // ============================================================================

  onTabChange(tab: 'cambios' | 'sesiones'): void {
    this.activeTab.set(tab);
    if (tab === 'sesiones' && this.sessionLogs().length === 0) {
      this.loadSessionLogs();
    }
  }

  // ============================================================================
  // Filtros de auditoría
  // ============================================================================

  applyAuditFilters(): void {
    const filters: AuditFilters = {};
    if (this.filterTabla) filters.tabla = this.filterTabla;
    if (this.filterAccion) filters.accion = this.filterAccion as AuditAction;
    if (this.filterFechaDesde) filters.fecha_desde = this.filterFechaDesde;
    if (this.filterFechaHasta) filters.fecha_hasta = this.filterFechaHasta;
    if (this.filterSearch) filters.search = this.filterSearch;

    this.auditFilters.set(filters);
    this.auditPage.set(1);
    this.loadAuditLogs();
  }

  clearAuditFilters(): void {
    this.filterTabla = '';
    this.filterAccion = '';
    this.filterFechaDesde = '';
    this.filterFechaHasta = '';
    this.filterSearch = '';
    this.auditFilters.set({});
    this.auditPage.set(1);
    this.loadAuditLogs();
  }

  // ============================================================================
  // Filtros de sesiones
  // ============================================================================

  applySessionFilters(): void {
    const filters: SessionFilters = {};
    if (this.filterSessionAccion) filters.accion = this.filterSessionAccion as SessionAction;
    if (this.filterSessionFechaDesde) filters.fecha_desde = this.filterSessionFechaDesde;
    if (this.filterSessionFechaHasta) filters.fecha_hasta = this.filterSessionFechaHasta;
    if (this.filterSessionEmail) filters.email = this.filterSessionEmail;

    this.sessionFilters.set(filters);
    this.sessionPage.set(1);
    this.loadSessionLogs();
  }

  clearSessionFilters(): void {
    this.filterSessionAccion = '';
    this.filterSessionFechaDesde = '';
    this.filterSessionFechaHasta = '';
    this.filterSessionEmail = '';
    this.sessionFilters.set({});
    this.sessionPage.set(1);
    this.loadSessionLogs();
  }

  // ============================================================================
  // Paginación
  // ============================================================================

  onAuditPageChange(page: number): void {
    this.auditPage.set(page);
    this.loadAuditLogs();
  }

  onSessionPageChange(page: number): void {
    this.sessionPage.set(page);
    this.loadSessionLogs();
  }

  // ============================================================================
  // Detalle
  // ============================================================================

  viewDetail(log: AuditLogDetail): void {
    this.selectedLog.set(log);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedLog.set(null);
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  getTablaNombre(tabla: string): string {
    return this.auditService.getTablaNombre(tabla);
  }

  getAccionNombre(accion: string): string {
    return ACCION_NOMBRES[accion as AuditAction] || accion;
  }

  getAccionColor(accion: string): string {
    return ACCION_COLORES[accion as AuditAction] || 'secondary';
  }

  getSessionAccionNombre(accion: string): string {
    return SESSION_ACCION_NOMBRES[accion as SessionAction] || accion;
  }

  getSessionAccionColor(accion: string): string {
    return SESSION_ACCION_COLORES[accion as SessionAction] || 'secondary';
  }

  getChangedFields(log: AuditLogDetail): string[] {
    return this.auditService.getChangedFields(log.datos_anteriores, log.datos_nuevos);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatJson(data: Record<string, unknown> | null): string {
    if (!data) return '-';
    return JSON.stringify(data, null, 2);
  }
}
