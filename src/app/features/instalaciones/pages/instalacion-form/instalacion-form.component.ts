// ============================================================================
// Instalacion Form Component
// ============================================================================
// Formulario para crear/editar instalaciones
// ============================================================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { InstalacionService } from 'src/app/core/services/instalacion.service';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  Instalacion,
  ModuloSistema,
  Cliente,
  Sucursal,
  Profile
} from 'src/app/core/models';

@Component({
  selector: 'app-instalacion-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './instalacion-form.component.html',
  styleUrls: ['./instalacion-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstalacionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private instalacionService = inject(InstalacionService);
  private clienteService = inject(ClienteService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);

  // Estado
  isEditMode = signal(false);
  loading = signal(false);
  loadingInstalacion = signal(false);
  instalacionId = signal<string | null>(null);
  instalacion = signal<Instalacion | null>(null);

  // Catálogos
  modulos = signal<ModuloSistema[]>([]);
  clientes = signal<Cliente[]>([]);
  sucursales = signal<Sucursal[]>([]);
  tecnicos = signal<Profile[]>([]);

  // Módulos seleccionados
  selectedModulos = signal<Set<string>>(new Set());

  // Formulario
  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogos();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEditMode.set(true);
      this.instalacionId.set(id);
      this.loadInstalacion(id);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      cliente_id: ['', Validators.required],
      sucursal_id: [''],
      tecnico_id: [''],
      fecha_programada: ['', Validators.required],
      hora_programada: [''],
      contacto_cliente: [''],
      telefono_contacto: [''],
      email_contacto: ['', Validators.email],
      notas_internas: ['']
    });

    // Cargar sucursales cuando cambia el cliente
    this.form.get('cliente_id')?.valueChanges.subscribe(clienteId => {
      if (clienteId) {
        this.loadSucursales(clienteId);
      } else {
        this.sucursales.set([]);
      }
    });
  }

  private loadCatalogos(): void {
    // Módulos del sistema
    this.instalacionService.getModulosSistema().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.modulos.set(response.data);
        }
      }
    });

    // Clientes
    this.clienteService.getClientes({ estatus_cliente: 'Activo' }, { page: 1, pageSize: 500 }).subscribe({
      next: (response) => {
        this.clientes.set(response.data);
      }
    });

    // Técnicos
    this.userService.getUsers({ estatus: 'Activo' }, { page: 1, pageSize: 100 }).subscribe({
      next: (response) => {
        this.tecnicos.set(response.data);
      }
    });
  }

  private loadSucursales(clienteId: string): void {
    this.clienteService.getSucursales(clienteId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sucursales.set(response.data);
        }
      }
    });
  }

  private loadInstalacion(id: string): void {
    this.loadingInstalacion.set(true);

    this.instalacionService.getInstalacionById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.instalacion.set(response.data);
          this.patchForm(response.data);
          this.loadInstalacionModulos(id);
        } else {
          this.notificationService.error('Instalación no encontrada');
          this.router.navigate(['/instalaciones']);
        }
        this.loadingInstalacion.set(false);
      },
      error: () => {
        this.notificationService.error('Error al cargar la instalación');
        this.loadingInstalacion.set(false);
        this.router.navigate(['/instalaciones']);
      }
    });
  }

  private loadInstalacionModulos(id: string): void {
    this.instalacionService.getModulos(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const modulosIds = new Set(response.data.map(m => m.modulo_id));
          this.selectedModulos.set(modulosIds);
        }
      }
    });
  }

  private patchForm(inst: Instalacion): void {
    if (inst.cliente_id) {
      this.loadSucursales(inst.cliente_id);
    }

    this.form.patchValue({
      cliente_id: inst.cliente_id,
      sucursal_id: inst.sucursal_id || '',
      tecnico_id: inst.tecnico_id || '',
      fecha_programada: inst.fecha_programada,
      hora_programada: inst.hora_programada || '',
      contacto_cliente: inst.contacto_cliente || '',
      telefono_contacto: inst.telefono_contacto || '',
      email_contacto: inst.email_contacto || '',
      notas_internas: inst.notas_internas || ''
    });
  }

  // Módulos
  toggleModulo(moduloId: string): void {
    this.selectedModulos.update(set => {
      const newSet = new Set(set);
      if (newSet.has(moduloId)) {
        newSet.delete(moduloId);
      } else {
        newSet.add(moduloId);
      }
      return newSet;
    });
  }

  isModuloSelected(moduloId: string): boolean {
    return this.selectedModulos().has(moduloId);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.notificationService.warning('Por favor, complete los campos requeridos');
      return;
    }

    if (this.selectedModulos().size === 0 && !this.isEditMode()) {
      this.notificationService.warning('Seleccione al menos un módulo a instalar');
      return;
    }

    this.loading.set(true);
    const formValue = this.cleanEmptyValues(this.form.value);
    formValue.modulos_ids = Array.from(this.selectedModulos());

    if (this.isEditMode()) {
      this.updateInstalacion(formValue);
    } else {
      this.createInstalacion(formValue);
    }
  }

  private createInstalacion(data: any): void {
    this.instalacionService.createInstalacion(data).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notificationService.success('Instalación creada exitosamente');
          this.router.navigate(['/instalaciones', response.data.id]);
        } else {
          this.notificationService.error(response.error || 'Error al crear la instalación');
        }
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al crear la instalación');
        this.loading.set(false);
      }
    });
  }

  private updateInstalacion(data: any): void {
    const id = this.instalacionId();
    if (!id) return;

    // Para actualización no se envían módulos (se gestionan por separado)
    delete data.modulos_ids;

    this.instalacionService.updateInstalacion(id, data).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Instalación actualizada exitosamente');
          this.router.navigate(['/instalaciones', id]);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar');
        }
        this.loading.set(false);
      },
      error: () => {
        this.notificationService.error('Error al actualizar la instalación');
        this.loading.set(false);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  private cleanEmptyValues(obj: any): any {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }

  cancel(): void {
    if (this.isEditMode() && this.instalacionId()) {
      this.router.navigate(['/instalaciones', this.instalacionId()]);
    } else {
      this.router.navigate(['/instalaciones']);
    }
  }

  isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return control ? control.invalid && control.touched : false;
  }

  getFieldError(field: string): string {
    const control = this.form.get(field);
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Este campo es requerido';
    if (control.errors['email']) return 'Email inválido';

    return 'Campo inválido';
  }
}
