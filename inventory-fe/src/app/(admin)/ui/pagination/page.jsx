import { Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllPagination from './components/AllPagination';
const Pagination = () => {
  return <>
      <PageMetaData title="Pagination" />

      <Row>
        <Col xl={9}>
          <AllPagination />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#default-buttons',
          label: 'Default Pagination'
        }, {
          link: '#rounded-pagination',
          label: 'Rounded Pagination'
        }, {
          link: '#alignment',
          label: 'Alignment'
        }, {
          link: '#sizing',
          label: 'Sizing'
        }]} />
        </Col>
      </Row>
    </>;
};
export default Pagination;