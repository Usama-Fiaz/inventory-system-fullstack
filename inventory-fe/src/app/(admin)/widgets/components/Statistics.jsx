import { Card, CardBody, Col, Row } from 'react-bootstrap';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { statisticData } from '../data';
const StatCard = ({
  stat
}) => {
  const {
    amount,
    icon,
    iconColor,
    title
  } = stat;
  return <Card>
      <CardBody>
        <Row>
          <Col xs={6}>
            <div className={`avatar-md bg-${iconColor} rounded flex-centered`}>
              <IconifyIcon icon={icon} className="fs-24 text-white" />
            </div>
          </Col>
          <Col xs={6} className="text-end">
            <p className="text-muted mb-0 text-truncate">{title}</p>
            <h3 className="text-dark mt-1 mb-0">{amount}</h3>
          </Col>
        </Row>
      </CardBody>
    </Card>;
};
const Statistics = () => {
  return <Row>
      {statisticData.map((stat, idx) => <Col md={6} xl={3} key={idx}>
          <StatCard stat={stat} />
        </Col>)}
    </Row>;
};
export default Statistics;