import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

// Dashboard Routes
const Analytics = lazy(() => import('@/app/(admin)/dashboard/analytics/page'));
const InventoryDashboard = lazy(() => import('@/app/(admin)/inventory/dashboard/page'));
const InventoryItems = lazy(() => import('@/app/(admin)/inventory/items/page'));
const InventorySales = lazy(() => import('@/app/(admin)/inventory/sales/page'));
const InventoryReports = lazy(() => import('@/app/(admin)/inventory/reports/page'));
const InventoryInsights = lazy(() => import('@/app/(admin)/inventory/insights/page'));
const Filesystems = lazy(() => import('@/app/(admin)/dashboard/filesystems/page'));
const KernelConfigs = lazy(() => import('@/app/(admin)/dashboard/kernel-configs/page'));
const Vulnerabilities = lazy(() => import('@/app/(admin)/dashboard/vulnerabilities/page'));
const BinaryHardening = lazy(() => import('@/app/(admin)/dashboard/binary-hardening/page'));
// const Finance = lazy(() => import('@/app/(admin)/dashboard/finance/page'))
// const Sales = lazy(() => import('@/app/(admin)/dashboard/sales/page'))

// Apps Routes
// const EcommerceProducts = lazy(() => import('@/app/(admin)/ecommerce/products/page'))
// const EcommerceProductDetails = lazy(() => import('@/app/(admin)/ecommerce/products/[productId]/page'))
// const EcommerceProductCreate = lazy(() => import('@/app/(admin)/ecommerce/products/create/page'))
// const EcommerceCustomers = lazy(() => import('@/app/(admin)/ecommerce/customers/page'))
// const EcommerceSellers = lazy(() => import('@/app/(admin)/ecommerce/sellers/page'))
// const EcommerceOrders = lazy(() => import('@/app/(admin)/ecommerce/orders/page'))
// const EcommerceOrderDetails = lazy(() => import('@/app/(admin)/ecommerce/orders/[orderId]/page'))
// const EcommerceInventory = lazy(() => import('@/app/(admin)/ecommerce/inventory/page'))
const Chat = lazy(() => import('@/app/(admin)/apps/chat/page'));
const Email = lazy(() => import('@/app/(admin)/apps/email/page'));
const Schedule = lazy(() => import('@/app/(admin)/calendar/schedule/page'));
const Integration = lazy(() => import('@/app/(admin)/calendar/integration/page'));
const Todo = lazy(() => import('@/app/(admin)/apps/todo/page'));
// const Social = lazy(() => import('@/app/(admin)/apps/social/page'))
// const Contacts = lazy(() => import('@/app/(admin)/apps/contacts/page'))
const Invoices = lazy(() => import('@/app/(admin)/invoices/page'));
const InvoiceDetails = lazy(() => import('@/app/(admin)/invoices/[invoiceId]/page'));

// Pages Routes
const Welcome = lazy(() => import('@/app/(admin)/pages/welcome/page'));
const FAQs = lazy(() => import('@/app/(admin)/pages/faqs/page'));
const TimelinePage = lazy(() => import('@/app/(admin)/pages/timeline/page'));
const Pricing = lazy(() => import('@/app/(admin)/pages/pricing/page'));
const Maintenance = lazy(() => import('@/app/(other)/maintenance/page'));
const Widgets = lazy(() => import('@/app/(admin)/widgets/page'));

