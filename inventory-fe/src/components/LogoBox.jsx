import { Link } from 'react-router-dom';
import { useLayoutContext } from '@/context/useLayoutContext';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const LogoBox = ({ containerClassName }) => {
  const {
    menu: { size, theme: menuTheme },
    changeMenu: { size: changeMenuSize },
    theme
  } = useLayoutContext();
  const { pathname } = useLocation();
  const isAuthPage = pathname?.startsWith('/auth/') || pathname === '/auth/sign-in';
  // Auth page: use main theme. Sidebar: use menu theme (sidebar can be dark even in light mode)
  const logoColor = isAuthPage
    ? (theme === 'dark' ? '#ffffff' : '#323a46')
    : (menuTheme === 'dark' ? '#ffffff' : '#323a46');
  const logoStyle = {
    fontFamily: 'Satoshi, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: 600,
    color: logoColor,
    letterSpacing: '0.3px',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  };
  const isFirstRender = useRef(true);

  const handleMenuSize = () => {
    // Only allow expanded/collapsed. Never set 'hidden' from the logo area.
    if (size === 'condensed') changeMenuSize('default');
    else changeMenuSize('condensed');
  };

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
  }, [pathname]);

  const isCollapsed = size === 'condensed';

  return (
    <div className={containerClassName ?? ''}>
      <div
        className="logo-wrapper"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 12px 8px',
          position: 'relative',
          flexDirection: isCollapsed ? 'column' : 'row',
          gap: isCollapsed ? '8px' : '0',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}
      >
        {/* LOGO */}
        <Link
          to="/"
          className="logo-link d-flex align-items-center justify-content-center"
          style={{
            textDecoration: 'none',
            maxWidth: isAuthPage
              ? '100%'
              : isCollapsed
                ? '100%'
                : 'calc(100% - 48px)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            ...(isCollapsed ? { order: 1 } : { position: 'absolute', left: '50%', transform: 'translateX(-50%)' })
          }}
        >
          {isAuthPage ? (
            <span
              className="logo-lg"
              title="Abdullah Store Management System"
              style={{
                ...logoStyle,
                fontSize: 'clamp(18px, 3vw, 28px)',
                fontWeight: 700,
                display: 'inline-block',
                maxWidth: '100%'
              }}
            >
              Abdullah Store Management System
            </span>
          ) : (
            <>
              <span className="logo-sm" style={{ ...logoStyle, fontSize: '22px', fontWeight: 700 }}>A</span>
              {!isCollapsed && (
                <span
                  className="logo-lg"
                  title="Abdullah Store Management System"
                  style={{ ...logoStyle, fontSize: '16px', marginLeft: '6px', display: 'inline-block', maxWidth: '100%' }}
                >
                  Abdullah Store
                </span>
              )}
            </>
          )}
        </Link>

        {/* HAMBURGER - hidden on auth/login pages */}
        {!isAuthPage && (
          <button
            onClick={handleMenuSize}
            type="button"
            className="button-toggle-menu btn-menu-toggle"
            style={{
              background: 'transparent',
              border: 'none',
              color: menuTheme === 'dark' ? '#afb9cf' : '#5d7186',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'all 0.3s ease',
              ...(isCollapsed ? { order: 2 } : { marginLeft: 'auto' })
            }}
          >
            <IconifyIcon 
              icon={isCollapsed ? 'solar:sidebar-minimalistic-bold' : 'solar:sidebar-minimalistic-outline'} 
              style={{ 
                fontSize: '22px',
                transform: isCollapsed ? 'none' : 'rotate(180deg)',
                transition: 'all 0.3s ease'
              }} 
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default LogoBox;