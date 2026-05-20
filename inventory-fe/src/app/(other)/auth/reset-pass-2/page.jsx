import { Card, CardBody, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LogoBox from '@/components/LogoBox';
import PageMetaData from '@/components/PageTitle';
import ResetPassForm from './components/ResetPassForm';
const ResetPassword2 = () => {
  return <>
      <PageMetaData title="Reset Password" />

      <Col xl={5} className="mx-auto">
        <Card className="auth-card">
          <CardBody className="px-3 py-5">
            <LogoBox textLogo={{
            height: 24,
            width: 110
          }} squareLogo={{
            className: 'me-2',
            width: 33,
            height: 28
          }} containerClassName="mx-auto mb-4 text-center auth-logo" />
            <h2 className="fw-bold text-center fs-18">Reset Password</h2>
            <p className="text-muted text-center mt-1 mb-4">
              Enter your email address and we&apos;ll send you an email with instructions to reset your password.
            </p>
            <div className="px-4">
              <ResetPassForm />
            </div>
          </CardBody>
        </Card>
        <p className="mb-0 text-center">
          Back to&nbsp;
          <Link to="/auth/sign-in" className="fw-bold ms-1">
            Sign In
          </Link>
        </p>
      </Col>
    </>;
};
export default ResetPassword2;