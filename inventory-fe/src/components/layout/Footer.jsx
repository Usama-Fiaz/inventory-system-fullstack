import { currentYear } from '@/context/constants';
import { Col, Container, Row } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="footer">
      <Container fluid className="px-4">
        <Row className="align-items-center" style={{ minHeight: 34 }}>
          <Col xs={12} className="text-center">
            <span style={{ 
              display: 'inline-block',
              padding: '2px 0',
              fontSize: '0.68rem', 
              fontWeight: 500, 
              opacity: 0.72, 
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              color: 'var(--bs-primary-color)'
            }}>
              {currentYear} © Abdullah Store
            </span>
          </Col>
        </Row>
      </Container>
    </footer>
  );
};

export default Footer;
