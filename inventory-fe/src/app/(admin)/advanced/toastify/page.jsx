import { Card, CardBody, CardTitle, Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import UIExamplesList from '@/components/UIExamplesList';
import AllToastify from './AllToastify';
const Toastify = () => {
  return <>
      <PageMetaData title="Toastify" />
      <Row>
        <Col xl={9}>
          <Card>
            <CardBody>
              <CardTitle as={'h5'} className="mb-1 anchor" id="overview">
                Overview
                <a className="btn btn-sm btn-outline-success rounded-2 float-end" href="https://www.npmjs.com/package/react-toastify" target="_blank">
                  Official Website
                </a>
              </CardTitle>
              <p className="text-muted mb-3">Better notification messages</p>
              <h5 className="mt-2">Usage</h5>
              <p className="mb-0">React Toastify&apos;s css needs to be imported when using the Toastify component</p>
            </CardBody>
          </Card>
          <AllToastify />
        </Col>
        <Col xl={3}>
          <UIExamplesList examples={[{
          link: '#overview',
          label: 'Overview'
        }, {
          link: '#basic',
          label: 'Basic'
        }, {
          link: '#display_position',
          label: 'Display Position Example'
        }, {
          link: '#rater',
          label: 'Offset, Close Button & Duration'
        }]} />
        </Col>
      </Row>
    </>;
};
export default Toastify;