import { Link } from 'react-router-dom';
import { Card, CardBody } from 'react-bootstrap';
import LogoBox from '@/components/LogoBox';
import notFound from '@/assets/images/404.svg';
const Error404 = () => {
  return <div className="mx-auto col-xl-6">
      <Card className="auth-card">
        <CardBody className="p-0">
          <div className="p-4">
            <div className="mx-auto mb-4 text-center">
              <LogoBox textLogo={{
              height: 24,
              width: 110
            }} squareLogo={{
              className: 'me-2',
              width: 33,
              height: 28
            }} containerClassName="mx-auto text-center auth-logo" />
              <img src={notFound} height={250} alt="auth" className="mt-5 mb-3" />
              {/* <h1 className="mt-5 mb-3 fw-bold fs-60">404</h1> */}
              <h2 className="fs-22 lh-base">Page Not Found !</h2>
              <p className="text-muted mt-1 mb-4">
                The page you&apos;re trying to reach seems to have gone
                <br />
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
    </div>;
};
export default Error404;