// Base UI Routes
const Accordions = lazy(() => import('@/app/(admin)/ui/accordions/page'));
const Alerts = lazy(() => import('@/app/(admin)/ui/alerts/page'));
const Avatars = lazy(() => import('@/app/(admin)/ui/avatars/page'));
const Badges = lazy(() => import('@/app/(admin)/ui/badges/page'));
const Breadcrumb = lazy(() => import('@/app/(admin)/ui/breadcrumb/page'));
const Buttons = lazy(() => import('@/app/(admin)/ui/buttons/page'));
const Cards = lazy(() => import('@/app/(admin)/ui/cards/page'));
const Carousel = lazy(() => import('@/app/(admin)/ui/carousel/page'));
const Collapse = lazy(() => import('@/app/(admin)/ui/collapse/page'));
const Dropdowns = lazy(() => import('@/app/(admin)/ui/dropdowns/page'));
const ListGroup = lazy(() => import('@/app/(admin)/ui/list-group/page'));
const Modals = lazy(() => import('@/app/(admin)/ui/modals/page'));
const Tabs = lazy(() => import('@/app/(admin)/ui/tabs/page'));
const Offcanvas = lazy(() => import('@/app/(admin)/ui/offcanvas/page'));
const Pagination = lazy(() => import('@/app/(admin)/ui/pagination/page'));
const Placeholders = lazy(() => import('@/app/(admin)/ui/placeholders/page'));
const Popovers = lazy(() => import('@/app/(admin)/ui/popovers/page'));
const Progress = lazy(() => import('@/app/(admin)/ui/progress/page'));
const Spinners = lazy(() => import('@/app/(admin)/ui/spinners/page'));
const Toasts = lazy(() => import('@/app/(admin)/ui/toasts/page'));
const Tooltips = lazy(() => import('@/app/(admin)/ui/tooltips/page'));

// Advanced UI Routes
const Ratings = lazy(() => import('@/app/(admin)/advanced/ratings/page'));
const SweetAlerts = lazy(() => import('@/app/(admin)/advanced/alert/page'));
const Swiper = lazy(() => import('@/app/(admin)/advanced/swiper/page'));
const Scrollbar = lazy(() => import('@/app/(admin)/advanced/scrollbar/page'));
const Toastify = lazy(() => import('@/app/(admin)/advanced/toastify/page'));

// Charts and Maps Routes
const Area = lazy(() => import('@/app/(admin)/charts/area/page'));
const Bar = lazy(() => import('@/app/(admin)/charts/bar/page'));
const Bubble = lazy(() => import('@/app/(admin)/charts/bubble/page'));
const Candlestick = lazy(() => import('@/app/(admin)/charts/candlestick/page'));
const Column = lazy(() => import('@/app/(admin)/charts/column/page'));
const Heatmap = lazy(() => import('@/app/(admin)/charts/heatmap/page'));
const Line = lazy(() => import('@/app/(admin)/charts/line/page'));
const Mixed = lazy(() => import('@/app/(admin)/charts/mixed/page'));
const Timeline = lazy(() => import('@/app/(admin)/charts/timeline/page'));
const Boxplot = lazy(() => import('@/app/(admin)/charts/boxplot/page'));
const Treemap = lazy(() => import('@/app/(admin)/charts/treemap/page'));
const Pie = lazy(() => import('@/app/(admin)/charts/pie/page'));
const Radar = lazy(() => import('@/app/(admin)/charts/radar/page'));
const RadialBar = lazy(() => import('@/app/(admin)/charts/radial-bar/page'));
const Scatter = lazy(() => import('@/app/(admin)/charts/scatter/page'));
const Polar = lazy(() => import('@/app/(admin)/charts/polar/page'));
const GoogleMaps = lazy(() => import('@/app/(admin)/maps/google/page'));
const VectorMaps = lazy(() => import('@/app/(admin)/maps/vector/page'));

// Forms Routes
const Basic = lazy(() => import('@/app/(admin)/forms/basic/page'));
const Checkbox = lazy(() => import('@/app/(admin)/forms/checkbox/page'));
const Select = lazy(() => import('@/app/(admin)/forms/select/page'));
const Clipboard = lazy(() => import('@/app/(admin)/forms/clipboard/page'));
const FlatPicker = lazy(() => import('@/app/(admin)/forms/flat-picker/page'));
const Validation = lazy(() => import('@/app/(admin)/forms/validation/page'));
const Wizard = lazy(() => import('@/app/(admin)/forms/wizard/page'));
const FileUploads = lazy(() => import('@/app/(admin)/forms/file-uploads/page'));
const Editors = lazy(() => import('@/app/(admin)/forms/editors/page'));
const InputMask = lazy(() => import('@/app/(admin)/forms/input-mask/page'));
const Slider = lazy(() => import('@/app/(admin)/forms/slider/page'));

