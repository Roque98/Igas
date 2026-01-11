# 🏗️ Arquitectura del Proyecto

Este documento describe la arquitectura y estructura del proyecto IGAS.

## 📁 Estructura de Carpetas

```
Igas/
├── src/
│   ├── app/
│   │   ├── core/                 # Servicios core y guards
│   │   │   ├── guards/          # Guards de autenticación
│   │   │   │   └── auth.guard.ts
│   │   │   └── services/        # Servicios principales
│   │   │       └── supabase.service.ts
│   │   ├── demo/                # Componentes de demo/features
│   │   ├── theme/               # Componentes del template
│   │   └── app.component.ts
│   ├── assets/                  # Recursos estáticos
│   ├── environments/            # Configuración de entornos
│   │   ├── environment.ts       # Desarrollo
│   │   └── environment.prod.ts  # Producción
│   └── scss/                    # Estilos globales
│       ├── _variables.scss
│       ├── _general.scss
│       ├── _generic.scss
│       ├── mixins/
│       ├── menu/
│       └── theme-elements/
├── documentacion/               # Wiki del proyecto
│   ├── README.md
│   ├── SUPABASE.md
│   ├── GITFLOW.md
│   ├── CONTRIBUCION.md
│   └── ARQUITECTURA.md
├── .env.example                 # Template de variables
├── angular.json                 # Config de Angular
├── package.json
└── tsconfig.json
```

## 🏛️ Capas de la Aplicación

### 1. Core Layer
**Ubicación**: `src/app/core/`

Contiene servicios y funcionalidades core que se usan en toda la aplicación:

#### Services
- **SupabaseService**: Manejo de autenticación y conexión con backend
- Servicios singleton que se inyectan globalmente
- Lógica de negocio compartida

#### Guards
- **authGuard**: Protege rutas privadas
- **publicGuard**: Redirige usuarios autenticados de páginas públicas
- Validación de permisos y roles

### 2. Feature Modules
**Ubicación**: `src/app/demo/` (temporal, renombrar a `features`)

Módulos de funcionalidades específicas:
- Dashboard
- Authentication (login, signup)
- UI Components
- Forms
- Tables
- Charts

Cada feature debe ser:
- Auto-contenido
- Lazy-loaded cuando sea posible
- Independiente de otros features

### 3. Shared Layer
**Ubicación**: `src/app/theme/` (componentes compartidos del template)

Componentes, directivas y pipes reutilizables:
- Componentes de UI reutilizables
- Directivas custom
- Pipes custom
- Modelos e interfaces compartidas

### 4. Presentation Layer
Componentes de presentación (dumb components):
- Solo reciben datos via @Input
- Emiten eventos via @Output
- No tienen lógica de negocio
- Fácilmente reutilizables

### 5. Container Layer
Componentes contenedores (smart components):
- Manejan lógica de negocio
- Conectan con servicios
- Pasan datos a componentes de presentación
- Manejan eventos de componentes hijos

## 🔄 Flujo de Datos

```
Usuario
  ↓
Componente (Container)
  ↓
Servicio (Core)
  ↓
Supabase API
  ↓
Base de Datos
```

### Patrón Observable

```typescript
// Servicio
export class DataService {
  private data$ = new BehaviorSubject<Data[]>([]);

  getData(): Observable<Data[]> {
    return this.data$.asObservable();
  }
}

// Componente
export class MyComponent {
  data$ = this.dataService.getData();

  constructor(private dataService: DataService) {}
}

// Template
<div *ngFor="let item of data$ | async">
  {{ item.name }}
</div>
```

## 🛡️ Autenticación y Guards

### Flujo de Autenticación

```
Login Component
  ↓
SupabaseService.signIn()
  ↓
Supabase Auth
  ↓
Session Storage
  ↓
currentUser$ (Observable)
  ↓
Components subscribe
```

### Guards en Rutas

```typescript
const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]  // Solo usuarios autenticados
  },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard]  // Solo usuarios NO autenticados
  }
];
```

## 📦 Módulos

### App Module (Root)
- Bootstrap de la aplicación
- Importa módulos principales
- Configura providers globales

### Core Module
- Servicios singleton
- Guards
- Interceptors (futuro)

