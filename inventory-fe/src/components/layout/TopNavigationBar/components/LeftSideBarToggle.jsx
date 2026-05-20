import { useEffect, useRef } from 'react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
import { useLocation } from 'react-router-dom';
const LeftSideBarToggle = () => {
  const {
    menu: {
      size
    },
    changeMenu: {
      size: changeMenuSize
    },
    toggleBackdrop
  } = useLayoutContext();
  const {
    pathname
  } = useLocation();
  const isFirstRender = useRef(true);
  const handleMenuSize = () => {
    // Only allow expanded/collapsed. Never set 'hidden' from the topbar toggle.
    if (size === 'condensed') changeMenuSize('default');
    else changeMenuSize('condensed');
  };
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
  }, [pathname]);
  return <div className="topbar-item">
      <button onClick={handleMenuSize} type="button" className="button-toggle-menu topbar-button" style={{ display: 'block' }}>
        <IconifyIcon icon="tabler:menu-2" className="fs-22" />
      </button>
    </div>;
};
export default LeftSideBarToggle;