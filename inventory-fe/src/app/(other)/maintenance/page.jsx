import { Card, CardBody, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LogoBox from '@/components/LogoBox';
import PageMetaData from '@/components/PageTitle';
import signInImg from '@/assets/images/404.svg';
const Maintenance = () => {
  return <>
      <PageMetaData title="Maintenance" />

      <Card className="auth-card">
        <CardBody className="p-0">
          <Row className="align-items-center g-0">
            <Col lg={6} className="d-none d-lg-inline-block border-end">
              <div className="auth-page-sidebar">
                <img width={521} height={521} src={signInImg} alt="auth" className="img-fluid" />
              </div>
            </Col>
            <Col lg={6}>
              <div className="p-4">
                <div className="mx-auto mb-4 text-center auth-logo">
                  <LogoBox textLogo={{
                  height: 24,
                  width: 110
                }} squareLogo={{
                  className: 'me-1',
                  width: 33,
                  height: 28
                }} />
                </div>
                <h2 className="fw-bold text-center lh-base">We are currently performing maintenance</h2>
                <p className="text-muted text-center mt-1 mb-4">We&apos;re making the system more awesome. We&apos;ll be back shortly.</p>
                <div className="text-center">
                  <Link to="/pages/contact-us" className="btn btn-success">
                    Contact Us
                  </Link>
                </div>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>
    </>;
};
export default Maintenance;