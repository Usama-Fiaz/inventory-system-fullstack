import { Col, Row } from 'react-bootstrap';
import Stats from './components/Stats';
import ProjectSummary from './components/ProjectSummary';
import Schedules from './components/Schedules';
import Statistics from './components/Statistics';
import Conversions from './components/Conversions';
import Statistic2 from './components/Statistic2';
import Tasks from './components/Tasks';
import FriendsRequest from './components/FriendsRequest';
import RecentTransactions from './components/RecentTransactions';
import PageMetaData from '@/components/PageTitle';
const Widgets = () => {
  return <>
      <PageMetaData title="Widgets" />

      <Statistics />
      <Stats />
      <Statistic2 />
      <Row>
        <Col xl={6}>
          <ProjectSummary />
        </Col>
        <Col xl={6}>
          <Schedules />
        </Col>
      </Row>
      <Row>
        <Col xs={12}>
          <Conversions />
        </Col>
      </Row>
      <Row>
        <Col xl={4}>
          <Tasks />
        </Col>
        <Col xl={4}>
          <FriendsRequest />
        </Col>
        <Col xl={4}>
          <RecentTransactions />
        </Col>
      </Row>
    </>;
};
export default Widgets;