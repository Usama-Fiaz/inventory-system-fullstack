import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import { Col, Row } from 'react-bootstrap';
import AllCandlestickCharts from './components/AllCandlestickCharts';
const CandlestickCharts = () => {
  return <>
      <PageMetaData title="Candlestick Charts" />

      <Row>
        <Col xl={9}>
          <AllCandlestickCharts />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#simple',
          label: 'Simple Candlestick Chart'
        }, {
          link: '#x-axis',
          label: 'Category X-Axis'
        }, {
          link: '#line',
          label: 'Candlestick with Line'
        }]} />
        </Col>
      </Row>
    </>;
};
export default CandlestickCharts;