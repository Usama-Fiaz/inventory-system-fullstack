import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllTreemapCharts from './components/AllTreemapCharts';
const TreemapCharts = () => {
  return <>
      <PageMetaData title="Treemap Charts" />

      <Row>
        <Col xl={9}>
          <AllTreemapCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#basic',
          label: 'Basic'
        }, {
          link: '#multiple',
          label: 'Treemap Multiple Series'
        }, {
          link: '#distributed',
          label: 'Distributed Treemap'
        }, {
          link: '#color-range',
          label: 'Color Range Treemap'
        }]} />
        </Col>
      </Row>
    </>;
};
export default TreemapCharts;