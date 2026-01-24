// ============================================================================
// Mantenimiento Form Component
// ============================================================================
// Formulario para crear/editar mantenimientos
// ============================================================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { MantenimientoService } from 'src/app/core/services/mantenimiento.service';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { UserService } from 'src/app/core/services/user.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  Mantenimiento,
  TipoMantenimiento,
  ChecklistTemplate,
  Cliente,
  Sucursal,
  Profile
} from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-mantenimiento-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './mantenimiento-form.component.html',
  styleUrls: ['./mantenimiento-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MantenimientoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private mantenimientoService = inject(MantenimientoService);
  private clienteService = inject(ClienteService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);

  // Estado
  isEditMode = signal(false);
  loading = signal(false);
  loadingMantenimiento = signal(false);
  mantenimientoId = signal<string | null>(null);
  mantenimiento = signal<Mantenimiento | null>(null);

  // Catálogos
  tipos = signal<TipoMantenimiento[]>([]);
  templates = signal<ChecklistTemplate[]>([]);
  clientes = signal<Cliente[]>([]);
  sucursales = signal<Sucursal[]>([]);
  tecnicos = signal<Profile[]>([]);

  // Formulario
  form!: FormGroup;

  ngOnInit(): void {
    this.initForm();
    this.loadCatalogos();

    // Verificar si es edición
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEditMode.set(true);
      this.mantenimientoId.set(id);
      this.loadMantenimiento(id);
    } else {
      // Verificar si hay fecha predefinida
      const fecha = this.route.snapshot.queryParamMap.get('fecha');
      if (fecha) {
        this.form.patchValue({ fecha_programada: fecha });
      }
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      cliente_id: ['', Validators.required],
      sucursal_id: [''],
      tipo_mantenimiento_id: ['', Validators.required],
      tecnico_id: [''],
      template_checklist_id: [''],
      fecha_programada: ['', Validators.required],
      hora_programada: [''],
      contacto_cliente: [''],
      telefono_contacto: [''],
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

    // Cargar templates cuando cambia el tipo
    this.form.get('tipo_mantenimiento_id')?.valueChanges.subscribe(tipoId => {
      if (tipoId) {
        this.loadTemplates(tipoId);
      } else {
        this.templates.set([]);
      }
    });
  }

  private loadCatalogos(): void {
    // Tipos de mantenimiento
    this.mantenimientoService.getTiposMantenimiento().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.tipos.set(response.data);
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

  private loadTemplates(tipoId: string): void {
    this.mantenimientoService.getChecklistTemplates(tipoId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.templates.set(response.data);
          // Auto-seleccionar si solo hay un template
          if (response.data.length === 1) {
            this.form.patchValue({ template_checklist_id: response.data[0].id });
          }
        }
      }
    });
  }

  private loadMantenimiento(id: string): void {
    this.loadingMantenimiento.set(true);

    this.mantenimientoService.getMantenimientoById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.mantenimiento.set(response.data);
          this.patchForm(response.data);
        } else {
          this.notificationService.error('Mantenimiento no encontrado');
          this.router.navigate(['/mantenimientos']);
        }
        this.loadingMantenimiento.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading mantenimiento:', err); }
        this.notificationService.error('Error al cargar el mantenimiento');
        this.loadingMantenimiento.set(false);
        this.router.navigate(['/mantenimientos']);
      }
    });
  }

  private patchForm(mtn: Mantenimiento): void {
    // Cargar sucursales primero
    if (mtn.cliente_id) {
      this.loadSucursales(mtn.cliente_id);
    }
    if (mtn.tipo_mantenimiento_id) {
      this.loadTemplates(mtn.tipo_mantenimiento_id);
    }

    this.form.patchValue({
      cliente_id: mtn.cliente_id,
      sucursal_id: mtn.sucursal_id || '',
      tipo_mantenimiento_id: mtn.tipo_mantenimiento_id,
      tecnico_id: mtn.tecnico_id || '',
      template_checklist_id: mtn.template_checklist_id || '',
      fecha_programada: mtn.fecha_programada,
      hora_programada: mtn.hora_programada || '',
      contacto_cliente: mtn.contacto_cliente || '',
      telefono_contacto: mtn.telefono_contacto || '',
      notas_internas: mtn.notas_internas || ''
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.notificationService.warning('Por favor, complete los campos requeridos');
      return;
    }

    this.loading.set(true);
    const formValue = this.cleanEmptyValues(this.form.value);

    if (this.isEditMode()) {
      this.updateMantenimiento(formValue);
    } else {
      this.createMantenimiento(formValue);
    }
  }

  private createMantenimiento(data: any): void {
    this.mantenimientoService.createMantenimiento(data).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notificationService.success('Mantenimiento creado exitosamente');
          this.router.navigate(['/mantenimientos', response.data.id]);
        } else {
          this.notificationService.error(response.error || 'Error al crear el mantenimiento');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error creating mantenimiento:', err); }
        this.notificationService.error('Error al crear el mantenimiento');
        this.loading.set(false);
      }
    });
  }

  private updateMantenimiento(data: any): void {
    const id = this.mantenimientoId();
    if (!id) return;

    this.mantenimientoService.updateMantenimiento(id, data).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Mantenimiento actualizado exitosamente');
          this.router.navigate(['/mantenimientos', id]);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar el mantenimiento');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error updating mantenimiento:', err); }
        this.notificationService.error('Error al actualizar el mantenimiento');
        this.loading.set(false);
      }
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
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
    if (this.isEditMode() && this.mantenimientoId()) {
      this.router.navigate(['/mantenimientos', this.mantenimientoId()]);
    } else {
      this.router.navigate(['/mantenimientos']);
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

    return 'Campo inválido';
  }

  getSelectedTipo(): TipoMantenimiento | undefined {
    const tipoId = this.form.get('tipo_mantenimiento_id')?.value;
    return this.tipos().find(t => t.id === tipoId);
  }
}
