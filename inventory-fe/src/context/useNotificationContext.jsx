import { createContext, useContext, useState } from 'react';
import { ToastBody, ToastHeader } from 'react-bootstrap';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
const NotificationContext = createContext(undefined);
function Toastr({
  show,
  title,
  message,
  onClose,
  variant = 'light',
  delay
}) {
  if (!show || !message) return null;

  const theme =
    variant === 'success'
      ? {
          text: '#065f46',
          icon: '✓',
          border: '#86efac',
          bg: 'rgba(236, 253, 245, 0.96)',
        }
      : variant === 'danger'
        ? {
            text: '#991b1b',
            icon: '!',
            border: '#fca5a5',
            bg: 'rgba(254, 242, 242, 0.96)',
          }
        : variant === 'warning'
          ? {
              text: '#92400e',
              icon: '!',
              border: '#fcd34d',
              bg: 'rgba(255, 251, 235, 0.96)',
            }
          : {
              text: '#1e3a8a',
              icon: 'i',
              border: '#93c5fd',
              bg: 'rgba(239, 246, 255, 0.96)',
            };

  return <ToastContainer className="position-fixed start-50 translate-middle-x mt-3" style={{ zIndex: 1080 }}>
      <Toast
        delay={delay}
        show={show}
        onClose={onClose}
        autohide
        className="border-0"
        style={{
          minWidth: 320,
          borderRadius: 12,
          background: theme.bg,
          boxShadow: '0 10px 24px rgba(15, 23, 42, 0.14)',
          borderLeft: `4px solid ${theme.border}`,
          backdropFilter: 'blur(6px)',
        }}
      >
        <ToastBody className="d-flex align-items-start" style={{ color: theme.text }}>
          <div className="d-flex flex-column min-w-0" style={{ lineHeight: 1.35 }}>
            {title || variant !== 'light' ? (
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.02em' }}>
                {title || (variant === 'success' ? 'Success' : variant === 'danger' ? 'Error' : variant === 'warning' ? 'Notice' : '')}
              </span>
            ) : null}
            <span style={{ fontSize: 13, fontWeight: 500 }}>{message}</span>
          </div>
        </ToastBody>
      </Toast>
    </ToastContainer>;
}
export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within an NotificationProvider');
  }
  return context;
}
export function NotificationProvider({
  children
}) {
  const defaultConfig = {
    show: false,
    message: '',
    title: '',
    delay: 2000
  };
  const [config, setConfig] = useState(defaultConfig);
  const hideNotification = () => {
    setConfig({
      show: false,
      message: '',
      title: ''
    });
  };
  const showNotification = ({
    title,
    message,
    variant,
    delay = 2000
  }) => {
    setConfig({
      show: true,
      title,
      message,
      variant: variant ?? 'light',
      onClose: hideNotification,
      delay
    });
    setTimeout(() => {
      setConfig(defaultConfig);
    }, delay);
  };
  return <NotificationContext.Provider value={{
    showNotification
  }}>
      <Toastr {...config} />
      {children}
    </NotificationContext.Provider>;
}