### Shared Module
- Componentes reutilizables
- Directivas y pipes
- Exporta para otros módulos

### Feature Modules
- Lazy-loaded
- Auto-contenidos
- Importan SharedModule si necesitan

## 🎨 Sistema de Estilos

### SCSS Modular

```scss
// Variables globales
@use 'scss/variables';

// Mixins y funciones
@use 'scss/mixins/buttons';
@use 'scss/mixins/function';

// Componentes temáticos
@use 'scss/theme-elements/buttons';
```

### Estructura de Estilos

1. **Variables**: Colores, tamaños, breakpoints
2. **Mixins**: Funciones reutilizables
3. **Base**: Reset, tipografía, elementos base
4. **Layout**: Grid, contenedores, navegación
5. **Components**: Botones, cards, forms
6. **Utilities**: Clases helper

## 🔌 Integración con Supabase

### Arquitectura de Backend

```
Angular App
    ↓
SupabaseService (Angular)
    ↓
Supabase Client Library
    ↓
Supabase API
    ↓
PostgreSQL Database
```

### Operaciones

```typescript
// Auth
await this.supabase.signIn(email, password);

// Database (ejemplo)
const { data } = await this.supabase.client
  .from('users')
  .select('*')
  .eq('id', userId);

// Storage (ejemplo futuro)
const { data } = await this.supabase.client.storage
  .from('avatars')
  .upload(path, file);
```

## 📱 Routing

### Estructura de Rutas

```
/
├── auth/
│   ├── signin
│   └── signup
├── dashboard
├── ui-elements/
│   ├── buttons
│   ├── typography
│   └── ...
└── tables/
    └── bootstrap
```

### Lazy Loading

```typescript
const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./demo/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  }
];
```

## 🔐 Seguridad

### Row Level Security (RLS) en Supabase
- Políticas de acceso por usuario
- Validación del lado del servidor
- No confiar solo en el frontend

### Guards de Angular
- Protección de rutas
- Validación de sesión
- Redirección automática

### Variables de Entorno
- Nunca commitear credenciales
- Usar .env para local
- Variables de entorno para producción

## 🧪 Testing (Futuro)

### Estrategia de Testing

1. **Unit Tests**: Servicios, pipes, funciones puras
2. **Component Tests**: Lógica de componentes
3. **Integration Tests**: Flujos completos
4. **E2E Tests**: Casos de uso críticos

## 📊 Estado de la Aplicación

### Gestión de Estado Actual
- RxJS Observables
- BehaviorSubjects en servicios
- Async pipe en templates

### Futuro (si crece)
- NgRx o Akita para estado global
- Estado inmutable
- DevTools para debugging

## 🚀 Optimizaciones

### Performance
- Lazy loading de módulos
- OnPush change detection (donde aplique)
- TrackBy en *ngFor
- Pure pipes
- Debounce en búsquedas

### Build
- AOT compilation
- Tree shaking
- Minificación
- Source maps para debugging

## 📚 Patrones Recomendados

### 1. Dependency Injection
```typescript
// Malo
export class MyComponent {
  service = new MyService();
}

// Bueno
export class MyComponent {
  constructor(private service: MyService) {}
}
```

### 2. Unsubscribe de Observables
```typescript
// Opción 1: async pipe (recomendado)
data$ = this.service.getData();

// Opción 2: takeUntil
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.getData()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {});
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 3. Smart vs Dumb Components
```typescript
// Smart (Container)
export class UserListComponent {
  users$ = this.userService.getUsers();
  constructor(private userService: UserService) {}

  onUserSelect(user: User) {
    this.router.navigate(['/users', user.id]);
  }
}

// Dumb (Presentational)
export class UserCardComponent {
  @Input() user!: User;
  @Output() select = new EventEmitter<User>();
}
```

## 🔄 Ciclo de Vida de Componentes

Orden de ejecución:
1. `constructor()` - Inicialización básica
2. `ngOnChanges()` - Cuando cambian @Input
3. `ngOnInit()` - Inicialización del componente
4. `ngAfterViewInit()` - Después de inicializar la vista
5. `ngOnDestroy()` - Limpieza antes de destruir

---

**Última actualización**: 2026-01-11
