import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { Card, CardBody, CardFooter, Col, Row } from 'react-bootstrap';
import { statistic2Data } from '../data';
import { Link } from 'react-router-dom';
const StatCard = ({
  stat
}) => {
  const {
    amount,
    change,
    changeColor,
    icon,
    iconColor,
    title
  } = stat;
  return <Card>
      <CardBody>
        <Row>
          <Col xs={6}>
            <div className={`avatar-md bg-light rounded flex-centered bg-opacity-50`}>
              <IconifyIcon icon={icon} className={`fs-32 text-${iconColor}`} />
            </div>
          </Col>
          <Col xs={6} className="text-end">
            <p className="text-muted mb-0 text-truncate">{title}</p>
            <h3 className="text-dark mt-1 mb-0">{amount}</h3>
          </Col>
        </Row>
      </CardBody>
      <CardFooter className="py-2 bg-light bg-opacity-50">
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <span className={`text-${changeColor} icons-center gap-1`}>
              {changeColor === 'danger' ? <IconifyIcon icon="bxs:down-arrow" className="fs-12" /> : <IconifyIcon icon="bxs:up-arrow" className="fs-12" />}
              {change}%
            </span>
            <span className="text-muted ms-1 fs-12">Last Month</span>
          </div>
          <Link to="" className="text-reset fw-semibold fs-12">
            View More
          </Link>
        </div>
      </CardFooter>
    </Card>;
};
const Statistic2 = () => {
  return <Row>
      {statistic2Data.map((stat, idx) => <Col md={6} xl={3} key={idx}>
          <StatCard stat={stat} />
        </Col>)}
    </Row>;
};
export default Statistic2;