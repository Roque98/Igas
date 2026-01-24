// ============================================================================
// Cliente Detail Component
// ============================================================================
// Componente para mostrar el detalle de un cliente con pestañas
// ============================================================================

import { Component, OnInit, inject, signal, TemplateRef, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  NgbNavModule,
  NgbTooltipModule,
  NgbModalModule,
  NgbModal,
  NgbModalRef
} from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  Cliente,
  Sucursal,
  ContactoCliente,
  DatosFiscales,
  LicenciaConEstado,
  LicenciaRenovacion,
  PolizaConEstado,
  TIPOS_CONTACTO,
  ESTATUS_CLIENTE,
  ESTATUS_LICENCIA,
  ESTATUS_POLIZA,
  TIPOS_POLIZA,
  ESTADOS_MEXICO,
  EstatusLicencia,
  EstatusPoliza,
  TipoContacto,
  TipoPoliza
} from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';

// Interfaces para formularios
interface SucursalForm {
  nombre: string;
  es_matriz: boolean;
  calle: string;
  numero_exterior: string;
  numero_interior: string;
  colonia: string;
  municipio: string;
  ciudad: string;
  estado: string;
  codigo_postal: string;
  telefono: string;
  email: string;
  contacto_local: string;
}

interface ContactoForm {
  nombre_completo: string;
  tipo: TipoContacto;
  sucursal_id: string;
  puesto: string;
  telefono: string;
  celular: string;
  email: string;
  es_contacto_principal: boolean;
  notas: string;
}

interface LicenciaForm {
  tipo: string;
  folio: string;
  numero_serie: string;
  producto: string;
  version: string;
  sucursal_id: string;
  fecha_activacion: string;
  fecha_vencimiento: string;
  dias_alerta_previa: number;
  notas: string;
}

