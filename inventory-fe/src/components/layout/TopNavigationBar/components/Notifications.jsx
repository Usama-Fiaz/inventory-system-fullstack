import { useState, useEffect } from 'react';
import { Dropdown, DropdownHeader, DropdownItem, DropdownMenu, DropdownToggle } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getNotifications } from '@/helpers/data';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const raw = getNotifications();
    const resolved = raw.map((item) => ({
      ...item,
      from: item.from === 'user' ? 'You' : item.from === 'company' ? 'Abdullah Store' : item.from,
    }));
    setNotifications(resolved);
  }, []);

  return (
    <Dropdown className="topbar-item" align="end">
      <DropdownToggle as="button" type="button" className="topbar-button content-none" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
        <IconifyIcon icon="solar:bell-outline" className="fs-24 align-middle" />
      </DropdownToggle>
      <DropdownMenu>
        <DropdownHeader as="h6">Notifications</DropdownHeader>
        {notifications.length === 0 ? (
          <DropdownItem as="div" className="text-muted text-center py-3">
            No new notifications
          </DropdownItem>
        ) : (
          notifications.map((item, idx) => (
            <DropdownItem key={idx} as="div" className="py-2">
              <div className="d-flex flex-column">
                <span className="fw-medium">{item.from}</span>
                <span className="text-muted small">{item.content}</span>
              </div>
            </DropdownItem>
          ))
        )}
      </DropdownMenu>
    </Dropdown>
  );
};

export default Notifications;
