import { lazy } from 'react';
import { Suspense } from 'react';
import ProfileDropdown from './components/ProfileDropdown';
import ThemeModeToggle from './components/ThemeModeToggle';
import FullScreenToggler from './components/FullScreenToggler';
const Notifications = lazy(() => import('./components/Notifications'));
const TopNavigationBar = () => {
  return <header className="topbar">
      <div className="container-fluid">
        <div className="navbar-header">
          <div className="d-flex align-items-center gap-2" />
          <div className="d-flex align-items-center gap-1">
            {/* Toggle Theme Mode */}
            <ThemeModeToggle />

            {/* Apps Dropdown */}
            <Suspense>
              <FullScreenToggler />
            </Suspense>

            {/* Notification Dropdown */}
            <Suspense>
              <Notifications />
            </Suspense>

            {/* Admin Profile Dropdown */}
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>;
};
export default TopNavigationBar;