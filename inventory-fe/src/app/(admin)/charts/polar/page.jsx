import { Col, Row } from 'react-bootstrap';
import UIExamplesList from '@/components/UIExamplesList';
import AllPolarAreaCharts from './components/AllPolarAreaCharts';
import PageMetaData from '@/components/PageTitle';
const PolarAreaCharts = () => {
  return <>
      <PageMetaData title="Polar Area Charts" />

      <Row>
        <Col xl={9}>
          <AllPolarAreaCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#basic',
          label: 'Basic Polar Area Chart'
        }, {
          link: '#monochrome',
          label: 'Monochrome Polar Area'
        }]} />
        </Col>
      </Row>
    </>;
};
export default PolarAreaCharts;