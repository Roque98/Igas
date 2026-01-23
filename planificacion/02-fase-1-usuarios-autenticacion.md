# Fase 1: Autenticación y Gestión de Usuarios

## Objetivo
Completar el sistema de autenticación, implementar gestión de usuarios, roles y permisos según las especificaciones del módulo "Usuarios / Agentes de Soporte".

---

## Tareas

### 1. Sistema de Autenticación (Mejoras)

#### 1.1 Backend - Supabase Auth (Mejoras)
- [x] Login con email/password (ya implementado)
- [x] Recuperación de contraseña (ya implementado)
- [x] Cambio de contraseña (ya implementado)
- [ ] Mejorar manejo de errores con mensajes en español
- [ ] Implementar refresh token automático
- [ ] Configurar políticas de contraseña en Supabase
- [ ] Implementar bloqueo de cuenta después de X intentos fallidos

**NOTA:** No habrá registro público. Los usuarios serán creados únicamente por administradores desde el panel de gestión de usuarios.

#### 1.2 Frontend - Auth (Mejoras)
- [x] Páginas de login, forgot-password, reset-password
- [ ] Personalizar páginas con branding iGAS (amarillo #F9B000)
- [ ] Agregar loading states con spinner
- [ ] Implementar validaciones de formulario mejoradas
- [ ] Agregar "Remember me" en login
- [ ] Implementar auto-logout por inactividad (30 min)
- [ ] Agregar confirmación visual de acciones
- [ ] Eliminar links y referencias a "registro" en página de login

#### 1.3 Seguridad
- [ ] Implementar rate limiting en Supabase (configuración)
- [ ] Implementar detección de sesión en múltiples dispositivos
- [ ] Agregar logs de intentos de login fallidos

### 2. Gestión de Usuarios / Agentes

#### 2.1 Modelo de Datos - Tabla profiles en Supabase

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  rol_id UUID REFERENCES roles(id),
  area_equipo_id UUID REFERENCES equipos(id),
  telefono TEXT,
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  turno_horario_id UUID REFERENCES horarios(id),
  avatar_url TEXT,
  disponibilidad TEXT CHECK (disponibilidad IN ('En línea', 'Ocupado', 'Fuera de turno')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para crear profile automáticamente cuando un admin crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre_completo, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nombre_completo', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 2.2 Row Level Security (RLS) Policies

```sql
-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.rol_id = r.id
      WHERE p.id = auth.uid() AND r.nombre = 'Admin'
    )
  );

-- Solo admins pueden crear/actualizar/eliminar usuarios
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN roles r ON p.rol_id = r.id
      WHERE p.id = auth.uid() AND r.nombre = 'Admin'
    )
  );
```

#### 2.3 Servicio Angular - UserService

```typescript
export interface Profile {
  id: string;
  nombre_completo: string;
  email: string;
  rol_id?: string;
  area_equipo_id?: string;
  telefono?: string;
  estatus: 'Activo' | 'Inactivo';
  turno_horario_id?: string;
  avatar_url?: string;
  disponibilidad?: 'En línea' | 'Ocupado' | 'Fuera de turno';
  created_at: string;
  updated_at: string;
}
```

- [ ] Crear UserService con métodos CRUD
- [ ] Implementar getUsers() con filtros
- [ ] Implementar getUserById(id)
- [ ] Implementar createUser(user)
- [ ] Implementar updateUser(id, user)
- [ ] Implementar deleteUser(id) - soft delete
- [ ] Implementar getCurrentUserProfile()
- [ ] Implementar updateCurrentUserProfile(data)
- [ ] Implementar uploadAvatar(file)

#### 2.4 Frontend - Módulo de Usuarios

- [ ] Crear módulo features/usuarios
- [ ] Crear componente de listado de usuarios:
  - [ ] Tabla con datos de usuarios
  - [ ] Filtros por estatus, rol, área
  - [ ] Búsqueda por nombre/email
  - [ ] Badges de estatus (Activo/Inactivo) con colores
  - [ ] Paginación
  - [ ] Ordenamiento por columnas
- [ ] Crear componente de formulario de usuario:
  - [ ] Campos: nombre, email, rol, área, teléfono, turno
  - [ ] Selector de estatus
  - [ ] Upload de avatar
  - [ ] Validaciones
- [ ] Crear modal de creación/edición
- [ ] Crear confirmación de eliminación
- [ ] Crear página de perfil de usuario:
  - [ ] Vista de información completa
  - [ ] Edición de perfil propio
  - [ ] Cambio de avatar
  - [ ] Cambio de contraseña

### 3. Sistema de Roles y Permisos

#### 3.1 Modelo de Datos - Roles

```sql
CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  nivel_acceso INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.permisos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  modulo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.roles_permisos (
  rol_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permiso_id UUID REFERENCES permisos(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);

-- Insertar roles iniciales
INSERT INTO public.roles (nombre, descripcion, nivel_acceso) VALUES
  ('Admin', 'Administrador del sistema', 100),
  ('Coordinador', 'Coordinador de soporte', 80),
  ('Técnico', 'Técnico de soporte', 50),
  ('Dev', 'Desarrollador', 70),
  ('Implementación', 'Equipo de implementación', 60),
  ('Facturación', 'Equipo de facturación', 40);
```

#### 3.2 Definición de Permisos

- [ ] Definir permisos del sistema:
  - [ ] tickets.create, tickets.read, tickets.update, tickets.delete
  - [ ] casos.create, casos.read, casos.update, casos.delete
  - [ ] clientes.create, clientes.read, clientes.update, clientes.delete
  - [ ] usuarios.create, usuarios.read, usuarios.update, usuarios.delete
  - [ ] mantenimientos.create, mantenimientos.read, mantenimientos.update
  - [ ] instalaciones.create, instalaciones.read, instalaciones.update
  - [ ] reportes.read, reportes.export
  - [ ] config.read, config.update
- [ ] Asignar permisos a roles

#### 3.3 Servicio Angular - RoleService & PermissionService

- [ ] Crear RoleService
- [ ] Implementar getRoles()
- [ ] Implementar getUserPermissions(userId)
- [ ] Implementar hasPermission(permission): Observable<boolean>
- [ ] Implementar hasRole(role): Observable<boolean>

#### 3.4 Guards y Directivas de Permisos

```typescript
// Permission Guard
export const permissionGuard: CanActivateFn = (route) => {
  const requiredPermission = route.data['permission'];
  // Verificar si usuario tiene el permiso
};

// Role Guard
export const roleGuard: CanActivateFn = (route) => {
  const requiredRole = route.data['role'];
  // Verificar si usuario tiene el rol
};
```

- [ ] Crear PermissionGuard
- [ ] Crear RoleGuard
- [ ] Crear directiva *hasPermission
- [ ] Crear directiva *hasRole
- [ ] Implementar en rutas protegidas

### 4. Gestión de Equipos/Áreas

#### 4.1 Modelo de Datos - Equipos

```sql
CREATE TABLE public.equipos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  responsable_id UUID REFERENCES profiles(id),
  estatus TEXT CHECK (estatus IN ('Activo', 'Inactivo')) DEFAULT 'Activo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar equipos iniciales
INSERT INTO public.equipos (nombre, descripcion) VALUES
  ('Soporte', 'Equipo de soporte técnico'),
  ('Dev', 'Equipo de desarrollo'),
  ('Implementación', 'Equipo de implementación'),
  ('Facturación', 'Equipo de facturación'),
  ('Cobranza', 'Equipo de cobranza');
```

#### 4.2 Backend - Queries Supabase

- [ ] Crear queries para CRUD de equipos
- [ ] Implementar relación equipos ↔ usuarios
- [ ] Crear query para obtener miembros de un equipo

#### 4.3 Frontend - Gestión de Equipos

- [ ] Crear componente de gestión de equipos
- [ ] Listar equipos con miembros
- [ ] Asignar/remover usuarios de equipos
- [ ] Mostrar responsable de equipo

### 5. Horarios y Turnos

#### 5.1 Modelo de Datos - Horarios

```sql
CREATE TABLE public.horarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  dias_semana INTEGER[], -- Array: 0=Domingo, 1=Lunes, etc.
  es_horario_habil BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar horarios iniciales
INSERT INTO public.horarios (nombre, hora_inicio, hora_fin, dias_semana, es_horario_habil) VALUES
  ('Turno Matutino', '08:00', '16:00', '{1,2,3,4,5}', true),
  ('Turno Vespertino', '14:00', '22:00', '{1,2,3,4,5}', true),
  ('Turno Sábado', '09:00', '14:00', '{6}', true);
```

#### 5.2 Funciones Helper para SLA

```sql
-- Función para calcular si una hora está en horario hábil
CREATE OR REPLACE FUNCTION es_horario_habil(
  timestamp_check TIMESTAMPTZ,
  horario_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  horario RECORD;
  dia_semana INTEGER;
BEGIN
  SELECT * INTO horario FROM horarios WHERE id = horario_id;
  dia_semana := EXTRACT(DOW FROM timestamp_check);

  RETURN (
    dia_semana = ANY(horario.dias_semana) AND
    timestamp_check::TIME >= horario.hora_inicio AND
    timestamp_check::TIME <= horario.hora_fin
  );
END;
$$ LANGUAGE plpgsql;
```

- [ ] Implementar función de cálculo de horarios hábiles
- [ ] Crear tabla de días festivos

#### 5.3 Frontend - Horarios

- [ ] Crear interfaz de configuración de turnos
- [ ] Mostrar turno actual del usuario
- [ ] Asignar turnos a usuarios

### 6. Auditoría de Usuarios

#### 6.1 Sistema de Auditoría

```sql
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  registro_id UUID,
  usuario_id UUID REFERENCES profiles(id),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función genérica de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_log (tabla, accion, registro_id, usuario_id, datos_anteriores)
    VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, auth.uid(), row_to_json(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_log (tabla, accion, registro_id, usuario_id, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, auth.uid(), row_to_json(OLD), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_log (tabla, accion, registro_id, usuario_id, datos_nuevos)
    VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, auth.uid(), row_to_json(NEW));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a tabla profiles
CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

#### 6.2 Historial de Sesiones

```sql
CREATE TABLE public.sesiones_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES profiles(id),
  accion TEXT, -- 'login', 'logout', 'login_failed'
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] Registrar logins exitosos
- [ ] Registrar intentos fallidos
- [ ] Implementar consulta de historial

### 7. Panel de Administración - Usuarios

#### 7.1 Panel Admin

- [ ] Crear sección "Administración" en menú
- [ ] Crear submenu: Usuarios, Roles, Equipos, Horarios
- [ ] Implementar dashboard de usuarios:
  - [ ] Total de usuarios activos/inactivos
  - [ ] Usuarios por rol
  - [ ] Usuarios por equipo
  - [ ] Gráfica con ApexCharts
- [ ] Implementar filtros avanzados
- [ ] Crear exportación a CSV/Excel
- [ ] Crear vista de actividad de usuarios
- [ ] Mostrar historial de auditoría

### 8. Mejoras de UX

#### 8.1 Componentes Visuales

- [ ] Crear badges de rol con colores:
  - Admin: amarillo iGAS (#F9B000)
  - Coordinador: azul
  - Técnico: verde
  - Dev: morado
- [ ] Crear badges de estatus:
  - Activo: verde (#4CAF50)
  - Inactivo: gris
- [ ] Crear indicador de disponibilidad:
  - En línea: verde
  - Ocupado: amarillo
  - Fuera de turno: gris

---

## Entregables

- [ ] Sistema de autenticación completo y mejorado
- [ ] CRUD de usuarios funcional con RLS
- [ ] Sistema de roles y permisos operativo
- [ ] Gestión de equipos implementada
- [ ] Gestión de horarios/turnos
- [ ] Sistema de auditoría funcionando
- [ ] Panel de administración de usuarios
- [ ] Guards y directivas de permisos
- [ ] Documentación de políticas RLS

## Dependencias

- Fase 0: Configuración inicial (COMPLETADA)

## Criterios de Aceptación

- [ ] Usuarios pueden hacer login con credenciales asignadas
- [ ] Admins pueden crear y gestionar usuarios completos
- [ ] Sistema valida permisos en frontend y backend (RLS)
- [ ] Usuarios pueden ser asignados a roles y equipos
- [ ] Auditoría registra todas las acciones
- [ ] Panel admin permite gestión completa de usuarios
- [ ] Guards protegen rutas según permisos
- [ ] No existe opción de registro público (solo admins crean usuarios)

## Notas Técnicas Supabase

- Usar **Row Level Security (RLS)** para seguridad real a nivel de base de datos
- **Triggers** de Supabase para auditoría automática
- **auth.uid()** para obtener usuario actual en policies
- **Storage** de Supabase para avatares
- Considerar **Supabase Edge Functions** para lógica compleja
- Usar **Realtime** para actualización de disponibilidad en tiempo real
