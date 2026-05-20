import { lazy, Suspense } from 'react';
import { Card, CardBody, Col, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
const CalendarPage = lazy(() => import('./components/CalendarPage'));
const Schedule = () => {
  return <>
      <PageMetaData title="Schedule" />

      <Row>
        <Col xs={12}>
          <Card>
            <CardBody>
              <Row>
                <Suspense>
                  <CalendarPage />
                </Suspense>
              </Row>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>;
};
export default Schedule;