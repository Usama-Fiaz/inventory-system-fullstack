import { Card, CardBody, CardTitle, Col, Row } from 'react-bootstrap';
import { IntegrationData } from './data';
import PageMetaData from '@/components/PageTitle';
const IntegrationCard = ({
  integration
}) => {
  const {
    description,
    image,
    name,
    enable
  } = integration;
  return <Card className="card-height-100">
      <CardBody>
        <div className="float-end">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" id="googleMailSwitch" defaultChecked={enable} />
          </div>
        </div>
        <img src={image} alt={name} className="img-fluid avatar-sm" />
        <CardTitle as={'h5'} className="mt-3 mb-2">
          {name}
        </CardTitle>
        <p className="mb-0">{description}</p>
      </CardBody>
    </Card>;
};
const Integration = () => {
  return <>
      <PageMetaData title="Integrations" />

      <Row className="row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 gx-3">
        {IntegrationData.map((integration, idx) => <Col key={idx}>
            <IntegrationCard integration={integration} />
          </Col>)}
      </Row>
    </>;
};
export default Integration;