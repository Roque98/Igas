// ============================================================================
// Ticket List Component
// ============================================================================
// Componente para listar tickets con filtros, búsqueda y paginación
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { NgbPaginationModule, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { TicketService } from 'src/app/core/services/ticket.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  TicketConSLA,
  TicketFilters,
  CategoriaServicio,
  EstatusTicket,
  Prioridad,
  SemaforoSLA,
  PaginationOptions
} from 'src/app/core/models';
import {
  SemaforoBadgeComponent,
  PrioridadBadgeComponent,
  EstatusBadgeComponent,
  ProgressBarSLAComponent
} from '../../components';

@Component({
  selector: 'app-ticket-list',
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
    EstatusBadgeComponent,
    ProgressBarSLAComponent
  ],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent implements OnInit {
  private ticketService = inject(TicketService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  tickets = signal<TicketConSLA[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Paginación
  currentPage = signal(1);
  pageSize = signal(10);
  totalItems = signal(0);
  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  // Filtros
  searchTerm = signal('');
  selectedCategoriaId = signal<string | null>(null);
  selectedEstatusIds = signal<string[]>([]);
  selectedPrioridad = signal<Prioridad | null>(null);
  selectedSemaforo = signal<SemaforoSLA | null>(null);
  selectedResponsableId = signal<string | null>(null);
  soloMisTickets = signal(false);
  soloSinAsignar = signal(false);

  // Ordenamiento
  sortBy = signal<string>('fecha_creacion');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Catálogos
  categorias = signal<CategoriaServicio[]>([]);
  estatus = signal<EstatusTicket[]>([]);

  // Opciones de prioridad y semáforo
  prioridades: Prioridad[] = ['Crítica', 'Alta', 'Media', 'Baja'];
  semaforos: { value: SemaforoSLA; label: string }[] = [
    { value: 'verde', label: 'En tiempo' },
    { value: 'amarillo', label: 'Por vencer' },
    { value: 'rojo', label: 'Vencido' }
  ];

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.loadCatalogos();
    this.parseQueryParams();
    this.loadTickets();
  }

  // ============================================================================
  // Métodos de carga
  // ============================================================================

  private parseQueryParams(): void {
    const params = this.route.snapshot.queryParams;
    if (params['filter']) {
      switch (params['filter']) {
        case 'mis-tickets':
          this.soloMisTickets.set(true);
          break;
        case 'sin-asignar':
          this.soloSinAsignar.set(true);
          break;
        case 'verde':
        case 'amarillo':
        case 'rojo':
          this.selectedSemaforo.set(params['filter'] as SemaforoSLA);
          break;
        case 'alertas':
          this.selectedSemaforo.set(null);
          // Filtrar solo amarillos y rojos via estatus o semáforo
          break;
      }
    }
  }

  private loadCatalogos(): void {
    // Cargar categorías
    this.ticketService.getCategorias().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.categorias.set(response.data);
        }
      }
    });

    // Cargar estatus
    this.ticketService.getEstatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.estatus.set(response.data);
        }
      }
    });
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: TicketFilters = {};

    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedCategoriaId()) filters.categoria_id = this.selectedCategoriaId()!;
    if (this.selectedEstatusIds().length > 0) filters.estatus_ids = this.selectedEstatusIds();
    if (this.selectedPrioridad()) filters.prioridad = this.selectedPrioridad()!;
    if (this.selectedSemaforo()) filters.semaforo = this.selectedSemaforo()!;
    if (this.selectedResponsableId()) filters.responsable_id = this.selectedResponsableId()!;
    if (this.soloMisTickets()) filters.solo_mis_tickets = true;
    if (this.soloSinAsignar()) filters.solo_sin_asignar = true;

    const pagination: PaginationOptions = {
      page: this.currentPage(),
      pageSize: this.pageSize(),
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder()
    };

    this.ticketService.getTickets(filters, pagination).subscribe({
      next: (response) => {
        this.tickets.set(response.data);
        this.totalItems.set(response.total);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading tickets:', err);
        this.error.set('Error al cargar tickets');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de tickets');
      }
    });
  }

  // ============================================================================
  // Filtros y búsqueda
  // ============================================================================

  onSearch(): void {
    this.currentPage.set(1);
    this.loadTickets();
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadTickets();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategoriaId.set(null);
    this.selectedEstatusIds.set([]);
    this.selectedPrioridad.set(null);
    this.selectedSemaforo.set(null);
    this.selectedResponsableId.set(null);
    this.soloMisTickets.set(false);
    this.soloSinAsignar.set(false);
    this.currentPage.set(1);
    this.loadTickets();
  }

  toggleEstatusFilter(estatusId: string): void {
    const current = this.selectedEstatusIds();
    if (current.includes(estatusId)) {
      this.selectedEstatusIds.set(current.filter(id => id !== estatusId));
    } else {
      this.selectedEstatusIds.set([...current, estatusId]);
    }
    this.onFilterChange();
  }

  isEstatusSelected(estatusId: string): boolean {
    return this.selectedEstatusIds().includes(estatusId);
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
    this.loadTickets();
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
    this.loadTickets();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadTickets();
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  viewTicket(ticket: TicketConSLA): void {
    this.router.navigate(['/tickets', ticket.id]);
  }

  editTicket(ticket: TicketConSLA): void {
    this.router.navigate(['/tickets/editar', ticket.id]);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  getEstatusById(id: string): EstatusTicket | undefined {
    return this.estatus().find(e => e.id === id);
  }

  getCategoriaById(id: string): CategoriaServicio | undefined {
    return this.categorias().find(c => c.id === id);
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

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm() ||
      this.selectedCategoriaId() ||
      this.selectedEstatusIds().length > 0 ||
      this.selectedPrioridad() ||
      this.selectedSemaforo() ||
      this.soloMisTickets() ||
      this.soloSinAsignar()
    );
  }
}
