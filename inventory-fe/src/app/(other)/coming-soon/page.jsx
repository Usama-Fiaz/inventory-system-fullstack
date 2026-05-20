import { Card, CardBody, Col } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';

const ComingSoon = () => {
  return (
    <>
      <PageMetaData title="Coming Soon" />
      <Col lg={8} className="mx-auto">
        <Card className="border-0 shadow-sm">
          <CardBody className="text-center py-5">
            <h2 className="fw-bold text-uppercase mb-3">We Are Launching Soon...</h2>
            <p className="lead text-muted w-75 mx-auto mb-0 fst-italic">
              Exciting news is on the horizon! We're thrilled to announce that something incredible is coming your way very soon.
            </p>
          </CardBody>
        </Card>
      </Col>
    </>
  );
};
export default ComingSoon;