interface PolizaForm {
  numero_poliza: string;
  tipo: TipoPoliza;
  fecha_inicio: string;
  fecha_vencimiento: string;
  costo: number | null;
  cobertura: string;
  horas_incluidas: number | null;
  dias_alerta_previa: number;
  notas: string;
}

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgbNavModule,
    NgbTooltipModule,
    NgbModalModule,
    SharedModule
  ],
  templateUrl: './cliente-detail.component.html',
  styleUrls: ['./cliente-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClienteDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clienteService = inject(ClienteService);
  private notificationService = inject(NotificationService);
  private modalService = inject(NgbModal);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  cliente = signal<Cliente | null>(null);
  sucursales = signal<Sucursal[]>([]);
  contactos = signal<ContactoCliente[]>([]);
  datosFiscales = signal<DatosFiscales | null>(null);
  licencias = signal<LicenciaConEstado[]>([]);
  polizas = signal<PolizaConEstado[]>([]);

  loading = signal(true);
  loadingSucursales = signal(false);
  loadingContactos = signal(false);
  loadingFiscales = signal(false);
  loadingLicencias = signal(false);
  loadingPolizas = signal(false);

  error = signal<string | null>(null);
  activeTab = signal(1);
  clienteId = signal<string | null>(null);

  // ============================================================================
  // FASE 1: Signals para modales de renovación
  // ============================================================================

  selectedLicencia = signal<LicenciaConEstado | null>(null);
  selectedPoliza = signal<PolizaConEstado | null>(null);
  renovarNuevaFecha = signal('');
  renovarCosto = signal<number | null>(null);
  renovarNotas = signal('');
  savingAction = signal(false);

  // ============================================================================
  // FASE 2: Signals para CRUD Sucursales
  // ============================================================================

  editingSucursal = signal<Sucursal | null>(null);
  sucursalForm = signal<SucursalForm>(this.getEmptySucursalForm());
  deletingSucursal = signal<Sucursal | null>(null);

  // ============================================================================
  // FASE 3: Signals para CRUD Contactos
  // ============================================================================

  editingContacto = signal<ContactoCliente | null>(null);
  contactoForm = signal<ContactoForm>(this.getEmptyContactoForm());
  deletingContacto = signal<ContactoCliente | null>(null);

  // ============================================================================
  // FASE 4: Signals para CRUD Licencias
  // ============================================================================

  editingLicencia = signal<LicenciaConEstado | null>(null);
  licenciaForm = signal<LicenciaForm>(this.getEmptyLicenciaForm());
  historialRenovaciones = signal<LicenciaRenovacion[]>([]);
  loadingHistorial = signal(false);

  // ============================================================================
  // FASE 5: Signals para CRUD Pólizas
  // ============================================================================

  editingPoliza = signal<PolizaConEstado | null>(null);
  polizaForm = signal<PolizaForm>(this.getEmptyPolizaForm());

  // Modal reference
  private activeModal: NgbModalRef | null = null;

  // Catálogos
  tiposContacto = TIPOS_CONTACTO;
  estatusCliente = ESTATUS_CLIENTE;
  estatusLicencia = ESTATUS_LICENCIA;
  estatusPoliza = ESTATUS_POLIZA;
  tiposPoliza = TIPOS_POLIZA;
  estadosMexico = ESTADOS_MEXICO;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clienteId.set(id);
      this.loadCliente(id);
    } else {
      this.error.set('ID de cliente no válido');
      this.loading.set(false);
    }
  }

  // ============================================================================
  // Carga de datos
  // ============================================================================

  private loadCliente(id: string): void {
    this.loading.set(true);
    this.clienteService.getClienteById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cliente.set(response.data);
          this.loadSucursales(id);
          this.loadContactos(id);
          this.loadDatosFiscales(id);
          this.loadLicencias(id);
          this.loadPolizas(id);
        } else {
          this.error.set('Cliente no encontrado');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading cliente:', err); }
        this.error.set('Error al cargar el cliente');
        this.loading.set(false);
        this.notificationService.error('Error al cargar el cliente');
      }
    });
  }

  loadSucursales(clienteId: string): void {
    this.loadingSucursales.set(true);
    this.clienteService.getSucursales(clienteId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sucursales.set(response.data);
        }
        this.loadingSucursales.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading sucursales:', err); }
        this.loadingSucursales.set(false);
      }
    });
  }

  loadContactos(clienteId: string): void {
    this.loadingContactos.set(true);
    this.clienteService.getContactos(clienteId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.contactos.set(response.data);
        }
        this.loadingContactos.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading contactos:', err); }
        this.loadingContactos.set(false);
      }
    });
  }

  loadDatosFiscales(clienteId: string): void {
    this.loadingFiscales.set(true);
    this.clienteService.getDatosFiscales(clienteId).subscribe({
      next: (response) => {
        if (response.success) {
          this.datosFiscales.set(response.data);
        }
        this.loadingFiscales.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading datos fiscales:', err); }
        this.loadingFiscales.set(false);
      }
    });
  }

  loadLicencias(clienteId: string): void {
    this.loadingLicencias.set(true);
    this.clienteService.getLicencias({ cliente_id: clienteId }).subscribe({
      next: (response) => {
        this.licencias.set(response.data);
        this.loadingLicencias.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading licencias:', err); }
        this.loadingLicencias.set(false);
      }
    });
  }

  loadPolizas(clienteId: string): void {
    this.loadingPolizas.set(true);
    this.clienteService.getPolizas({ cliente_id: clienteId }).subscribe({
      next: (response) => {
        this.polizas.set(response.data);
        this.loadingPolizas.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading polizas:', err); }
        this.loadingPolizas.set(false);
      }
    });
  }

  // ============================================================================
  // Navegación
  // ============================================================================

  goBack(): void {
    this.router.navigate(['/clientes']);
  }

  editCliente(): void {
    const id = this.clienteId();
    if (id) {
      this.router.navigate(['/clientes', id, 'editar']);
    }
  }

  onTabChange(tabId: number): void {
    this.activeTab.set(tabId);
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  getEstatusColor(estatus: string): string {
    const found = this.estatusCliente.find(e => e.value === estatus);
    return found?.color || '#6c757d';
  }

  getTipoContactoLabel(tipo: string): string {
    const found = this.tiposContacto.find(t => t.value === tipo);
    return found?.label || tipo;
  }

  getLicenciaEstatusColor(estatus: EstatusLicencia): string {
    const found = this.estatusLicencia.find(e => e.value === estatus);
    return found?.color || '#6c757d';
  }

  getPolizaEstatusColor(estatus: EstatusPoliza): string {
    const found = this.estatusPoliza.find(e => e.value === estatus);
    return found?.color || '#6c757d';
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getSucursalMatriz(): Sucursal | undefined {
    return this.sucursales().find(s => s.es_matriz);
  }

  getContactoPrincipal(): ContactoCliente | undefined {
    return this.contactos().find(c => c.es_contacto_principal);
  }

  getDiasParaVencer(fechaVencimiento: string | undefined): number | null {
    if (!fechaVencimiento) return null;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diff = vencimiento.getTime() - hoy.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDiasClass(dias: number | null): string {
    if (dias === null) return '';
    if (dias < 0) return 'text-danger';
    if (dias <= 30) return 'text-warning';
    return 'text-success';
  }

  copyToClipboard(text: string | undefined): void {
    if (text) {
      navigator.clipboard.writeText(text);
      this.notificationService.success('Copiado al portapapeles');
    }
  }

  // ============================================================================
  // Form Initializers
  // ============================================================================

  private getEmptySucursalForm(): SucursalForm {
    return {
      nombre: '',
      es_matriz: false,
      calle: '',
      numero_exterior: '',
      numero_interior: '',
      colonia: '',
      municipio: '',
      ciudad: '',
      estado: '',
      codigo_postal: '',
      telefono: '',
      email: '',
      contacto_local: ''
    };
  }

  private getEmptyContactoForm(): ContactoForm {
    return {
      nombre_completo: '',
      tipo: 'Administrador',
      sucursal_id: '',
      puesto: '',
      telefono: '',
      celular: '',
      email: '',
      es_contacto_principal: false,
      notas: ''
    };
  }

  private getEmptyLicenciaForm(): LicenciaForm {
    return {
      tipo: '',
      folio: '',
      numero_serie: '',
      producto: '',
      version: '',
      sucursal_id: '',
      fecha_activacion: '',
      fecha_vencimiento: '',
      dias_alerta_previa: 30,
      notas: ''
    };
  }

  private getEmptyPolizaForm(): PolizaForm {
    return {
      numero_poliza: '',
      tipo: 'Anual',
      fecha_inicio: '',
      fecha_vencimiento: '',
      costo: null,
      cobertura: '',
      horas_incluidas: null,
      dias_alerta_previa: 30,
      notas: ''
    };
  }

  // ============================================================================
  // FASE 1: Métodos de Renovación de Licencias
  // ============================================================================

  openRenovarLicenciaModal(content: TemplateRef<unknown>, licencia: LicenciaConEstado): void {
    this.selectedLicencia.set(licencia);
    this.renovarNuevaFecha.set('');
    this.renovarCosto.set(null);
    this.renovarNotas.set('');
    this.activeModal = this.modalService.open(content, { centered: true });
  }

  confirmRenovarLicencia(): void {
    const licencia = this.selectedLicencia();
    if (!licencia || !this.renovarNuevaFecha()) return;

    this.savingAction.set(true);
    this.clienteService.renovarLicencia(licencia.id, {
      nueva_fecha_vencimiento: this.renovarNuevaFecha(),
      costo: this.renovarCosto() || undefined,
      notas: this.renovarNotas() || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Licencia renovada exitosamente');
          this.activeModal?.close();
          const clienteId = this.clienteId();
          if (clienteId) {
            this.loadLicencias(clienteId);
          }
        } else {
          this.notificationService.error(response.error || 'Error al renovar licencia');
        }
        this.savingAction.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error renovando licencia:', err); }
        this.notificationService.error('Error al renovar licencia');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // FASE 1: Métodos de Renovación de Pólizas
  // ============================================================================

  openRenovarPolizaModal(content: TemplateRef<unknown>, poliza: PolizaConEstado): void {
    this.selectedPoliza.set(poliza);
    this.renovarNuevaFecha.set('');
    this.renovarCosto.set(null);
    this.renovarNotas.set('');
    this.activeModal = this.modalService.open(content, { centered: true });
  }

  confirmRenovarPoliza(): void {
    const poliza = this.selectedPoliza();
    if (!poliza || !this.renovarNuevaFecha()) return;

    this.savingAction.set(true);
    this.clienteService.renovarPoliza(poliza.id, {
      nueva_fecha_vencimiento: this.renovarNuevaFecha(),
      costo: this.renovarCosto() || undefined,
      notas: this.renovarNotas() || undefined
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Póliza renovada exitosamente');
          this.activeModal?.close();
          const clienteId = this.clienteId();
          if (clienteId) {
            this.loadPolizas(clienteId);
          }
        } else {
          this.notificationService.error(response.error || 'Error al renovar póliza');
        }
        this.savingAction.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error renovando póliza:', err); }
        this.notificationService.error('Error al renovar póliza');
        this.savingAction.set(false);
      }
    });
  }

  // ============================================================================
  // FASE 2: CRUD Sucursales
  // ============================================================================

  openCreateSucursalModal(content: TemplateRef<unknown>): void {
    this.editingSucursal.set(null);
    this.sucursalForm.set(this.getEmptySucursalForm());
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEditSucursalModal(content: TemplateRef<unknown>, sucursal: Sucursal): void {
    this.editingSucursal.set(sucursal);
    this.sucursalForm.set({
      nombre: sucursal.nombre || '',
      es_matriz: sucursal.es_matriz || false,
      calle: sucursal.calle || '',
      numero_exterior: sucursal.numero_exterior || '',
      numero_interior: sucursal.numero_interior || '',
      colonia: sucursal.colonia || '',
      municipio: sucursal.municipio || '',
      ciudad: sucursal.ciudad || '',
      estado: sucursal.estado || '',
      codigo_postal: sucursal.codigo_postal || '',
      telefono: sucursal.telefono || '',
      email: sucursal.email || '',
      contacto_local: sucursal.contacto_local || ''
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  confirmSaveSucursal(): void {
    const clienteId = this.clienteId();
    if (!clienteId) return;

    const form = this.sucursalForm();
    if (!form.nombre.trim()) {
      this.notificationService.error('El nombre de la sucursal es requerido');
      return;
    }

    this.savingAction.set(true);
    const editing = this.editingSucursal();

    if (editing) {
      this.clienteService.updateSucursal(editing.id, form).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucursal actualizada');
            this.activeModal?.close();
            this.loadSucursales(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al actualizar');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al actualizar sucursal');
          this.savingAction.set(false);
        }
      });
    } else {
      this.clienteService.createSucursal({ ...form, cliente_id: clienteId }).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Sucursal creada');
            this.activeModal?.close();
            this.loadSucursales(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al crear');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al crear sucursal');
          this.savingAction.set(false);
        }
      });
    }
  }

  openDeleteSucursalModal(content: TemplateRef<unknown>, sucursal: Sucursal): void {
    this.deletingSucursal.set(sucursal);
    this.activeModal = this.modalService.open(content, { centered: true });
  }

  confirmDeleteSucursal(): void {
    const sucursal = this.deletingSucursal();
    const clienteId = this.clienteId();
    if (!sucursal || !clienteId) return;

    this.savingAction.set(true);
    this.clienteService.deleteSucursal(sucursal.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Sucursal eliminada');
          this.activeModal?.close();
          this.loadSucursales(clienteId);
        } else {
          this.notificationService.error(response.error || 'Error al eliminar');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al eliminar sucursal');
        this.savingAction.set(false);
      }
    });
  }

  updateSucursalForm(field: keyof SucursalForm, value: unknown): void {
    this.sucursalForm.update(form => ({ ...form, [field]: value }));
  }

  // ============================================================================
  // FASE 3: CRUD Contactos
  // ============================================================================

  openCreateContactoModal(content: TemplateRef<unknown>): void {
    this.editingContacto.set(null);
    this.contactoForm.set(this.getEmptyContactoForm());
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEditContactoModal(content: TemplateRef<unknown>, contacto: ContactoCliente): void {
    this.editingContacto.set(contacto);
    this.contactoForm.set({
      nombre_completo: contacto.nombre_completo || '',
      tipo: contacto.tipo || 'Administrador',
      sucursal_id: contacto.sucursal_id || '',
      puesto: contacto.puesto || '',
      telefono: contacto.telefono || '',
      celular: contacto.celular || '',
      email: contacto.email || '',
      es_contacto_principal: contacto.es_contacto_principal || false,
      notas: contacto.notas || ''
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  confirmSaveContacto(): void {
    const clienteId = this.clienteId();
    if (!clienteId) return;

    const form = this.contactoForm();
    if (!form.nombre_completo.trim()) {
      this.notificationService.error('El nombre del contacto es requerido');
      return;
    }

    this.savingAction.set(true);
    const editing = this.editingContacto();

    const dto = {
      ...form,
      sucursal_id: form.sucursal_id || undefined
    };

    if (editing) {
      this.clienteService.updateContacto(editing.id, dto).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Contacto actualizado');
            this.activeModal?.close();
            this.loadContactos(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al actualizar');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al actualizar contacto');
          this.savingAction.set(false);
        }
      });
    } else {
      this.clienteService.createContacto({ ...dto, cliente_id: clienteId }).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Contacto creado');
            this.activeModal?.close();
            this.loadContactos(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al crear');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al crear contacto');
          this.savingAction.set(false);
        }
      });
    }
  }

  openDeleteContactoModal(content: TemplateRef<unknown>, contacto: ContactoCliente): void {
    this.deletingContacto.set(contacto);
    this.activeModal = this.modalService.open(content, { centered: true });
  }

  confirmDeleteContacto(): void {
    const contacto = this.deletingContacto();
    const clienteId = this.clienteId();
    if (!contacto || !clienteId) return;

    this.savingAction.set(true);
    this.clienteService.deleteContacto(contacto.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Contacto eliminado');
          this.activeModal?.close();
          this.loadContactos(clienteId);
        } else {
          this.notificationService.error(response.error || 'Error al eliminar');
        }
        this.savingAction.set(false);
      },
      error: () => {
        this.notificationService.error('Error al eliminar contacto');
        this.savingAction.set(false);
      }
    });
  }

  updateContactoForm(field: keyof ContactoForm, value: unknown): void {
    this.contactoForm.update(form => ({ ...form, [field]: value }));
  }

  // ============================================================================
  // FASE 4: CRUD Licencias
  // ============================================================================

  openCreateLicenciaModal(content: TemplateRef<unknown>): void {
    this.editingLicencia.set(null);
    this.licenciaForm.set(this.getEmptyLicenciaForm());
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEditLicenciaModal(content: TemplateRef<unknown>, licencia: LicenciaConEstado): void {
    this.editingLicencia.set(licencia);
    this.licenciaForm.set({
      tipo: licencia.tipo || '',
      folio: licencia.folio || '',
      numero_serie: licencia.numero_serie || '',
      producto: licencia.producto || '',
      version: licencia.version || '',
      sucursal_id: licencia.sucursal_id || '',
      fecha_activacion: licencia.fecha_activacion?.split('T')[0] || '',
      fecha_vencimiento: licencia.fecha_vencimiento?.split('T')[0] || '',
      dias_alerta_previa: licencia.dias_alerta_previa || 30,
      notas: licencia.notas || ''
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  confirmSaveLicencia(): void {
    const clienteId = this.clienteId();
    if (!clienteId) return;

    const form = this.licenciaForm();
    if (!form.tipo.trim()) {
      this.notificationService.error('El tipo de licencia es requerido');
      return;
    }

    this.savingAction.set(true);
    const editing = this.editingLicencia();

    const dto = {
      ...form,
      sucursal_id: form.sucursal_id || undefined,
      fecha_activacion: form.fecha_activacion || undefined,
      fecha_vencimiento: form.fecha_vencimiento || undefined
    };

    if (editing) {
      this.clienteService.updateLicencia(editing.id, dto).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Licencia actualizada');
            this.activeModal?.close();
            this.loadLicencias(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al actualizar');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al actualizar licencia');
          this.savingAction.set(false);
        }
      });
    } else {
      this.clienteService.createLicencia({ ...dto, cliente_id: clienteId }).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Licencia creada');
            this.activeModal?.close();
            this.loadLicencias(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al crear');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al crear licencia');
          this.savingAction.set(false);
        }
      });
    }
  }

  openHistorialRenovacionesModal(content: TemplateRef<unknown>, licencia: LicenciaConEstado): void {
    this.selectedLicencia.set(licencia);
    this.historialRenovaciones.set([]);
    this.loadingHistorial.set(true);
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });

    this.clienteService.getRenovacionesLicencia(licencia.id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.historialRenovaciones.set(response.data);
        }
        this.loadingHistorial.set(false);
      },
      error: () => {
        this.loadingHistorial.set(false);
      }
    });
  }

  updateLicenciaForm(field: keyof LicenciaForm, value: unknown): void {
    this.licenciaForm.update(form => ({ ...form, [field]: value }));
  }

  // ============================================================================
  // FASE 5: CRUD Pólizas
  // ============================================================================

  openCreatePolizaModal(content: TemplateRef<unknown>): void {
    this.editingPoliza.set(null);
    this.polizaForm.set(this.getEmptyPolizaForm());
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  openEditPolizaModal(content: TemplateRef<unknown>, poliza: PolizaConEstado): void {
    this.editingPoliza.set(poliza);
    this.polizaForm.set({
      numero_poliza: poliza.numero_poliza || '',
      tipo: poliza.tipo || 'Anual',
      fecha_inicio: poliza.fecha_inicio?.split('T')[0] || '',
      fecha_vencimiento: poliza.fecha_vencimiento?.split('T')[0] || '',
      costo: poliza.costo || null,
      cobertura: poliza.cobertura || '',
      horas_incluidas: poliza.horas_incluidas || null,
      dias_alerta_previa: poliza.dias_alerta_previa || 30,
      notas: poliza.notas || ''
    });
    this.activeModal = this.modalService.open(content, { size: 'lg', centered: true });
  }

  confirmSavePoliza(): void {
    const clienteId = this.clienteId();
    if (!clienteId) return;

    const form = this.polizaForm();
    if (!form.fecha_inicio || !form.fecha_vencimiento) {
      this.notificationService.error('Las fechas de inicio y vencimiento son requeridas');
      return;
    }

    this.savingAction.set(true);
    const editing = this.editingPoliza();

    const dto = {
      ...form,
      costo: form.costo || undefined,
      horas_incluidas: form.horas_incluidas || undefined
    };

    if (editing) {
      this.clienteService.updatePoliza(editing.id, dto).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Póliza actualizada');
            this.activeModal?.close();
            this.loadPolizas(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al actualizar');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al actualizar póliza');
          this.savingAction.set(false);
        }
      });
    } else {
      this.clienteService.createPoliza({ ...dto, cliente_id: clienteId }).subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Póliza creada');
            this.activeModal?.close();
            this.loadPolizas(clienteId);
          } else {
            this.notificationService.error(response.error || 'Error al crear');
          }
          this.savingAction.set(false);
        },
        error: () => {
          this.notificationService.error('Error al crear póliza');
          this.savingAction.set(false);
        }
      });
    }
  }

  updatePolizaForm(field: keyof PolizaForm, value: unknown): void {
    this.polizaForm.update(form => ({ ...form, [field]: value }));
  }

  // ============================================================================
  // Form Validation Helpers
  // ============================================================================

  isRenovarFormValid(): boolean {
    return !!this.renovarNuevaFecha();
  }

  isSucursalFormValid(): boolean {
    return !!this.sucursalForm().nombre.trim();
  }

  isContactoFormValid(): boolean {
    return !!this.contactoForm().nombre_completo.trim();
  }

  isLicenciaFormValid(): boolean {
    return !!this.licenciaForm().tipo.trim();
  }

  isPolizaFormValid(): boolean {
    const form = this.polizaForm();
    return !!form.fecha_inicio && !!form.fecha_vencimiento;
  }
}
