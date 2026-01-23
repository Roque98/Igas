// ============================================================================
// Cliente List Component
// ============================================================================
// Componente para listar clientes con filtros, búsqueda y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbPaginationModule, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  ClienteResumen,
  ClienteFilters,
  TipoCliente,
  EstatusCliente,
  TIPOS_CLIENTE,
  ESTATUS_CLIENTE,
  PaginationOptions
} from 'src/app/core/models';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbPaginationModule,
    NgbTooltipModule,
    NgbDropdownModule,
    SharedModule
  ],
  templateUrl: './cliente-list.component.html',
  styleUrls: ['./cliente-list.component.scss']
})
export class ClienteListComponent implements OnInit {
  private clienteService = inject(ClienteService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  clientes = signal<ClienteResumen[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = signal(15);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filtros
  searchTerm = signal('');
  selectedTipoCliente = signal<TipoCliente | null>(null);
  selectedEstatus = signal<EstatusCliente | null>(null);
  conPolizaActiva = signal(false);
  conLicenciasPorVencer = signal(false);
  conAlertas = signal(false);

  // Ordenamiento
  sortBy = signal<string>('razon_social');
  sortOrder = signal<'asc' | 'desc'>('asc');

  // Catálogos
  tiposCliente = TIPOS_CLIENTE;
  estatusCliente = ESTATUS_CLIENTE;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadClientes();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  loadClientes(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: ClienteFilters = {};

    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedTipoCliente()) filters.tipo_cliente = this.selectedTipoCliente()!;
    if (this.selectedEstatus()) filters.estatus_cliente = this.selectedEstatus()!;
    if (this.conPolizaActiva()) filters.con_poliza_activa = true;
    if (this.conLicenciasPorVencer()) filters.con_licencias_por_vencer = true;
    if (this.conAlertas()) filters.con_alertas = true;

    const pagination: PaginationOptions = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };

    this.clienteService.getClientes(filters, pagination).subscribe({
      next: (response) => {
        this.clientes.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading clientes:', err);
        this.error.set('Error al cargar clientes');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de clientes');
      }
    });
  }

  // ============================================================================
  // Filtros y búsqueda
  // ============================================================================

  onSearch(): void {
    this.currentPage.set(1);
    this.loadClientes();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadClientes();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedTipoCliente.set(null);
    this.selectedEstatus.set(null);
    this.conPolizaActiva.set(false);
    this.conLicenciasPorVencer.set(false);
    this.conAlertas.set(false);
    this.currentPage.set(1);
    this.loadClientes();
  }

  // ============================================================================
  // Ordenamiento
  // ============================================================================

  onSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('asc');
    }
    this.loadClientes();
  }

  getSortIcon(column: string): string {
    if (this.sortBy() !== column) return 'feather icon-minus';
    return this.sortOrder() === 'asc' ? 'feather icon-chevron-up' : 'feather icon-chevron-down';
  }

  // ============================================================================
  // Paginación
  // ============================================================================

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadClientes();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadClientes();
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  viewCliente(cliente: ClienteResumen): void {
    this.router.navigate(['/clientes', cliente.id]);
  }

  editCliente(cliente: ClienteResumen): void {
    this.router.navigate(['/clientes', cliente.id, 'editar']);
  }

  createCliente(): void {
    this.router.navigate(['/clientes', 'nuevo']);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  getEstatusColor(estatus: EstatusCliente): string {
    const found = ESTATUS_CLIENTE.find(e => e.value === estatus);
    return found?.color || '#6c757d';
  }

  getTipoClienteClass(tipo: TipoCliente): string {
    switch (tipo) {
      case 'Cliente': return 'bg-success';
      case 'Prospecto': return 'bg-info';
      case 'Inactivo': return 'bg-secondary';
      default: return 'bg-secondary';
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm() ||
      this.selectedTipoCliente() ||
      this.selectedEstatus() ||
      this.conPolizaActiva() ||
      this.conLicenciasPorVencer() ||
      this.conAlertas()
    );
  }

  getLicenciasClass(cliente: ClienteResumen): string {
    if (cliente.licencias_vencidas && cliente.licencias_vencidas > 0) {
      return 'text-danger';
    }
    if (cliente.licencias_por_vencer && cliente.licencias_por_vencer > 0) {
      return 'text-warning';
    }
    return 'text-success';
  }
}
