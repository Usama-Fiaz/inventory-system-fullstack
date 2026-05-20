import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllPieCharts from './components/AllPieCharts';
const PieCharts = () => {
  return <>
      <PageMetaData title="Pie Charts" />
      <Row>
        <Col xl={9}>
          <AllPieCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#simple_pie',
          label: 'Simple Pie Chart'
        }, {
          link: '#simple_donut',
          label: 'Simple Donut Chart'
        }, {
          link: '#monochrome',
          label: 'Monochrome Pie Area'
        }, {
          link: '#gradient',
          label: 'Gradient Donut Chart'
        }, {
          link: '#patterned',
          label: 'Patterned Donut Chart'
        }, {
          link: '#image',
          label: 'Pie Chart with Image fill'
        }, {
          link: '#update',
          label: 'Donut Update'
        }]} />
        </Col>
      </Row>
    </>;
};
export default PieCharts;