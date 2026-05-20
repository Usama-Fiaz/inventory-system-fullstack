import { useEffect } from 'react';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
import useViewPort from '@/hooks/useViewPort';
const HoverMenuToggle = () => {
  const {
    menu: {
      size
    },
    changeMenu: {
      size: changeMenuSize
    }
  } = useLayoutContext();
  const {
    width
  } = useViewPort();
  useEffect(() => {
    // Never fully hide the sidebar. On smaller viewports, collapse it instead.
    if (width <= 1140) {
      if (size === 'default') changeMenuSize('condensed');
    }
  }, [width]);
  const handleHoverMenu = () => {
    // Toggle between expanded and collapsed only
    if (size === 'default') changeMenuSize('condensed');
    else changeMenuSize('default');
  };
  return <button onClick={handleHoverMenu} type="button" className="button-sm-hover" aria-label="Show Full Sidebar">
      <div className="button-sm-hover-icon">
        <IconifyIcon 
          icon={size === 'default' ? 'solar:sidebar-minimalistic-outline' : 'solar:sidebar-minimalistic-bold'} 
          style={{ 
            fontSize: '24px',
            transform: size === 'default' ? 'rotate(180deg)' : 'none',
            transition: 'all 0.3s ease'
          }} 
        />
      </div>
    </button>;
};
export default HoverMenuToggle;