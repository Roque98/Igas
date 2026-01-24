// ============================================================================
// Cliente Form Component
// ============================================================================
// Componente para crear y editar clientes
// ============================================================================

import { Component, OnInit, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

import { SharedModule } from 'src/app/theme/shared/shared.module';
import { ClienteService } from 'src/app/core/services/cliente.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import {
  Cliente,
  CreateClienteDTO,
  UpdateClienteDTO,
  TIPOS_CLIENTE,
  ESTATUS_CLIENTE
} from 'src/app/core/models';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbTooltipModule,
    SharedModule
  ],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClienteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clienteService = inject(ClienteService);
  private notificationService = inject(NotificationService);

  // ============================================================================
  // Signals - Estado reactivo
  // ============================================================================

  isEditMode = signal(false);
  loading = signal(false);
  loadingCliente = signal(false);
  clienteId = signal<string | null>(null);
  cliente = signal<Cliente | null>(null);

  // Catálogos
  tiposCliente = TIPOS_CLIENTE;
  estatusCliente = ESTATUS_CLIENTE;

  // Formulario
  form!: FormGroup;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nuevo') {
      this.isEditMode.set(true);
      this.clienteId.set(id);
      this.loadCliente(id);
    }
  }

  // ============================================================================
  // Inicialización del formulario
  // ============================================================================

  private initForm(): void {
    this.form = this.fb.group({
      codigo_cliente: [''],
      razon_social: ['', [Validators.required, Validators.minLength(3)]],
      nombre_comercial: [''],
      rfc: ['', [Validators.pattern(/^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/)]],
      telefono: [''],
      telefono_secundario: [''],
      email: ['', [Validators.email]],
      email_secundario: ['', [Validators.email]],
      anydesk: [''],
      contacto_principal: [''],
      tipo_servicio: [''],
      tipo_cliente: ['Cliente', Validators.required],
      estatus_cliente: ['Activo', Validators.required],
      notas: ['']
    });
  }

  // ============================================================================
  // Carga de datos
  // ============================================================================

  private loadCliente(id: string): void {
    this.loadingCliente.set(true);

    this.clienteService.getClienteById(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.cliente.set(response.data);
          this.patchForm(response.data);
        } else {
          this.notificationService.error('Cliente no encontrado');
          this.router.navigate(['/clientes']);
        }
        this.loadingCliente.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error loading cliente:', err); }
        this.notificationService.error('Error al cargar el cliente');
        this.loadingCliente.set(false);
        this.router.navigate(['/clientes']);
      }
    });
  }

  private patchForm(cliente: Cliente): void {
    this.form.patchValue({
      codigo_cliente: cliente.codigo_cliente || '',
      razon_social: cliente.razon_social,
      nombre_comercial: cliente.nombre_comercial || '',
      rfc: cliente.rfc || '',
      telefono: cliente.telefono || '',
      telefono_secundario: cliente.telefono_secundario || '',
      email: cliente.email || '',
      email_secundario: cliente.email_secundario || '',
      anydesk: cliente.anydesk || '',
      contacto_principal: cliente.contacto_principal || '',
      tipo_servicio: cliente.tipo_servicio || '',
      tipo_cliente: cliente.tipo_cliente,
      estatus_cliente: cliente.estatus_cliente,
      notas: cliente.notas || ''
    });
  }

  // ============================================================================
  // Guardar
  // ============================================================================

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      this.notificationService.warning('Por favor, complete los campos requeridos');
      return;
    }

    this.loading.set(true);

    const formValue = this.form.value;

    // Limpiar valores vacíos
    const cleanData = this.cleanEmptyValues(formValue);

    if (this.isEditMode()) {
      this.updateCliente(cleanData);
    } else {
      this.createCliente(cleanData);
    }
  }

  private createCliente(data: CreateClienteDTO): void {
    this.clienteService.createCliente(data).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.notificationService.success('Cliente creado exitosamente');
          this.router.navigate(['/clientes', response.data.id]);
        } else {
          this.notificationService.error(response.error || 'Error al crear el cliente');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error creating cliente:', err); }
        this.notificationService.error('Error al crear el cliente');
        this.loading.set(false);
      }
    });
  }

  private updateCliente(data: UpdateClienteDTO): void {
    const id = this.clienteId();
    if (!id) return;

    this.clienteService.updateCliente(id, data).subscribe({
      next: (response) => {
        if (response.success) {
          this.notificationService.success('Cliente actualizado exitosamente');
          this.router.navigate(['/clientes', id]);
        } else {
          this.notificationService.error(response.error || 'Error al actualizar el cliente');
        }
        this.loading.set(false);
      },
      error: (err) => {
        if (!environment.production) { console.error('Error updating cliente:', err); }
        this.notificationService.error('Error al actualizar el cliente');
        this.loading.set(false);
      }
    });
  }

  // ============================================================================
  // Helpers
  // ============================================================================

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
    if (this.isEditMode() && this.clienteId()) {
      this.router.navigate(['/clientes', this.clienteId()]);
    } else {
      this.router.navigate(['/clientes']);
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
    if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    if (control.errors['email']) return 'Email inválido';
    if (control.errors['pattern']) return 'Formato inválido';

    return 'Campo inválido';
  }

  formatRfc(): void {
    const control = this.form.get('rfc');
    if (control && control.value) {
      control.setValue(control.value.toUpperCase().trim());
    }
  }
}
