// ============================================================================
// Instalacion List Component
// ============================================================================
// Lista de instalaciones con vista de tabs por estatus (pipeline)
// ============================================================================

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NgbNavModule, NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { InstalacionService } from 'src/app/core/services/instalacion.service';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  InstalacionCompleta,
  InstalacionFilters,
  InstalacionPorEstatus,
  EstatusInstalacion,
  InstalacionEstatus,
  ESTATUS_INSTALACION_CONFIG,
  Cliente,
  Profile
} from 'src/app/core/models';

@Component({
  selector: 'app-instalacion-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbNavModule,
    NgbTooltipModule,
    NgbDropdownModule,
    SharedModule
  ],
  templateUrl: './instalacion-list.component.html',
  styleUrls: ['./instalacion-list.component.scss']
})
export class InstalacionListComponent implements OnInit {
  private instalacionService = inject(InstalacionService);
  private clienteService = inject(ClienteService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Estado
  instalaciones = signal<InstalacionCompleta[]>([]);
  instalacionesPorEstatus = signal<InstalacionPorEstatus[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Tabs
  activeTab = signal<string>('all');

  // Filtros
  searchTerm = signal('');
  selectedClienteId = signal<string | null>(null);
  selectedTecnicoId = signal<string | null>(null);
  soloMisInstalaciones = signal(false);

  // Catálogos
  estatus = signal<EstatusInstalacion[]>([]);
  clientes = signal<Cliente[]>([]);
  tecnicos = signal<Profile[]>([]);

  estatusConfig = ESTATUS_INSTALACION_CONFIG;

  // Computed - Instalaciones filtradas por tab
  instalacionesFiltradas = computed(() => {
    const tab = this.activeTab();
    const all = this.instalaciones();

    if (tab === 'all') return all;
    return all.filter(i => i.estatus_nombre === tab);
  });

  ngOnInit(): void {
    this.loadCatalogos();
    this.parseQueryParams();
    this.loadInstalaciones();
    this.loadInstalacionesPorEstatus();
  }

  private parseQueryParams(): void {
    const params = this.route.snapshot.queryParams;
    if (params['estatus']) {
      this.activeTab.set(params['estatus']);
    }
    if (params['cliente']) {
      this.selectedClienteId.set(params['cliente']);
    }
  }

  private loadCatalogos(): void {
    this.instalacionService.getEstatus().subscribe({
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

  loadInstalaciones(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: InstalacionFilters = {};

    if (this.searchTerm()) filters.search = this.searchTerm();
    if (this.selectedClienteId()) filters.cliente_id = this.selectedClienteId()!;
    if (this.selectedTecnicoId()) filters.tecnico_id = this.selectedTecnicoId()!;
    if (this.soloMisInstalaciones()) filters.solo_mis_instalaciones = true;

    this.instalacionService.getInstalaciones(filters, { page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.instalaciones.set(response.data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading instalaciones:', err);
        this.error.set('Error al cargar instalaciones');
        this.loading.set(false);
        this.notificationService.error('Error al cargar la lista de instalaciones');
      }
    });
  }

  loadInstalacionesPorEstatus(): void {
    this.instalacionService.getInstalacionesPorEstatus().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.instalacionesPorEstatus.set(response.data);
        }
      }
    });
  }

  // Filtros
  onSearch(): void {
    this.loadInstalaciones();
  }

  onFilterChange(): void {
    this.loadInstalaciones();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedClienteId.set(null);
    this.selectedTecnicoId.set(null);
    this.soloMisInstalaciones.set(false);
    this.loadInstalaciones();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm() ||
      this.selectedClienteId() ||
      this.selectedTecnicoId() ||
      this.soloMisInstalaciones()
    );
  }

  // Tabs
  onTabChange(tab: string): void {
    this.activeTab.set(tab);
  }

  getEstatusCount(estatusNombre: string): number {
    const found = this.instalacionesPorEstatus().find(e => e.estatus_nombre === estatusNombre);
    return found ? Number(found.total) : 0;
  }

  getTotalInstalaciones(): number {
    return this.instalacionesPorEstatus().reduce((acc, e) => acc + Number(e.total), 0);
  }

  // Navegación
  viewInstalacion(inst: InstalacionCompleta): void {
    this.router.navigate(['/instalaciones', inst.id]);
  }

  newInstalacion(): void {
    this.router.navigate(['/instalaciones', 'nuevo']);
  }

  // Helpers
  getChecklistProgress(inst: InstalacionCompleta): number {
    if (!inst.checklist_total || inst.checklist_total === 0) return 0;
    return Math.round((inst.checklist_completados || 0) / inst.checklist_total * 100);
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
