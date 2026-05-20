import { Button, Card, CardBody, Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { currency } from '@/context/constants';
import { getAllPricingPlans } from '@/helpers/data';
import { useEffect, useState } from 'react';
const PricingCard = ({
  plan
}) => {
  const {
    features,
    name,
    price,
    isPopular,
    subscribed
  } = plan;
  return <Card className="card-pricing">
      <CardBody>
        {isPopular && <div className="pricing-ribbon pricing-ribbon-primary float-end">Popular</div>}
        <h5 className="mt-0 mb-3 fs-14 text-uppercase fw-semibold">{name}</h5>
        <h2 className="mt-0 mb-3 fw-bold">
          {currency}
          {price}&nbsp;
          <span className="fs-14 fw-medium text-muted">/ Month</span>
        </h2>
        <ul className="card-pricing-features text-muted border-top pt-2 mt-2 ps-0 list-unstyled">
          {features.map((feature, idx) => <li className="text-dark" key={idx}>
              <span className="icons-center">
                <IconifyIcon icon="bx:check-circle" className="text-primary fs-15 me-1" />
                {feature}
              </span>
            </li>)}
        </ul>
        <div className="mt-4 text-center">
          <Button variant="primary" disabled={subscribed ? true : false} className="px-sm-4 w-100">
            {subscribed ? 'Current Plan' : 'Get Started'}
          </Button>
        </div>
      </CardBody>
    </Card>;
};
const Pricing = () => {
  const [pricingPlans, setPricingPlans] = useState();
  useEffect(() => {
    ;
    (async () => {
      const data = await getAllPricingPlans();
      setPricingPlans(data);
    })();
  }, []);
  return <>
      <PageMetaData title="Pricing" />

      <div className="container-xxl">
        <Row>
          <Col xs={12}>
            <div className="text-center my-4">
              <h3>Simple Pricing Plans</h3>
              <p className="text-muted text-center">Get the power and control you need to manage your organization&apos;s technical documentation</p>
            </div>
            <Row className="justify-content-center">
              {pricingPlans && pricingPlans.map((plan, idx) => <Col lg={3} key={idx}>
                    <PricingCard plan={plan} />
                  </Col>)}
            </Row>
          </Col>
        </Row>
      </div>
    </>;
};
export default Pricing;