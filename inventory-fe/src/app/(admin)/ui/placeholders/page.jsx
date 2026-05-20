import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllPlaceholders from './components/AllPlaceholders';
const PLaceholders = () => {
  return <>
      <PageMetaData title="Placeholder" />

      <Row>
        <Col xl={9}>
          <AllPlaceholders />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#default',
          label: 'Overview'
        }, {
          link: '#how-works',
          label: 'How it works'
        }, {
          link: '#width',
          label: 'Width'
        }, {
          link: '#color',
          label: 'Color'
        }]} />
        </Col>
      </Row>
    </>;
};
export default PLaceholders;