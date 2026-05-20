import { Card, CardBody, CardTitle, Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import AllInputMasks from './components/AllInputMasks';
const InputMasks = () => {
  return <>
      <PageMetaData title="Input Mask" />

      <Row>
        <Col xl={12}>
          <Card>
            <CardBody>
              <CardTitle as={'h5'} className="anchor" id="overview">
                Overview{' '}
                <a className="btn btn-sm btn-outline-success rounded-2 float-end" href="https://github.com/RobinHerbots/Inputmask" target="_blank">
                  {' '}
                  Official Website{' '}
                </a>
              </CardTitle>
              <p className="text-muted mb-3">Inputmask is a javascript library that creates an input mask.</p>
            </CardBody>
          </Card>
          <AllInputMasks />
        </Col>
      </Row>
    </>;
};
export default InputMasks;