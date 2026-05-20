import PasswordFormInput from '@/components/form/PasswordFormInput';
import TextFormInput from '@/components/form/TextFormInput';
import { Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useLayoutContext } from '@/context/useLayoutContext';
import useSignIn from './useSignIn';

const LoginForm = () => {
  const { loading, login, control } = useSignIn();
  const { theme } = useLayoutContext();
  const isDark = theme === 'dark';

  const inputStyle = {
    background: isDark ? '#1e293b' : '#f8fafc',
    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    color: isDark ? '#f1f5f9' : '#0f172a',
    borderRadius: 10,
    fontSize: 14,
    padding: '10px 14px',
    transition: 'all 0.15s ease-in-out',
    boxShadow: isDark ? 'inset 0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none',
  };

  const labelStyle = {
    color: isDark ? '#94a3b8' : '#64748b',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginBottom: 6,
  };

  return (
    <form className="authentication-form" onSubmit={login}>
      <TextFormInput
        control={control}
        name="id"
        containerClassName="mb-3"
        label={<label style={labelStyle}>Admin ID</label>}
        id="identifier-id"
        placeholder="Enter admin id"
        autoComplete="off"
        style={inputStyle}
      />
      <PasswordFormInput
        control={control}
        name="password"
        containerClassName="mb-3"
        placeholder="••••••••"
        id="password-id"
        autoComplete="new-password"
        className="auth-password-mask-placeholder"
        label={
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label style={labelStyle} htmlFor="password-id">Password</label>
            <Link to="/auth/reset-pass" className="small text-decoration-none fw-semibold" style={{ color: '#3b82f6', fontSize: 11 }}>
              Forgot Password
            </Link>
          </div>
        }
        style={inputStyle}
      />
      
      {/* Remember session removed per design */}

      <Button 
        variant="primary" 
        type="submit" 
        disabled={loading} 
        className="w-100 fw-bold py-2 border-0 shadow-lg"
        style={{
          background: '#3b82f6',
          borderRadius: 10,
          boxShadow: isDark ? '0 8px 24px -6px rgba(59, 130, 246, 0.4)' : '0 8px 16px -4px rgba(59, 130, 246, 0.25)',
          fontSize: 15,
          letterSpacing: '0.01em',
        }}
      >
        {loading ? (
          <span className="d-inline-flex align-items-center gap-2">
            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
            <span>Verifying...</span>
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
};
export default LoginForm;