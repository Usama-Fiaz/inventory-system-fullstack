import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllHeatmapCharts from './components/AllHeatmapCharts';
const HeatmapCharts = () => {
  return <>
      <PageMetaData title="Heatmap Charts" />

      <Row>
        <Col xl={9}>
          <AllHeatmapCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#basic',
          label: 'Basic Heatmap - Single Series'
        }, {
          link: '#multiple-series',
          label: 'Heatmap - Multiple Series'
        }, {
          link: '#color-range',
          label: 'Heatmap - Color Range'
        }, {
          link: '#rounded',
          label: 'Heatmap - Range without Shades'
        }]} />
        </Col>
      </Row>
    </>;
};
export default HeatmapCharts;