// Form Routes
const BasicTable = lazy(() => import('@/app/(admin)/tables/basic/page'));
const GridjsTable = lazy(() => import('@/app/(admin)/tables/gridjs/page'));

// Icon Routes
const BoxIcons = lazy(() => import('@/app/(admin)/icons/boxicons/page'));
const SolarIcons = lazy(() => import('@/app/(admin)/icons/iconamoon/page'));

// Not Found Routes
const NotFoundAdmin = lazy(() => import('@/app/(admin)/not-found'));
const NotFound = lazy(() => import('@/app/(other)/(error-pages)/error-404/page'));

// Auth Routes
const AuthSignIn2 = lazy(() => import('@/app/(other)/auth/sign-in-2/page'));
const AuthSignUp2 = lazy(() => import('@/app/(other)/auth/sign-up-2/page'));
const ResetPassword2 = lazy(() => import('@/app/(other)/auth/reset-pass-2/page'));
const LockScreen2 = lazy(() => import('@/app/(other)/auth/lock-screen-2/page'));
const initialRoutes = [{
  path: '/',
  name: 'root',
  element: <Navigate to="/inventory/dashboard" />
}];
const generalRoutes = [{
  path: '/dashboard',
  name: 'Dashboard',
  element: <InventoryDashboard />
}, {
  path: '/inventory/dashboard',
  name: 'Inventory Dashboard',
  element: <InventoryDashboard />
}, {
  path: '/inventory/items',
  name: 'Inventory Items',
  element: <InventoryItems />
}, {
  path: '/inventory/sales',
  name: 'Inventory Sales',
  element: <InventorySales />
}, {
  path: '/inventory/reports',
  name: 'Inventory Reports',
  element: <InventoryReports />
}, {
  path: '/inventory/insights',
  name: 'Inventory Insights',
  element: <InventoryInsights />
}, {
  path: '/dashboard/filesystems',
  name: 'Filesystems',
  element: <Filesystems />
}, {
  path: '/dashboard/kernel-configs',
  name: 'Kernel Configurations',
  element: <KernelConfigs />
}, {
  path: '/dashboard/vulnerabilities',
  name: 'Vulnerabilities',
  element: <Vulnerabilities />
}, {
  path: '/dashboard/binary-hardening',
  name: 'Binary Hardening',
  element: <BinaryHardening />
}
//   {
//     path: '/dashboard/finance',
//     name: 'Finance',
//     element: <Finance />,
//   },
//   {
//     path: '/dashboard/sales',
//     name: 'Sales',
//     element: <Sales />,
//   },
];
const appsRoutes = [
//   {
//     name: 'Products',
//     path: '/ecommerce/products',
//     element: <EcommerceProducts />,
//   },
//   {
//     name: 'Product Details',
//     path: '/ecommerce/products/:productId',
//     element: <EcommerceProductDetails />,
//   },
//   {
//     name: 'Create Product',
//     path: '/ecommerce/products/create',
//     element: <EcommerceProductCreate />,
//   },
//   {
//     name: 'Customers',
//     path: '/ecommerce/customers',
//     element: <EcommerceCustomers />,
//   },
//   {
//     name: 'Sellers',
//     path: '/ecommerce/sellers',
//     element: <EcommerceSellers />,
//   },
//   {
//     name: 'Orders',
//     path: '/ecommerce/orders',
//     element: <EcommerceOrders />,
//   },
//   {
//     name: 'Order Details',
//     path: '/ecommerce/orders/:orderId',
//     element: <EcommerceOrderDetails />,
//   },
//   {
//     name: 'Inventory',
//     path: '/ecommerce/inventory',
//     element: <EcommerceInventory />,
//   },
{
  name: 'Chat',
  path: '/apps/chat',
  element: <Chat />
}, {
  name: 'Email',
  path: '/apps/email',
  element: <Email />
}, {
  name: 'Schedule',
  path: '/calendar/schedule',
  element: <Schedule />
}, {
  name: 'Integration',
  path: '/calendar/integration',
  element: <Integration />
},
//   {

{
  name: 'Todo',
  path: '/apps/todo',
  element: <Todo />
},
//   {
//     name: 'Social',
//     path: '/apps/social',
//     element: <Social />,
//   },
//   {
//     name: 'Contacts',
//     path: '/apps/contacts',
//     element: <Contacts />,
//   },
{
  name: 'Invoices List',
  path: '/invoices',
  element: <Invoices />
}, {
  name: 'Invoices Details',
  path: '/invoices/:invoiceId',
  element: <InvoiceDetails />
}];
const customRoutes = [{
  name: 'Welcome',
  path: '/pages/welcome',
  element: <Welcome />
}, {
  name: 'FAQs',
  path: '/pages/faqs',
  element: <FAQs />
}, {
  name: 'Timeline',
  path: '/pages/timeline',
  element: <TimelinePage />
}, {
  name: 'Pricing',
  path: '/pages/pricing',
  element: <Pricing />
}, {
  name: 'Error 404 Alt',
  path: '/pages/error-404-alt',
  element: <NotFoundAdmin />
}, {
  name: 'Widgets',
  path: '/widgets',
  element: <Widgets />
}];
const baseUIRoutes = [{
  name: 'Accordions',
  path: '/ui/accordions',
  element: <Accordions />
}, {
  name: 'Alerts',
  path: '/ui/alerts',
  element: <Alerts />
}, {
  name: 'Avatars',
  path: '/ui/avatars',
  element: <Avatars />
}, {
  name: 'Badges',
  path: '/ui/badges',
  element: <Badges />
}, {
  name: 'Breadcrumb',
  path: '/ui/breadcrumb',
  element: <Breadcrumb />
}, {
  name: 'Buttons',
  path: '/ui/buttons',
  element: <Buttons />
}, {
  name: 'Cards',
  path: '/ui/cards',
  element: <Cards />
}, {
  name: 'Carousel',
  path: '/ui/carousel',
  element: <Carousel />
}, {
  name: 'Collapse',
  path: '/ui/collapse',
  element: <Collapse />
}, {
  name: 'Dropdowns',
  path: '/ui/dropdowns',
  element: <Dropdowns />
}, {
  name: 'List Group',
  path: '/ui/list-group',
  element: <ListGroup />
}, {
  name: 'Modals',
  path: '/ui/modals',
  element: <Modals />
}, {
  name: 'Tabs',
  path: '/ui/tabs',
  element: <Tabs />
}, {
  name: 'Offcanvas',
  path: '/ui/offcanvas',
  element: <Offcanvas />
}, {
  name: 'Pagination',
  path: '/ui/pagination',
  element: <Pagination />
}, {
  name: 'Placeholders',
  path: '/ui/placeholders',
  element: <Placeholders />
}, {
  name: 'Popovers',
  path: '/ui/popovers',
  element: <Popovers />
}, {
  name: 'Progress',
  path: '/ui/progress',
  element: <Progress />
}, {
  name: 'Spinners',
  path: '/ui/spinners',
  element: <Spinners />
}, {
  name: 'Toasts',
  path: '/ui/toasts',
  element: <Toasts />
}, {
  name: 'Tooltips',
  path: '/ui/tooltips',
  element: <Tooltips />
}];
const advancedUIRoutes = [{
  name: 'Ratings',
  path: '/advanced/ratings',
  element: <Ratings />
}, {
  name: 'Sweet Alert',
  path: '/advanced/alert',
  element: <SweetAlerts />
}, {
  name: 'Swiper Slider',
  path: '/advanced/swiper',
  element: <Swiper />
}, {
  name: 'Scrollbar',
  path: '/advanced/scrollbar',
  element: <Scrollbar />
}, {
  name: 'Toastify',
  path: '/advanced/toastify',
  element: <Toastify />
}];
const chartsNMapsRoutes = [{
  name: 'Area',
  path: '/charts/area',
  element: <Area />
}, {
  name: 'Bar',
  path: '/charts/bar',
  element: <Bar />
}, {
  name: 'Bubble',
  path: '/charts/bubble',
  element: <Bubble />
}, {
  name: 'Candle Stick',
  path: '/charts/candlestick',
  element: <Candlestick />
}, {
  name: 'Column',
  path: '/charts/column',
  element: <Column />
}, {
  name: 'Heatmap',
  path: '/charts/heatmap',
  element: <Heatmap />
}, {
  name: 'Line',
  path: '/charts/line',
  element: <Line />
}, {
  name: 'Mixed',
  path: '/charts/mixed',
  element: <Mixed />
}, {
  name: 'Timeline',
  path: '/charts/timeline',
  element: <Timeline />
}, {
  name: 'Boxplot',
  path: '/charts/boxplot',
  element: <Boxplot />
}, {
  name: 'Treemap',
  path: '/charts/treemap',
  element: <Treemap />
}, {
  name: 'Pie',
  path: '/charts/pie',
  element: <Pie />
}, {
  name: 'Radar',
  path: '/charts/radar',
  element: <Radar />
}, {
  name: 'Radial Bar',
  path: '/charts/radial-bar',
  element: <RadialBar />
}, {
  name: 'Scatter',
  path: '/charts/scatter',
  element: <Scatter />
}, {
  name: 'Polar Area',
  path: '/charts/polar',
  element: <Polar />
}, {
  name: 'Google',
  path: '/maps/google',
  element: <GoogleMaps />
}, {
  name: 'Vector',
  path: '/maps/vector',
  element: <VectorMaps />
}];
const formsRoutes = [{
  name: 'Basic Elements',
  path: '/forms/basic',
  element: <Basic />
}, {
  name: 'Checkbox & Radio',
  path: '/forms/checkbox',
  element: <Checkbox />
}, {
  name: 'Choice Select',
  path: '/forms/select',
  element: <Select />
}, {
  name: 'Clipboard',
  path: '/forms/clipboard',
  element: <Clipboard />
}, {
  name: 'Flat Picker',
  path: '/forms/flat-picker',
  element: <FlatPicker />
}, {
  name: 'Validation',
  path: '/forms/validation',
  element: <Validation />
}, {
  name: 'Wizard',
  path: '/forms/wizard',
  element: <Wizard />
}, {
  name: 'File Uploads',
  path: '/forms/file-uploads',
  element: <FileUploads />
}, {
  name: 'Editors',
  path: '/forms/editors',
  element: <Editors />
}, {
  name: 'Input Mask',
  path: '/forms/input-mask',
  element: <InputMask />
}, {
  name: 'Slider',
  path: '/forms/slider',
  element: <Slider />
}];
const tableRoutes = [{
  name: 'Basic Tables',
  path: '/tables/basic',
  element: <BasicTable />
}, {
  name: 'Grid JS',
  path: '/tables/gridjs',
  element: <GridjsTable />
}];
const iconRoutes = [{
  name: 'Boxicons',
  path: '/icons/boxicons',
  element: <BoxIcons />
}, {
  name: 'SolarIcon',
  path: '/icons/solaricon',
  element: <SolarIcons />
}];
export const authRoutes = [{
  name: 'Sign In',
  path: '/auth/sign-in',
  element: <AuthSignIn2 />
}, {
  name: 'Dashboard Sign In',
  path: '/dashboard/signIn',
  element: <AuthSignIn2 />
}, {
  name: 'Sign Up',
  path: '/auth/sign-up',
  element: <AuthSignUp2 />
}, {
  name: 'Reset Password',
  path: '/auth/reset-pass',
  element: <ResetPassword2 />
}, {
  name: 'Lock Screen',
  path: '/auth/lock-screen',
  element: <LockScreen2 />
}, {
  name: '404 Error',
  path: '/error-404',
  element: <NotFound />
}, {
  path: '*',
  name: 'not-found',
  element: <NotFound />
}, {
  name: 'Maintenance',
  path: '/maintenance',
  element: <Maintenance />
}];
// IMPORTANT: authRoutes are handled separately in `src/routes/router.jsx`.
// Do NOT include them here, otherwise `/dashboard/signIn` gets guarded and causes redirect loops.
export const appRoutes = [
  ...initialRoutes,
  ...generalRoutes,
  ...appsRoutes,
  ...customRoutes,
  ...baseUIRoutes,
  ...advancedUIRoutes,
  ...chartsNMapsRoutes,
  ...formsRoutes,
  ...tableRoutes,
  ...iconRoutes,
];