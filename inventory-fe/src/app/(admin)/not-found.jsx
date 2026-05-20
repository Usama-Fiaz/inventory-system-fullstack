import { Link } from 'react-router-dom';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
const NotFound = () => {
  return <div className="container-xxl">
      <Row className="justify-content-center">
        <Col xl={5}>
          <Card>
            <CardBody className="px-3 py-5">
              <div className="p-4">
                <div className="mx-auto mb-4 text-center">
                  <h1 className="mb-3 fw-bold fs-60">404</h1>
                  <h2 className="fs-22 lh-base">Page Not Found !</h2>
                  <p className="text-muted mt-1 mb-4">
                    The page you&apos;re trying to reach seems to have gone <br />
                    missing in the digital wilderness.
                  </p>
                  <div className="text-center">
                    <Link to="/" className="btn btn-success">
                      Back to Home
                    </Link>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>;
};
export default NotFound;