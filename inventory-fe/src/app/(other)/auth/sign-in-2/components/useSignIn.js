import { yupResolver } from '@hookform/resolvers/yup';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';
import { useAuthContext } from '@/context/useAuthContext';
import { setToken } from '@/lib/jwt';
import { useNotificationContext } from '@/context/useNotificationContext';
import httpClient from '@/helpers/httpClient';

const useSignIn = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { saveSession } = useAuthContext();
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    try {
      if (sessionStorage.getItem('__INVENTORY_SESSION_EXPIRED__')) {
        sessionStorage.removeItem('__INVENTORY_SESSION_EXPIRED__');
        showNotification({
          message: 'Session expired. Please sign in again.',
          variant: 'warning',
        });
      }
    } catch {
      // ignore
    }
  }, [showNotification]);

  const loginFormSchema = yup.object({
    id: yup.string().required('Please enter your admin id'),
    password: yup.string().required('Please enter your password'),
  });
  const {
    control,
    handleSubmit
  } = useForm({
    resolver: yupResolver(loginFormSchema),
    defaultValues: {
      id: 'admin',
      password: 'admin123'
    }
  });
  const redirectUser = () => {
    const redirectLink = searchParams.get('redirectTo');
    if (redirectLink) navigate(redirectLink, { replace: true });
    else navigate('/inventory/dashboard', { replace: true });
  };
  const login = handleSubmit(async values => {
    try {
      setLoading(true);

      const res = await httpClient.post('/auth/login', {
        id: values.id,
        password: values.password,
      });

      if (res.data?.token) {
        setToken(res.data.token);
        saveSession({
          id: res.data.admin?.id,
          admin: res.data.admin,
          token: res.data.token,
        });
        redirectUser();
        showNotification({
          message: 'Successfully signed in.',
          variant: 'success',
        });
        return;
      }
    } catch (e) {
      showNotification({
        message: e?.response?.data?.error || 'Sign in failed. Please try again.',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  });
  return {
    loading,
    login,
    control
  };
};
export default useSignIn;