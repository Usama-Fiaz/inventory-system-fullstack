import { Card, CardBody, CardTitle, Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import AllEditors from './components/AllEditors';
const Editors = () => {
  return <>
      <PageMetaData title="Editors" />
      <Row>
        <Col xl={12}>
          <Card>
            <CardBody>
              <CardTitle as={'h5'} className="mb-1 anchor" id="overview">
                Overview
                <a className="btn btn-sm btn-outline-success rounded-2 float-end" href="https://quilljs.com/" target="_blank">
                  Official Website
                </a>
              </CardTitle>
              <p className="text-muted mb-3">Quilljs is a lightweight and powerful datetime picker.</p>
            </CardBody>
          </Card>
          <AllEditors />
        </Col>
      </Row>
    </>;
};
export default Editors;