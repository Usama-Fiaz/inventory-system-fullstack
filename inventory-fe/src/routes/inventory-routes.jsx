import { lazy } from 'react';
import { Navigate } from 'react-router-dom';

const InventoryDashboard = lazy(() => import('@/app/(admin)/inventory/dashboard/page'));
const InventoryItems = lazy(() => import('@/app/(admin)/inventory/items/page'));
const InventorySales = lazy(() => import('@/app/(admin)/inventory/sales/page'));
const InventoryReports = lazy(() => import('@/app/(admin)/inventory/reports/page'));
const InventoryInsights = lazy(() => import('@/app/(admin)/inventory/insights/page'));
const InventorySettings = lazy(() => import('@/app/(admin)/inventory/settings/page'));

const NotFoundAdmin = lazy(() => import('@/app/(admin)/not-found'));
const NotFound = lazy(() => import('@/app/(other)/(error-pages)/error-404/page'));

const AuthSignIn2 = lazy(() => import('@/app/(other)/auth/sign-in-2/page'));

export const authRoutes = [
  {
    name: 'Sign In',
    path: '/auth/sign-in',
    element: <AuthSignIn2 />,
  },
  {
    name: '404 Error',
    path: '/error-404',
    element: <NotFound />,
  },
];

export const appRoutes = [
  {
    path: '/',
    name: 'root',
    element: <Navigate to="/inventory/dashboard" />,
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    element: <InventoryDashboard />,
  },
  {
    path: '/inventory/dashboard',
    name: 'Inventory Dashboard',
    element: <InventoryDashboard />,
  },
  {
    path: '/inventory/items',
    name: 'Inventory Items',
    element: <InventoryItems />,
  },
  {
    path: '/inventory/sales',
    name: 'Inventory Sales',
    element: <InventorySales />,
  },
  {
    path: '/inventory/reports',
    name: 'Inventory Reports',
    element: <InventoryReports />,
  },
  {
    path: '/inventory/insights',
    name: 'Inventory Insights',
    element: <InventoryInsights />,
  },
  {
    path: '/inventory/settings',
    name: 'Settings',
    element: <InventorySettings />,
  },
  {
    path: '*',
    name: 'not-found-admin',
    element: <NotFoundAdmin />,
  },
];
