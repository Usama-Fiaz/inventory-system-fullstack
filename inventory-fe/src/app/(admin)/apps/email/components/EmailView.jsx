import { Col, TabContainer } from 'react-bootstrap';
import ComposeEmailModal from './ComposeEmailModal';
import EmailNavigationMenu from './EmailNavigationMenu';
import EmailTabList from './EmailTabList';
const EmailView = () => {
  return <TabContainer mountOnEnter defaultActiveKey="Inbox">
      <Col xxl={2}>
        <EmailNavigationMenu />
      </Col>
      <Col xxl={10}>
        <EmailTabList />

        <ComposeEmailModal />
      </Col>
    </TabContainer>;
};
export default EmailView;