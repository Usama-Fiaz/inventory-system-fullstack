import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '@/context/useAuthContext';
import { LayoutProvider } from '@/context/useLayoutContext';
import { NotificationProvider } from '@/context/useNotificationContext';

const AppProvidersWrapper = ({
  children
}) => {
  return <AuthProvider>
      <LayoutProvider>
        <NotificationProvider>
          {children}
          <ToastContainer theme="colored" />
        </NotificationProvider>
      </LayoutProvider>
    </AuthProvider>;
};
export default AppProvidersWrapper;