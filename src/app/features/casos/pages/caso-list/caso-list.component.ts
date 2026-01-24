// ============================================================================
// Caso List Component
// ============================================================================
// Componente para listar casos con filtros, búsqueda y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgbPaginationModule, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { CasoService } from 'src/app/core/services/caso.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  CasoConSLA,
  CasoFilters,
  EstatusCaso,
  AreaDestino,
  MotivoEscalamiento,
  CasoPrioridad,
  CasoSemaforo,
  AREAS_DESTINO,
  MOTIVOS_ESCALAMIENTO,
  PaginationOptions
} from 'src/app/core/models';
import {
  SemaforoBadgeComponent,
  PrioridadBadgeComponent,
  ProgressBarSLAComponent
} from '../../../tickets/components';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-caso-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgbPaginationModule,
    NgbTooltipModule,
    NgbDropdownModule,
    SharedModule,
    SemaforoBadgeComponent,
    PrioridadBadgeComponent,
    ProgressBarSLAComponent
  ],
  templateUrl: './caso-list.component.html',
  styleUrls: ['./caso-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CasoListComponent implements OnInit {
  private casoService = inject(CasoService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  casos = signal<CasoConSLA[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filtros
  searchTerm = signal('');
  selectedAreaDestino = signal<AreaDestino | null>(null);
  selectedMotivo = signal<MotivoEscalamiento | null>(null);
  selectedEstatusId = signal<string | null>(null);
  selectedSemaforo = signal<CasoSemaforo | null>(null);
  soloMisCasos = signal(false);
  soloSinAsignar = signal(false);
  soloCompromisoVencido = signal(false);
  soloAbiertos = signal(false);

  // Ordenamiento
  sortBy = signal<string>('fecha_creacion');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Catálogos
  estatus = signal<EstatusCaso[]>([]);

  // Opciones de filtros
  areasDestino = AREAS_DESTINO;
  motivosEscalamiento = MOTIVOS_ESCALAMIENTO;
  prioridades: CasoPrioridad[] = ['Crítica', 'Alta', 'Media', 'Baja'];
  semaforos: { value: CasoSemaforo; label: string }[] = [
    { value: 'verde', label: 'En tiempo' },
    { value: 'amarillo', label: 'Por vencer' },
    { value: 'rojo', label: 'Vencido' },
    { value: 'azul', label: 'Pausado' },
    { value: 'gris', label: 'Cerrado' }
  ];

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadCatalogos();
    this.parseQueryParams();
    this.loadCasos();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private parseQueryParams(): void {
    const params = this.route.snapshot.queryParams;
    if (params['filter']) {
      switch (params['filter']) {
        case 'mis-casos':
          this.soloMisCasos.set(true);
          break;
        case 'sin-asignar':
          this.soloSinAsignar.set(true);
          break;
        case 'vencidos':
          this.soloCompromisoVencido.set(true);
          break;
        case 'abiertos':
          this.soloAbiertos.set(true);
          break;
        case 'verde':
        case 'amarillo':
        case 'rojo':
          this.selectedSemaforo.set(params['filter'] as CasoSemaforo);
          break;
      }
    }
    if (params['area']) {
      this.selectedAreaDestino.set(params['area'] as AreaDestino);
    }
  }

  private loadCatalogos(): void {
    // Cargar estatus
    this.casoService.getEstatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.estatus.set(response.data);
        }
      }
    });
  }

  loadCasos(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: CasoFilters = {};

    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedAreaDestino()) filters.area_destino = this.selectedAreaDestino()!;
    if (this.selectedMotivo()) filters.motivo = this.selectedMotivo()!;
    if (this.selectedEstatusId()) filters.estatus_id = this.selectedEstatusId()!;
    if (this.selectedSemaforo()) filters.semaforo = this.selectedSemaforo()!;
    if (this.soloMisCasos()) filters.solo_mis_casos = true;
    if (this.soloSinAsignar()) filters.solo_sin_asignar = true;
    if (this.soloCompromisoVencido()) filters.compromiso_vencido = true;
    if (this.soloAbiertos()) filters.solo_abiertos = true;

    const pagination: PaginationOptions = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };

    this.casoService.getCasos(filters, pagination).subscribe({
      next: (response) => {
        this.casos.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading casos:', err); }
        this.error.set('Error al cargar casos');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de casos');
      }
    });
  }

  // ============================================================================
  // Filtros y búsqueda
  // ============================================================================

  onSearch(): void {
    this.currentPage.set(1);
    this.loadCasos();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadCasos();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedAreaDestino.set(null);
    this.selectedMotivo.set(null);
    this.selectedEstatusId.set(null);
    this.selectedSemaforo.set(null);
    this.soloMisCasos.set(false);
    this.soloSinAsignar.set(false);
    this.soloCompromisoVencido.set(false);
    this.soloAbiertos.set(false);
    this.currentPage.set(1);
    this.loadCasos();
  }

  // ============================================================================
  // Ordenamiento
  // ============================================================================

  onSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('desc');
    }
    this.loadCasos();
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
    this.loadCasos();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadCasos();
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  viewCaso(caso: CasoConSLA): void {
    this.router.navigate(['/casos', caso.id]);
  }

  viewTicket(ticketId: string): void {
    this.router.navigate(['/tickets', ticketId]);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  getAreaColor(area: AreaDestino): string {
    const found = AREAS_DESTINO.find(a => a.value === area);
    return found?.color || '#6c757d';
  }

  getMotivoInfo(motivo: MotivoEscalamiento): { label: string; icon: string } {
    const found = MOTIVOS_ESCALAMIENTO.find(m => m.value === motivo);
    return found || { label: motivo, icon: 'help-circle' };
  }

  getEstatusById(id: string): EstatusCaso | undefined {
    return this.estatus().find(e => e.id === id);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDateShort(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short'
    });
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm() ||
      this.selectedAreaDestino() ||
      this.selectedMotivo() ||
      this.selectedEstatusId() ||
      this.selectedSemaforo() ||
      this.soloMisCasos() ||
      this.soloSinAsignar() ||
      this.soloCompromisoVencido() ||
      this.soloAbiertos()
    );
  }
}
