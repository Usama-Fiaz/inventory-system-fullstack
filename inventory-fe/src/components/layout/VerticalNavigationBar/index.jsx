import { lazy, Suspense } from 'react';
import FallbackLoading from '@/components/FallbackLoading';
import LogoBox from '@/components/LogoBox';
import SimplebarReactClient from '@/components/wrappers/SimplebarReactClient';
import { getMenuItems } from '@/helpers/menu';
import HoverMenuToggle from './components/HoverMenuToggle';
import { Link } from 'react-router-dom';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useAuthContext } from '@/context/useAuthContext';
const AppMenu = lazy(() => import('./components/AppMenu'));
const VerticalNavigationBar = () => {
  const menuItems = getMenuItems();
  const { removeSession } = useAuthContext();
  return <div className="main-nav" id="leftside-menu-container">
      <LogoBox containerClassName="logo-box" squareLogo={{
      className: 'logo-sm',
      height: 24,
      width: 26
    }} textLogo={{
      className: 'logo-lg',
      height: 15,
      width: 68
    }} />

      <HoverMenuToggle />

      <SimplebarReactClient className="scrollbar" style={{ paddingBottom: 112 }}>
        <Suspense fallback={<FallbackLoading />}>
          <AppMenu menuItems={menuItems} />
        </Suspense>
      </SimplebarReactClient>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '10px',
          borderTop: '1px solid rgba(148, 163, 184, 0.16)',
          background: 'inherit',
        }}
      >
        <ul className="navbar-nav">
          <li className="nav-item">
            <Link to="/inventory/settings" className="nav-link">
              <span className="nav-icon">
                <IconifyIcon icon="solar:settings-broken" />
              </span>
              <span className="nav-text">Settings</span>
            </Link>
          </li>
          <li className="nav-item">
            <button
              type="button"
              onClick={removeSession}
              className="nav-link w-100 text-start"
              style={{ background: 'transparent', border: 'none' }}
            >
              <span className="nav-icon">
                <IconifyIcon icon="bx:log-out" />
              </span>
              <span className="nav-text">Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </div>;
};
export default VerticalNavigationBar;