import { Card, CardBody, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LogoBox from '@/components/LogoBox';
import PageMetaData from '@/components/PageTitle';
import LoginForm from './components/LoginForm';
import { useLayoutContext } from '@/context/useLayoutContext';

const SignIn2 = () => {
  const { theme } = useLayoutContext();
  const isDark = theme === 'dark';

  return (
    <>
      <PageMetaData title="Sign In" />

      <Col xl={5} lg={5} md={6} className="mx-auto mt-2">
        <LogoBox containerClassName="mx-auto mb-4 text-center auth-logo" />
        
        <Card
          className="auth-card border-0 overflow-hidden"
          style={{
            borderRadius: 20,
            background: isDark 
              ? '#0f172a' 
              : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(226, 232, 240, 1)'}`,
            boxShadow: isDark 
              ? '0 25px 50px -12px rgba(2, 6, 23, 0.8)' 
              : '0 10px 15px -3px rgba(15, 23, 42, 0.05)',
            transition: 'all 0.3s ease',
          }}
        >
          <div
            aria-hidden
            style={{
              height: 4,
              background: '#3b82f6',
              opacity: isDark ? 0.8 : 1,
            }}
          />
          <CardBody className="p-4 p-sm-5">
            <div className="text-center mb-4">
              <h2
                className="fw-bold fs-3 mb-2"
                style={{
                  color: isDark ? '#f8fafc' : '#0f172a',
                  letterSpacing: '-0.02em',
                }}
              >
                Welcome
              </h2>
            </div>
            
            <LoginForm />
          </CardBody>
        </Card>

        <div className="mt-4 text-center">
          <p className="mb-0 small" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
            Restricted access system. Unauthorized entry is prohibited.
          </p>
          <p className="mt-2 small">
            <span style={{ color: isDark ? '#4b5563' : '#94a3b8' }}>New operator?</span>{' '}
            <Link 
              to="/auth/sign-up-2" 
              className="fw-semibold text-decoration-none"
              style={{ color: '#3b82f6' }}
            >
              Request Access
            </Link>
          </p>
        </div>
      </Col>
    </>
  );
};
export default SignIn2;