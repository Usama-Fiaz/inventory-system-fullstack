import { Suspense } from 'react';
import { Container, Row } from 'react-bootstrap';
import Preloader from '@/components/Preloader';
import ThemeModeToggle from '@/components/layout/TopNavigationBar/components/ThemeModeToggle';
import { useLayoutContext } from '@/context/useLayoutContext';

const AuthLayout = ({ children }) => {
  const { theme } = useLayoutContext();
  const isDark = theme === 'dark';

  return (
    <div 
      className="authentication-bg" 
      style={{
        background: isDark ? '#020617' : '#f8fafc',
        backgroundImage: isDark 
          ? 'radial-gradient(at 0% 0%, rgba(15, 23, 42, 0.4) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(15, 23, 42, 0.3) 0px, transparent 50%)'
          : 'radial-gradient(at 0% 0%, rgba(241, 245, 249, 0.8) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(241, 245, 249, 0.6) 0px, transparent 50%)',
        minHeight: '100vh',
        transition: 'background-color 0.3s ease',
      }}
    >
      {/* Theme mode toggle */}
      <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 10 }}>
        <ThemeModeToggle />
      </div>

      <div className="account-pages pt-5 pb-4">
        <Container>
          <Row className="justify-content-center">
            <Suspense fallback={<Preloader />}>{children}</Suspense>
          </Row>
        </Container>
      </div>

      <style>
        {`
          .auth-form-check .form-check-input {
            background-color: ${isDark ? '#1e293b' : '#f8fafc'};
            border-color: ${isDark ? '#334155' : '#e2e8f0'};
            cursor: pointer;
          }
          .auth-form-check .form-check-input:checked {
            background-color: #3b82f6;
            border-color: #3b82f6;
          }
          .form-control::placeholder {
            color: ${isDark ? '#4b5563' : '#94a3b8'} !important;
            opacity: 1;
            font-size: 13px;
          }
          .form-control:focus {
            background-color: ${isDark ? '#1e293b' : '#ffffff'} !important;
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px ${isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)'} !important;
          }
        `}
      </style>
    </div>
  );
};
export default AuthLayout;