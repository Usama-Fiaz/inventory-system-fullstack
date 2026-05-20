import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllClipboards from './components/AllClipboards';
const Clipboard = () => {
  return <>
      <PageMetaData title="Clipboard" />

      <Row>
        <Col xl={9}>
          <AllClipboards />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#copy-from-element',
          label: 'Copy text from another element'
        }, {
          link: '#cut-from-element',
          label: 'Cut text from another element'
        }, {
          link: '#copy-from-attribute',
          label: 'Copy text from attribute'
        }]} />
        </Col>
      </Row>
    </>;
};
export default Clipboard;