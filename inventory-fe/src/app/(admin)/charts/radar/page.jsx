import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllRadarCharts from './components/AllRadarCharts';
const RadarCharts = () => {
  return <>
      <PageMetaData title="Radar Charts" />

      <Row>
        <Col xl={9}>
          <AllRadarCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          label: 'Basic Radar Chart',
          link: '#basic'
        }, {
          label: 'Radar with Polygon-fill',
          link: '#polygon'
        }, {
          label: 'Radar – Multiple Series',
          link: '#multiple-series'
        }]} />
        </Col>
      </Row>
    </>;
};
export default RadarCharts;