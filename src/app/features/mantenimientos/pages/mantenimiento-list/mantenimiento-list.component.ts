// ============================================================================
// Mantenimiento List Component
// ============================================================================
// Lista de mantenimientos con filtros y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgbPaginationModule, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MantenimientoService } from 'src/app/core/services/mantenimiento.service';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  MantenimientoCompleto,
  MantenimientoFilters,
  TipoMantenimiento,
  EstatusMantenimiento,
  MantenimientoResultado,
  RESULTADO_CONFIG,
  Cliente,
  Profile,
  PaginationOptions
} from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-mantenimiento-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbPaginationModule,
    NgbTooltipModule,
    NgbDropdownModule,
    SharedModule
  ],
  templateUrl: './mantenimiento-list.component.html',
  styleUrls: ['./mantenimiento-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenimientoListComponent implements OnInit {
  private mantenimientoService = inject(MantenimientoService);
  private clienteService = inject(ClienteService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Estado
  mantenimientos = signal<MantenimientoCompleto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filtros
  searchTerm = signal('');
  selectedClienteId = signal<string | null>(null);
  selectedTipoId = signal<string | null>(null);
  selectedEstatusId = signal<string | null>(null);
  selectedTecnicoId = signal<string | null>(null);
  selectedResultado = signal<MantenimientoResultado | null>(null);
  fechaDesde = signal<string | null>(null);
  fechaHasta = signal<string | null>(null);
  soloMisMantenimientos = signal(false);

  // Ordenamiento
  sortBy = signal<string>('fecha_programada');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Catálogos
  tipos = signal<TipoMantenimiento[]>([]);
  estatus = signal<EstatusMantenimiento[]>([]);
  clientes = signal<Cliente[]>([]);
  tecnicos = signal<Profile[]>([]);

  resultados: MantenimientoResultado[] = ['Completado', 'Parcial', 'Requiere acción', 'No realizado'];
  resultadoConfig = RESULTADO_CONFIG;

  ngOnInit(): void {
    this.loadCatalogos();
    this.parseQueryParams();
    this.loadMantenimientos();
  }

  private parseQueryParams(): void {
    const params = this.route.snapshot.queryParams;
    if (params['cliente']) {
      this.selectedClienteId.set(params['cliente']);
    }
    if (params['tecnico']) {
      this.selectedTecnicoId.set(params['tecnico']);
    }
    if (params['filter'] === 'mis-mantenimientos') {
      this.soloMisMantenimientos.set(true);
    }
  }

  private loadCatalogos(): void {
    this.mantenimientoService.getTiposMantenimiento().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tipos.set(response.data);
        }
      }
    });

    this.mantenimientoService.getEstatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.estatus.set(response.data);
        }
      }
    });

    this.clienteService.getClientes({}, { page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.clientes.set(response.data);
      }
    });

    this.userService.getUsers({}, { page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.tecnicos.set(response.data);
      }
    });
  }

  loadMantenimientos(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: MantenimientoFilters = {};

    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedClienteId()) filters.cliente_id = this.selectedClienteId()!;
    if (this.selectedTipoId()) filters.tipo_mantenimiento_id = this.selectedTipoId()!;
    if (this.selectedEstatusId()) filters.estatus_id = this.selectedEstatusId()!;
    if (this.selectedTecnicoId()) filters.tecnico_id = this.selectedTecnicoId()!;
    if (this.selectedResultado()) filters.resultado = this.selectedResultado()!;
    if (this.fechaDesde()) filters.fecha_desde = this.fechaDesde()!;
    if (this.fechaHasta()) filters.fecha_hasta = this.fechaHasta()!;
    if (this.soloMisMantenimientos()) filters.solo_mis_mantenimientos = true;

    const pagination: PaginationOptions = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };

    this.mantenimientoService.getMantenimientos(filters, pagination).subscribe({
      next: (response) => {
        this.mantenimientos.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading mantenimientos:', err); }
        this.error.set('Error al cargar mantenimientos');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de mantenimientos');
      }
    });
  }

  // Filtros
  onSearch(): void {
    this.currentPage.set(1);
    this.loadMantenimientos();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadMantenimientos();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedClienteId.set(null);
    this.selectedTipoId.set(null);
    this.selectedEstatusId.set(null);
    this.selectedTecnicoId.set(null);
    this.selectedResultado.set(null);
    this.fechaDesde.set(null);
    this.fechaHasta.set(null);
    this.soloMisMantenimientos.set(false);
    this.currentPage.set(1);
    this.loadMantenimientos();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm() ||
      this.selectedClienteId() ||
      this.selectedTipoId() ||
      this.selectedEstatusId() ||
      this.selectedTecnicoId() ||
      this.selectedResultado() ||
      this.fechaDesde() ||
      this.fechaHasta() ||
      this.soloMisMantenimientos()
    );
  }

  // Ordenamiento
  onSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('desc');
    }
    this.loadMantenimientos();
  }

  getSortIcon(column: string): string {
    if (this.sortBy() !== column) return 'feather icon-minus';
    return this.sortOrder() === 'asc' ? 'feather icon-chevron-up' : 'feather icon-chevron-down';
  }

  // Paginación
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadMantenimientos();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadMantenimientos();
  }

  // Navegación
  viewMantenimiento(m: MantenimientoCompleto): void {
    this.router.navigate(['/mantenimientos', m.id]);
  }

  newMantenimiento(): void {
    this.router.navigate(['/mantenimientos', 'nuevo']);
  }

  goToCalendar(): void {
    this.router.navigate(['/mantenimientos', 'calendario']);
  }

  // Helpers
  getChecklistProgress(m: MantenimientoCompleto): number {
    if (!m.checklist_total || m.checklist_total === 0) return 0;
    return Math.round((m.checklist_completados || 0) / m.checklist_total * 100);
  }

  getProgressClass(progress: number): string {
    if (progress === 100) return 'bg-success';
    if (progress >= 70) return 'bg-primary';
    if (progress >= 30) return 'bg-warning';
    return 'bg-secondary';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatTime(timeString: string | undefined): string {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  }
}
