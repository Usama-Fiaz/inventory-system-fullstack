import { Button, Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import HelpList from './components/HelpList';
const Help = () => {
  return <>
      <PageMetaData title="Help" />

      <Row>
        <Col>
          <Row className="d-flex justify-content-center text-center mt-4 pb-5">
            <Col md={8} lg={6} xl={4}>
              <h3 className="fw-semibold">Search for a question</h3>
              <p className="mb-3 text-muted">Type your question or search keyword</p>
              <div className="search-bar">
                <span>
                  <IconifyIcon icon="bx:search-alt" className="mb-1" />
                </span>
                <input type="email" className="form-control" id="search" placeholder="Start typing..." />
              </div>
            </Col>
          </Row>
        </Col>
      </Row>

      <HelpList />

      <Row className="mb-5">
        <Col xs={12} className="text-center">
          <h4>Can&apos;t find a questions?</h4>
          <Button variant="success" type="button" size="sm" className="mt-2 icons-center gap-1">
            <IconifyIcon icon="bx:envelope" className="me-1" /> Email us your question
          </Button>
          <Button variant="info" type="button" size="sm" className="mt-2 ms-1 icons-center gap-1">
            <IconifyIcon icon="bxl:twitter" className="me-1" /> Send us a tweet
          </Button>
        </Col>
      </Row>
    </>;
};
export default Help;