// ============================================================================
// Role Model
// ============================================================================

export type RoleName = 'Administrador' | 'Supervisor' | 'Agente' | 'Cliente';

export interface Role {
  id: string;
  nombre: RoleName;
  descripcion?: string;
  permisos: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface RolePermissions {
  [module: string]: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    [action: string]: boolean | undefined;
  } | boolean;
}
