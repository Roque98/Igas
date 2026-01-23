export interface NavigationItem {
  id: string;
  title: string;
  type: 'item' | 'collapse' | 'group';
  translate?: string;
  icon?: string;
  hidden?: boolean;
  url?: string;
  classes?: string;
  exactMatch?: boolean;
  external?: boolean;
  target?: boolean;
  breadcrumbs?: boolean;
  children?: NavigationItem[];
}

/**
 * Navigation configuration for iGAS application
 *
 * NOTE: Demo components from Datta-Able template are kept in code but hidden from navigation
 * using the 'hidden: true' property. This allows them to be used as reference for development.
 * To show demo components, simply set 'hidden: false' or remove the property.
 *
 * Hidden demo groups:
 * - UI ELEMENT: Basic components (buttons, badges, typography, etc.)
 * - Forms & Tables: Form elements and table examples
 * - Chart: ApexChart examples
 * - Pages: Authentication pages, sample pages, etc.
 */
export const NavigationItems: NavigationItem[] = [
  {
    id: 'navigation',
    title: 'Navigation',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        type: 'item',
        url: '/dashboard',
        icon: 'feather icon-home',
        classes: 'nav-item'
      }
    ]
  },
  {
    id: 'soporte',
    title: 'Soporte',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'tickets',
        title: 'Tickets',
        type: 'collapse',
        icon: 'feather icon-file-text',
        children: [
          {
            id: 'tickets-dashboard',
            title: 'Dashboard',
            type: 'item',
            url: '/tickets',
            exactMatch: true
          },
          {
            id: 'tickets-lista',
            title: 'Lista de Tickets',
            type: 'item',
            url: '/tickets/lista'
          },
          {
            id: 'tickets-nuevo',
            title: 'Nuevo Ticket',
            type: 'item',
            url: '/tickets/nuevo'
          }
        ]
      },
      {
        id: 'casos',
        title: 'Casos',
        type: 'collapse',
        icon: 'feather icon-trending-up',
        children: [
          {
            id: 'casos-dashboard',
            title: 'Dashboard',
            type: 'item',
            url: '/casos',
            exactMatch: true
          },
          {
            id: 'casos-lista',
            title: 'Lista de Casos',
            type: 'item',
            url: '/casos/lista'
          }
        ]
      },
      {
        id: 'clientes',
        title: 'Clientes',
        type: 'collapse',
        icon: 'feather icon-briefcase',
        children: [
          {
            id: 'clientes-lista',
            title: 'Lista de Clientes',
            type: 'item',
            url: '/clientes',
            exactMatch: true
          },
          {
            id: 'clientes-nuevo',
            title: 'Nuevo Cliente',
            type: 'item',
            url: '/clientes/nuevo'
          }
        ]
      },
      {
        id: 'mantenimientos',
        title: 'Mantenimientos',
        type: 'collapse',
        icon: 'feather icon-settings',
        children: [
          {
            id: 'mantenimientos-lista',
            title: 'Lista',
            type: 'item',
            url: '/mantenimientos/lista'
          },
          {
            id: 'mantenimientos-calendario',
            title: 'Calendario',
            type: 'item',
            url: '/mantenimientos/calendario'
          },
          {
            id: 'mantenimientos-nuevo',
            title: 'Nuevo Mantenimiento',
            type: 'item',
            url: '/mantenimientos/nuevo'
          }
        ]
      },
      {
        id: 'instalaciones',
        title: 'Instalaciones',
        type: 'collapse',
        icon: 'feather icon-download-cloud',
        children: [
          {
            id: 'instalaciones-lista',
            title: 'Lista / Pipeline',
            type: 'item',
            url: '/instalaciones/lista'
          },
          {
            id: 'instalaciones-nuevo',
            title: 'Nueva Instalación',
            type: 'item',
            url: '/instalaciones/nuevo'
          }
        ]
      },
      {
        id: 'reportes',
        title: 'Reportes',
        type: 'collapse',
        icon: 'feather icon-bar-chart-2',
        children: [
          {
            id: 'reporte-tickets',
            title: 'Reporte de Tickets',
            type: 'item',
            url: '/reportes/tickets'
          },
          {
            id: 'reporte-casos',
            title: 'Reporte de Casos',
            type: 'item',
            url: '/reportes/casos'
          }
        ]
      }
    ]
  },
  {
    id: 'administracion',
    title: 'Administración',
    type: 'group',
    icon: 'icon-navigation',
    children: [
      {
        id: 'usuarios',
        title: 'Usuarios',
        type: 'collapse',
        icon: 'feather icon-users',
        children: [
          {
            id: 'usuarios-lista',
            title: 'Lista de Usuarios',
            type: 'item',
            url: '/usuarios',
            exactMatch: true
          },
          {
            id: 'usuarios-nuevo',
            title: 'Nuevo Usuario',
            type: 'item',
            url: '/usuarios/nuevo'
          },
          {
            id: 'mi-perfil',
            title: 'Mi Perfil',
            type: 'item',
            url: '/usuarios/perfil'
          }
        ]
      },
      {
        id: 'equipos',
        title: 'Equipos',
        type: 'collapse',
        icon: 'feather icon-briefcase',
        children: [
          {
            id: 'equipos-lista',
            title: 'Lista de Equipos',
            type: 'item',
            url: '/equipos',
            exactMatch: true
          },
          {
            id: 'equipos-nuevo',
            title: 'Nuevo Equipo',
            type: 'item',
            url: '/equipos/nuevo'
          }
        ]
      },
      {
        id: 'horarios',
        title: 'Horarios',
        type: 'collapse',
        icon: 'feather icon-clock',
        children: [
          {
            id: 'horarios-lista',
            title: 'Lista de Horarios',
            type: 'item',
            url: '/horarios',
            exactMatch: true
          },
          {
            id: 'horarios-nuevo',
            title: 'Nuevo Horario',
            type: 'item',
            url: '/horarios/nuevo'
          }
        ]
      },
      {
        id: 'auditoria',
        title: 'Auditoría',
        type: 'item',
        icon: 'feather icon-file-text',
        url: '/auditoria',
        classes: 'nav-item'
      }
    ]
  },
  {
    id: 'ui-element',
    title: 'UI ELEMENT',
    type: 'group',
    icon: 'icon-ui',
    hidden: true, // Demo components - hidden for reference
    children: [
      {
        id: 'basic',
        title: 'Component',
        type: 'collapse',
        icon: 'feather icon-box',
        children: [
          {
            id: 'button',
            title: 'Button',
            type: 'item',
            url: '/basic/button'
          },
          {
            id: 'badges',
            title: 'Badges',
            type: 'item',
            url: '/basic/badges'
          },
          {
            id: 'breadcrumb-pagination',
            title: 'Breadcrumb & Pagination',
            type: 'item',
            url: '/basic/breadcrumb-paging'
          },
          {
            id: 'collapse',
            title: 'Collapse',
            type: 'item',
            url: '/basic/collapse'
          },
          {
            id: 'tabs-pills',
            title: 'Tabs & Pills',
            type: 'item',
            url: '/basic/tabs-pills'
          },
          {
            id: 'typography',
            title: 'Typography',
            type: 'item',
            url: '/basic/typography'
          }
        ]
      }
    ]
  },
  {
    id: 'forms',
    title: 'Forms & Tables',
    type: 'group',
    icon: 'icon-group',
    hidden: true, // Demo components - hidden for reference
    children: [
      {
        id: 'forms-element',
        title: 'Form Elements',
        type: 'item',
        url: '/forms',
        classes: 'nav-item',
        icon: 'feather icon-file-text'
      },
      {
        id: 'tables',
        title: 'Tables',
        type: 'item',
        url: '/tables',
        classes: 'nav-item',
        icon: 'feather icon-server'
      }
    ]
  },
  {
    id: 'chart-maps',
    title: 'Chart',
    type: 'group',
    icon: 'icon-charts',
    hidden: true, // Demo components - hidden for reference
    children: [
      {
        id: 'apexChart',
        title: 'ApexChart',
        type: 'item',
        url: 'apexchart',
        classes: 'nav-item',
        icon: 'feather icon-pie-chart'
      }
    ]
  },
  {
    id: 'pages',
    title: 'Pages',
    type: 'group',
    icon: 'icon-pages',
    hidden: true, // Demo pages - hidden for reference
    children: [
      {
        id: 'auth',
        title: 'Authentication',
        type: 'collapse',
        icon: 'feather icon-lock',
        children: [
          // Registro deshabilitado - Los usuarios son creados por administradores
          // {
          //   id: 'signup',
          //   title: 'Sign up',
          //   type: 'item',
          //   url: '/register',
          //   target: true,
          //   breadcrumbs: false
          // },
          {
            id: 'signin',
            title: 'Sign in',
            type: 'item',
            url: '/login',
            target: true,
            breadcrumbs: false
          }
        ]
      },
      {
        id: 'sample-page',
        title: 'Sample Page',
        type: 'item',
        url: '/sample-page',
        classes: 'nav-item',
        icon: 'feather icon-sidebar'
      },
      {
        id: 'disabled-menu',
        title: 'Disabled Menu',
        type: 'item',
        url: 'javascript:void(0)',
        classes: 'nav-item disabled',
        icon: 'feather icon-power',
        external: true
      },
      {
        id: 'buy_now',
        title: 'Buy Now',
        type: 'item',
        icon: 'feather icon-book',
        classes: 'nav-item',
        url: 'https://codedthemes.com/item/datta-able-angular/',
        target: true,
        external: true
      }
    ]
  }
];
