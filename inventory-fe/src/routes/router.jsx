import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AuthLayout from '@/layouts/AuthLayout';
import { useAuthContext } from '@/context/useAuthContext';
import { appRoutes, authRoutes } from '@/routes/inventory-routes';
import AdminLayout from '@/layouts/AdminLayout';
const AppRouter = props => {
  const {
    isAuthenticated
  } = useAuthContext();
  const location = useLocation();
  return <Routes>
      {(authRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path} element={<AuthLayout {...props}>{route.element}</AuthLayout>} />)}

      {(appRoutes || []).map((route, idx) => <Route key={idx + route.name} path={route.path}       element={isAuthenticated ? <AdminLayout {...props}>{route.element}</AdminLayout> : (() => {
      const search = new URLSearchParams();
      search.set('redirectTo', location.pathname + location.search);
      const jobId = new URLSearchParams(location.search).get('job_id') ?? new URLSearchParams(location.search).get('jobId');
      if (jobId) search.set('job_id', jobId);
      return <Navigate to={{ pathname: '/auth/sign-in', search: '?' + search.toString() }} />;
    })()} />)}
    </Routes>;
};
export default AppRouter;