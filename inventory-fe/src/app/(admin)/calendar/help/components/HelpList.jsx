import { helpData } from '../data';
import { Col, Row } from 'react-bootstrap';
const HelpCard = ({
  help
}) => {
  return <div className="text-center">
      <img src={help.image} alt="help-1" className="img-fluid avatar-md mb-3" />
      <h4 className="fw-semibold">{help.title}</h4>
      <p className="px-2 px-xl-5">{help.description}</p>
    </div>;
};
const HelpList = () => {
  return <Row className="d-flex justify-content-center my-4">
      {helpData.map((help, idx) => <Col md={6} lg={4} className="mb-3" key={idx}>
          <HelpCard help={help} />
        </Col>)}
    </Row>;
};
export default HelpList;