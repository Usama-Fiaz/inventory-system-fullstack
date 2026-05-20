import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useLayoutContext } from '@/context/useLayoutContext';
const ThemeModeToggle = () => {
  const {
    theme,
    changeTheme
  } = useLayoutContext();
  const isDark = theme === 'dark';
  return <div className="topbar-item">
      <button onClick={() => changeTheme(isDark ? 'light' : 'dark')} className="topbar-button" type="button">
        {isDark ? <IconifyIcon icon="solar:sun-bold" className="fs-24 align-middle" /> : <IconifyIcon icon="solar:moon-bold" className="fs-24 align-middle" />}
      </button>
    </div>;
};
export default ThemeModeToggle;