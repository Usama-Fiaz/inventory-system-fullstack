import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import { getAllDataTableRecords } from '@/helpers/data';
import { useEffect, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import AllDataTables from './components/AllDataTables';
const GridJS = () => {
  const [dataTableRecords, setDataTableRecords] = useState();
  useEffect(() => {
    ;
    (async () => {
      const data = await getAllDataTableRecords();
      setDataTableRecords(data);
    })();
  }, []);
  return <>
      <PageMetaData title="GridJs" />
      <Row>
        <Col xl={10}>{dataTableRecords && <AllDataTables dataTableRecords={dataTableRecords} />}</Col>
        <Col xl={2}>
          {dataTableRecords && <UIExamplesList examples={[{
          link: '#overview',
          label: 'Overview'
        }, {
          link: '#basic',
          label: 'Basic'
        }, {
          link: '#pagination',
          label: 'Pagination'
        }, {
          link: '#search',
          label: 'Search'
        }, {
          link: '#sorting',
          label: 'Sorting'
        }, {
          link: '#loading_state',
          label: 'Loading State'
        }, {
          link: '#fixed_header',
          label: 'Fixed Header'
        }, {
          link: '#hidden_column',
          label: 'Hidden Columns'
        }]} />}
        </Col>
      </Row>
    </>;
};
export default GridJS;