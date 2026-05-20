import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllFormValidation from './components/AllFormValidation';
const Validation = () => {
  return <>
      <PageMetaData title="Validation" />

      <Row>
        <Col xl={9}>
          <AllFormValidation />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#browser-defaults',
          label: 'Browser Defaults'
        }, {
          link: '#custom-styles',
          label: 'Custom Styles'
        }, {
          link: '#server-side',
          label: 'Server side'
        }, {
          link: '#supported-elements',
          label: 'Supported Elements'
        }, {
          link: '#tooltips',
          label: 'Tooltips'
        }]} />
        </Col>
      </Row>
    </>;
};
export default Validation;