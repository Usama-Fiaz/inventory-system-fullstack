import { Link } from 'react-router-dom';
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useAuthContext } from '@/context/useAuthContext';

const ProfileDropdown = () => {
  const { removeSession, user } = useAuthContext();
  const adminId = user?.admin?.id ?? user?.id ?? null;
  const initial = (adminId ? String(adminId).trim().charAt(0) : 'A') || 'A';
  return <Dropdown className="topbar-item" align={'end'}>
      <DropdownToggle as="button" type="button" className="topbar-button content-none" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <span className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white" style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: '600' }}>
          {initial.toUpperCase()}
        </span>
      </DropdownToggle>
      <DropdownMenu>
        <DropdownHeader as="h6">Welcome{adminId ? `, ${adminId}` : '!'}</DropdownHeader>
        <DropdownItem as={Link} to="/inventory/settings">
          <IconifyIcon icon="bx:cog" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Settings</span>
        </DropdownItem>
        <DropdownItem disabled className="text-muted opacity-75" style={{ pointerEvents: 'none' }}>
          <IconifyIcon icon="bx:help-circle" className="text-muted fs-18 align-middle me-1" />
          <span className="align-middle">Help</span>
        </DropdownItem>
        <DropdownDivider className="dropdown-divider my-1" />
        <DropdownItem as={Link} onClick={removeSession} className="text-danger" to="/auth/sign-in">
          <IconifyIcon icon="bx:log-out" className="fs-18 align-middle me-1" />
          <span className="align-middle">Logout</span>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>;
};
export default ProfileDropdown;