export const MENU_ITEMS = [
  // Commented out original menu items
  // {
  //   key: 'menu',
  //   label: 'MENU',
  //   isTitle: true
  // }, {
  //   key: 'dashboard',
  //   icon: 'solar:home-2-broken',
  //   label: 'Dashboard',
  //   badge: {
  //     text: '9+',
  //     variant: 'success'
  //   },
  //   url: '/dashboard/analytics'
  // }, {
  //   key: 'apps',
  //   label: 'APPS',
  //   isTitle: true
  // }, {
  //   key: 'apps-chat',
  //   icon: 'solar:chat-round-call-broken',
  //   label: 'Chat',
  //   url: '/apps/chat'
  // }, {
  //   key: 'apps-email',
  //   icon: 'solar:letter-broken',
  //   label: 'Email',
  //   url: '/apps/email'
  // }, {
  //   key: 'apps-calendar',
  //   icon: 'solar:calendar-broken',
  //   label: 'Calendar',
  //   children: [{
  //     key: 'calendar-schedule',
  //     label: 'Schedule',
  //     url: '/calendar/schedule',
  //     parentKey: 'apps-calendar'
  //   }, {
  //     key: 'calendar-integration',
  //     label: 'Integration',
  //     url: '/calendar/integration',
  //     parentKey: 'apps-calendar'
  //   }]
  // }, {
  //   key: 'apps-todo',
  //   icon: 'solar:list-heart-minimalistic-broken',
  //   label: 'Todo',
  //   url: '/apps/todo'
  // }, {
  //   key: 'apps-invoices',
  //   icon: 'solar:bill-list-broken',
  //   label: 'Invoices',
  //   children: [{
  //     key: 'invoices',
  //     label: 'Invoices',
  //     url: '/invoices',
  //     parentKey: 'apps-invoices'
  //   }, {
  //     key: 'invoices-details',
  //     label: 'Invoices Details',
  //     url: '/invoices/RB6985',
  //     parentKey: 'apps-invoices'
  //   }]
  // }, {
  //   key: 'custom',
  //   label: 'Custom',
  //   isTitle: true
  // }, {
  //   key: 'pages',
  //   label: 'Pages',
  //   isTitle: false,
  //   icon: 'solar:folder-with-files-broken',
  //   children: [{
  //     key: 'page-welcome',
  //     label: 'Welcome',
  //     url: '/pages/welcome',
  //     parentKey: 'pages'
  //   }, {
  //     key: 'page-faqs',
  //     label: 'FAQs',
  //     url: '/pages/faqs',
  //     parentKey: 'pages'
  //   }, {
  //     key: 'page-coming-soon',
  //     label: 'Coming Soon',
  //     url: '/coming-soon',
  //     parentKey: 'pages',
  //     target: '_blank'
  //   }, {
  //     key: 'page-timeline',
  //     label: 'Timeline',
  //     url: '/pages/timeline',
  //     parentKey: 'pages'
  //   }, {
  //     key: 'page-pricing',
  //     label: 'Pricing',
  //     url: '/pages/pricing',
  //     parentKey: 'pages'
  //   }, {
  //     key: 'page-maintenance',
  //     label: 'Maintenance',
  //     url: '/maintenance',
  //     parentKey: 'pages',
  //     target: '_blank'
  //   }, {
  //     key: 'page-404-error',
  //     label: '404 Error',
  //     url: '/error-404',
  //     parentKey: 'pages',
  //     target: '_blank'
  //   }, {
  //     key: 'page-error-404-alt',
  //     label: 'Error 404 Alt',
  //     url: '/pages/error-404-alt',
  //     parentKey: 'pages'
  //   }]
  // }, {
  //   key: 'page-authentication',
  //   label: 'Authentication',
  //   isTitle: false,
  //   icon: 'solar:lock-password-unlocked-broken',
  //   children: [{
  //     key: 'sign-in',
  //     label: 'Sign In',
  //     url: '/auth/sign-in',
  //     parentKey: 'page-authentication'
  //   }, {
  //     key: 'signup',
  //     label: 'Sign Up',
  //     url: '/auth/sign-up',
  //     parentKey: 'page-authentication'
  //   }, {
  //     key: 'reset-pass',
  //     label: 'Reset Password',
  //     url: '/auth/reset-pass',
  //     parentKey: 'page-authentication'
  //   }, {
  //     key: 'lock-screen',
  //     label: 'Lock Screen',
  //     url: '/auth/lock-screen',
  //     parentKey: 'page-authentication'
  //   }]
  // }, {
  //   key: 'widgets',
  //   icon: 'solar:gift-broken',
  //   label: 'Widgets',
  //   badge: {
  //     text: 'Hot',
  //     variant: 'danger'
  //   },
  //   url: '/widgets'
  // }, {
  //   key: 'components',
  //   label: 'COMPONENTS',
  //   isTitle: true
  // }, {
  //   key: 'base-ui',
  //   icon: 'solar:fire-broken',
  //   label: 'Base UI',
  //   children: [{
  //     key: 'base-ui-accordions',
  //     label: 'Accordions',
  //     url: '/ui/accordions',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-alerts',
  //     label: 'Alerts',
  //     url: '/ui/alerts',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-avatars',
  //     label: 'Avatars',
  //     url: '/ui/avatars',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-badges',
  //     label: 'Badges',
  //     url: '/ui/badges',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-breadcrumb',
  //     label: 'Breadcrumb',
  //     url: '/ui/breadcrumb',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-buttons',
  //     label: 'Buttons',
  //     url: '/ui/buttons',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-cards',
  //     label: 'Cards',
  //     url: '/ui/cards',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-carousel',
  //     label: 'Carousel',
  //     url: '/ui/carousel',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-collapse',
  //     label: 'Collapse',
  //     url: '/ui/collapse',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-dropdowns',
  //     label: 'Dropdowns',
  //     url: '/ui/dropdowns',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-list-group',
  //     label: 'List Group',
  //     url: '/ui/list-group',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-modals',
  //     label: 'Modals',
  //     url: '/ui/modals',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-tabs',
  //     label: 'Tabs',
  //     url: '/ui/tabs',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-offcanvas',
  //     label: 'Offcanvas',
  //     url: '/ui/offcanvas',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-pagination',
  //     label: 'Pagination',
  //     url: '/ui/pagination',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-placeholders',
  //     label: 'Placeholders',
  //     url: '/ui/placeholders',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-popovers',
  //     label: 'Popovers',
  //     url: '/ui/popovers',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-progress',
  //     label: 'Progress',
  //     url: '/ui/progress',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-spinners',
  //     label: 'Spinners',
  //     url: '/ui/spinners',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-toasts',
  //     label: 'Toasts',
  //     url: '/ui/toasts',
  //     parentKey: 'base-ui'
  //   }, {
  //     key: 'base-ui-tooltips',
  //     label: 'Tooltips',
  //     url: '/ui/tooltips',
  //     parentKey: 'base-ui'
  //   }]
  // }, {
  //   key: 'advanced-ui',
  //   icon: 'solar:magic-stick-3-broken',
  //   label: 'Advanced UI',
  //   children: [{
  //     key: 'advanced-ui-ratings',
  //     label: 'Ratings',
  //     url: '/advanced/ratings',
  //     parentKey: 'advanced-ui'
  //   }, {
  //     key: 'advanced-ui-sweet-alert',
  //     label: 'Sweet Alert',
  //     url: '/advanced/alert',
  //     parentKey: 'advanced-ui'
  //   }, {
  //     key: 'advanced-ui-swiper-slider',
  //     label: 'Swiper Slider',
  //     url: '/advanced/swiper',
  //     parentKey: 'advanced-ui'
  //   }, {
  //     key: 'advanced-ui-scrollbar',
  //     label: 'Scrollbar',
  //     url: '/advanced/scrollbar',
  //     parentKey: 'advanced-ui'
  //   }, {
  //     key: 'advanced-ui-toastify',
  //     label: 'Toastify',
  //     url: '/advanced/toastify',
  //     parentKey: 'advanced-ui'
  //   }]
  // }, {
  //   key: 'charts',
  //   icon: 'solar:chart-square-broken',
  //   label: 'Charts',
  //   children: [{
  //     key: 'charts-area',
  //     label: 'Area',
  //     url: '/charts/area',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-bar',
  //     label: 'Bar',
  //     url: '/charts/bar',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-bubble',
  //     label: 'Bubble',
  //     url: '/charts/bubble',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-candle-stick',
  //     label: 'Candle Stick',
  //     url: '/charts/candlestick',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-column',
  //     label: 'Column',
  //     url: '/charts/column',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-heatmap',
  //     label: 'Heatmap',
  //     url: '/charts/heatmap',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-line',
  //     label: 'Line',
  //     url: '/charts/line',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-mixed',
  //     label: 'Mixed',
  //     url: '/charts/mixed',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-timeline',
  //     label: 'Timeline',
  //     url: '/charts/timeline',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-boxplot',
  //     label: 'Boxplot',
  //     url: '/charts/boxplot',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-treemap',
  //     label: 'Treemap',
  //     url: '/charts/treemap',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-pie',
  //     label: 'Pie',
  //     url: '/charts/pie',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-radar',
  //     label: 'Radar',
  //     url: '/charts/radar',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-radial-bar',
  //     label: 'Radial Bar',
  //     url: '/charts/radial-bar',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-scatter',
  //     label: 'Scatter',
  //     url: '/charts/scatter',
  //     parentKey: 'charts'
  //   }, {
  //     key: 'charts-polar-area',
  //     label: 'Polar Area',
  //     url: '/charts/polar',
  //     parentKey: 'charts'
  //   }]
  // }, {
  //   key: 'forms',
  //   icon: 'solar:checklist-broken',
  //   label: 'Forms',
  //   children: [{
  //     key: 'forms-basic-elements',
  //     label: 'Basic Elements',
  //     url: '/forms/basic',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-checkbox&radio',
  //     label: 'Checkbox & Radio',
  //     url: '/forms/checkbox',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-choice-select',
  //     label: 'Choice Select',
  //     url: '/forms/select',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-clipboard',
  //     label: 'Clipboard',
  //     url: '/forms/clipboard',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-flat-picker',
  //     label: 'Flat Picker',
  //     url: '/forms/flat-picker',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-validation',
  //     label: 'Validation',
  //     url: '/forms/validation',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-wizard',
  //     label: 'Wizard',
  //     url: '/forms/wizard',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-file-uploads',
  //     label: 'File Uploads',
  //     url: '/forms/file-uploads',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-editors',
  //     label: 'Editors',
  //     url: '/forms/editors',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-input-mask',
  //     label: 'Input Mask',
  //     url: '/forms/input-mask',
  //     parentKey: 'forms'
  //   }, {
  //     key: 'forms-slider',
  //     label: 'Slider',
  //     url: '/forms/slider',
  //     parentKey: 'forms'
  //   }]
  // }, {
  //   key: 'tables',
  //   icon: 'solar:bedside-table-4-broken',
  //   label: 'Tables',
  //   children: [{
  //     key: 'tables-basic',
  //     label: 'Basic Tables',
  //     url: '/tables/basic',
  //     parentKey: 'tables'
  //   }, {
  //     key: 'tables-grid-js',
  //     label: 'Grid JS',
  //     url: '/tables/gridjs',
  //     parentKey: 'tables'
  //   }]
  // }, {
  //   key: 'icons',
  //   icon: 'solar:bicycling-broken',
  //   label: 'Icons',
  //   children: [{
  //     key: 'icons-boxicons',
  //     label: 'Boxicons',
  //     url: '/icons/boxicons',
  //     parentKey: 'icons'
  //   }, {
  //     key: 'icons-iconamoon',
  //     label: 'Solar Icon',
  //     url: '/icons/solaricon',
  //     parentKey: 'icons'
  //   }]
  // }, {
  //   key: 'maps',
  //   icon: 'solar:streets-map-point-broken',
  //   label: 'Maps',
  //   children: [{
  //     key: 'maps-google',
  //     label: 'Google Maps',
  //     url: '/maps/google',
  //     parentKey: 'maps'
  //   }, {
  //     key: 'maps-vector',
  //     label: 'Vector Maps',
  //     url: '/maps/vector',
  //     parentKey: 'maps'
  //   }]
  // }, {
  //   key: 'badge-menu',
  //   icon: 'solar:football-broken',
  //   label: 'Badge Menu',
  //   badge: {
  //     text: '1',
  //     variant: 'primary'
  //   }
  // }, {
  //   key: 'menuitem',
  //   icon: 'solar:share-broken',
  //   label: 'Menu Item',
  //   children: [{
  //     key: 'menu-item-1',
  //     label: 'Menu Item 1',
  //     parentKey: 'menuitem'
  //   }, {
  //     key: 'menu-item-2',
  //     label: 'Menu Item 2',
  //     parentKey: 'menuitem',
  //     children: [{
  //       key: 'menu-sub-item',
  //       label: 'Menu Sub Item',
  //       parentKey: 'menu-item-2'
  //     }]
  //   }]
  // }, {
  //   key: 'disabled-item',
  //   icon: 'solar:dislike-broken',
  //   label: 'Disabled Item',
  //   isDisabled: true
  // }
  
  // MENU Section
  {
    key: 'menu',
    label: 'MENU',
    isTitle: true
  },
  {
    key: 'dashboard',
    icon: 'solar:home-2-broken',
    label: 'Dashboard',
    url: '/inventory/dashboard'
  },
  {
    key: 'inventory',
    label: 'Inventory',
    isTitle: true
  },
  {
    key: 'inventory-items',
    icon: 'solar:box-broken',
    label: 'Items',
    url: '/inventory/items'
  },
  {
    key: 'inventory-sales',
    icon: 'solar:wallet-money-broken',
    label: 'Sales',
    url: '/inventory/sales'
  },
  {
    key: 'inventory-reports',
    icon: 'solar:document-text-broken',
    label: 'Reports',
    url: '/inventory/reports'
  },
  {
    key: 'inventory-insights',
    icon: 'solar:lightbulb-broken',
    label: 'Insights',
    url: '/inventory/insights'
  },
];