# Guía de Configuración de Supabase

Este proyecto está configurado para usar Supabase como backend (autenticación, base de datos, storage, etc.).

## 📋 Prerequisitos

1. Crear una cuenta en [Supabase](https://supabase.com)
2. Crear un nuevo proyecto en Supabase

## 🔧 Configuración

### 1. Obtener las credenciales

1. Ve a tu proyecto en Supabase
2. Navega a `Settings` → `API`
3. Copia los siguientes valores:
   - **Project URL**: Tu URL del proyecto
   - **anon/public key**: Tu clave anónima

### 2. Configurar las variables de entorno

Actualiza los archivos de environment con tus credenciales:

#### Development (`src/environments/environment.ts`):
```typescript
export const environment = {
  appVersion: packageInfo.version,
  production: false,
  supabase: {
    url: 'https://tu-proyecto.supabase.co',
    anonKey: 'tu-anon-key-aqui'
  }
};
```

#### Production (`src/environments/environment.prod.ts`):
```typescript
export const environment = {
  appVersion: packageInfo.version,
  production: true,
  supabase: {
    url: 'https://tu-proyecto-prod.supabase.co',
    anonKey: 'tu-anon-key-prod-aqui'
  }
};
```

## 🚀 Uso del Servicio

### Inyectar el servicio

```typescript
import { SupabaseService } from './core/services/supabase.service';

export class MyComponent {
  constructor(private supabase: SupabaseService) {}
}
```

### Autenticación

#### Sign Up
```typescript
async signUp(email: string, password: string) {
  const { data, error } = await this.supabase.signUp(email, password);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('User created:', data);
  }
}
```

#### Sign In
```typescript
async signIn(email: string, password: string) {
  const { data, error } = await this.supabase.signIn(email, password);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Logged in:', data);
  }
}
```

#### Sign Out
```typescript
async signOut() {
  const { error } = await this.supabase.signOut();
  if (error) {
    console.error('Error:', error.message);
  }
}
```

#### Obtener usuario actual
```typescript
// Como Observable
this.supabase.currentUser$.subscribe(user => {
  console.log('Current user:', user);
});

// Como valor directo
const user = this.supabase.user;
```

### Base de Datos

Para trabajar con la base de datos, usa el cliente de Supabase:

```typescript
// SELECT
async getData() {
  const { data, error } = await this.supabase.client
    .from('tu_tabla')
    .select('*');
  return { data, error };
}

// INSERT
async insertData(newData: any) {
  const { data, error } = await this.supabase.client
    .from('tu_tabla')
    .insert(newData);
  return { data, error };
}

// UPDATE
async updateData(id: string, updates: any) {
  const { data, error } = await this.supabase.client
    .from('tu_tabla')
    .update(updates)
    .eq('id', id);
  return { data, error };
}

// DELETE
async deleteData(id: string) {
  const { data, error } = await this.supabase.client
    .from('tu_tabla')
    .delete()
    .eq('id', id);
  return { data, error };
}
```

## 🛡️ Guards de Autenticación

### Proteger rutas privadas

Usa `authGuard` para rutas que requieren autenticación:

```typescript
import { authGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  }
];
```

### Proteger rutas públicas

Usa `publicGuard` para rutas como login/signup (redirige a usuarios autenticados):

```typescript
import { publicGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: 'login',
    component: AuthSigninComponent,
    canActivate: [publicGuard]
  }
];
```

## 📚 Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Authentication](https://supabase.com/docs/guides/auth)
- [Database](https://supabase.com/docs/guides/database)

## 🔐 Seguridad

⚠️ **IMPORTANTE**:
- Nunca subas tus credenciales de Supabase al repositorio
- Usa variables de entorno para producción
- El archivo `.env` está ignorado en `.gitignore`
- Revisa las políticas RLS (Row Level Security) en Supabase para proteger tus datos
