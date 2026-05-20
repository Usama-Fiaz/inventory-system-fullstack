import { Card, CardBody, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LogoBox from '@/components/LogoBox';
import PageMetaData from '@/components/PageTitle';
import ThirdPartyAuth from '@/components/ThirdPartyAuth';
import SignUpForm from './components/SignUpForm';
const SignUp2 = () => {
  return <>
      <PageMetaData title="Sign Up" />

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
            <h2 className="fw-bold text-center fs-18">Sign Up</h2>
            <p className="text-muted text-center mt-1 mb-4">New to our platform? Sign up now! It only takes a minute.</p>
            <div className="px-4">
              <SignUpForm />
              {/* <ThirdPartyAuth /> */}
            </div>
          </CardBody>
        </Card>
        <p className="mb-0 text-center">
          I already have an account
          <Link to="/auth/sign-in-2" className="fw-bold ms-1">
            Sign In
          </Link>
        </p>
      </Col>
    </>;
};
export default SignUp2;