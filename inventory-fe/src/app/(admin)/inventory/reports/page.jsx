import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, Col, Form, Row } from 'react-bootstrap';
import dayjs from 'dayjs';
import ReactApexChart from 'react-apexcharts';
import PageMetaData from '@/components/PageTitle';
import httpClient from '@/helpers/httpClient';
import { formatMoney } from '@/lib/currency';

function money(n) {
  return formatMoney(n);
}

export default function InventoryReportsPage() {
  const [metric, setMetric] = useState('revenue');
  const [from, setFrom] = useState(() => dayjs().subtract(29, 'day').startOf('day'));
  const [to, setTo] = useState(() => dayjs().endOf('day'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [trending, setTrending] = useState([]);
  const [leastTrending, setLeastTrending] = useState([]);
  const [byDay, setByDay] = useState([]);

  const rangeLabel = useMemo(
    () => `${from.format('DD MMM YYYY')} - ${to.format('DD MMM YYYY')}`,
    [from, to]
  );

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const params = { from: from.toISOString(), to: to.toISOString(), metric, limit: 8 };
      const [t, l, d] = await Promise.all([
        httpClient.get('/api/reports/trending', { params }),
        httpClient.get('/api/reports/least-trending', { params }),
        httpClient.get('/api/reports/revenue-by-day', {
          params: { from: from.toISOString(), to: to.toISOString() },
        }),
      ]);
      setTrending(t.data?.rows || []);
      setLeastTrending(l.data?.rows || []);
      setByDay(d.data?.rows || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [from, metric, to]);

  useEffect(() => {
    load();
  }, [load]);

  const setQuick = (days) => {
    setFrom(dayjs().subtract(days - 1, 'day').startOf('day'));
    setTo(dayjs().endOf('day'));
  };

  const chart = useMemo(() => {
    const categories = byDay.map((r) => r.day);
    const data = byDay.map((r) => Number(r.revenue || 0));

    return {
      series: [{ name: 'Revenue', data }],
      options: {
        chart: { type: 'bar', height: 300, toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
        dataLabels: { enabled: false },
        colors: ['#3b82f6'],
        xaxis: { categories },
        yaxis: { labels: { formatter: (v) => money(v) } },
        grid: { strokeDashArray: 3 },
      },
    };
  }, [byDay]);

  const trendingChart = useMemo(() => {
    const categories = trending.map((r) => r.itemName);
    const data = trending.map((r) => Number(metric === 'units' ? r.units : r.revenue) || 0);

    return {
      series: [{ name: metric === 'units' ? 'Units' : 'Revenue', data }],
      options: {
        chart: { type: 'bar', height: 320, toolbar: { show: false } },
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            barHeight: '60%',
          },
        },
        dataLabels: { enabled: false },
        colors: ['#3b82f6'],
        xaxis: {
          categories,
          labels: {
            formatter: (v) => (metric === 'units' ? String(Math.round(Number(v) || 0)) : money(v)),
          },
        },
        grid: { strokeDashArray: 3 },
        tooltip: {
          y: {
            formatter: (v) => (metric === 'units' ? String(Math.round(Number(v) || 0)) : money(v)),
          },
        },
      },
    };
  }, [metric, trending]);

  const leastTrendingChart = useMemo(() => {
    const categories = leastTrending.map((r) => r.itemName);
    const data = leastTrending.map((r) => Number(metric === 'units' ? r.units : r.revenue) || 0);

    return {
      series: [{ name: metric === 'units' ? 'Units' : 'Revenue', data }],
      options: {
        chart: { type: 'bar', height: 320, toolbar: { show: false } },
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            barHeight: '60%',
          },
        },
        dataLabels: { enabled: false },
        colors: ['#ef4444'],
        xaxis: {
          categories,
          labels: {
            formatter: (v) => (metric === 'units' ? String(Math.round(Number(v) || 0)) : money(v)),
          },
        },
        grid: { strokeDashArray: 3 },
        tooltip: {
          y: {
            formatter: (v) => (metric === 'units' ? String(Math.round(Number(v) || 0)) : money(v)),
          },
        },
      },
    };
  }, [leastTrending, metric]);

  return (
    <>
      <PageMetaData title="Inventory Reports" />

      <Row className="align-items-center g-2 mb-3">
        <Col>
          <h4 className="mb-0">Reports</h4>
          <div className="text-muted">Custom date range, last 7/30 days, trending and least trending sales.</div>
        </Col>
        <Col xs="auto">
          <Badge bg="light" text="dark">
            {rangeLabel}
          </Badge>
        </Col>
      </Row>

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardBody>
          <Row className="g-2 align-items-end">
            <Col md={3}>
              <Form.Label>From</Form.Label>
              <Form.Control
                type="date"
                value={from.format('YYYY-MM-DD')}
                onChange={(e) => setFrom(dayjs(e.target.value).startOf('day'))}
              />
            </Col>
            <Col md={3}>
              <Form.Label>To</Form.Label>
              <Form.Control
                type="date"
                value={to.format('YYYY-MM-DD')}
                onChange={(e) => setTo(dayjs(e.target.value).endOf('day'))}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Metric</Form.Label>
              <div className="d-flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={metric === 'revenue' ? 'primary' : 'light'}
                  onClick={() => setMetric('revenue')}
                >
                  Revenue
                </Button>
                <Button
                  type="button"
                  variant={metric === 'units' ? 'primary' : 'light'}
                  onClick={() => setMetric('units')}
                >
                  Units
                </Button>
              </div>
            </Col>
            <Col md={3} className="text-md-end">
              <div className="d-flex gap-2 justify-content-md-end flex-wrap">
                <Button variant="light" onClick={() => setQuick(7)}>
                  Last 7 days
                </Button>
                <Button variant="light" onClick={() => setQuick(30)}>
                  Last 30 days
                </Button>
                <Button variant="primary" onClick={load} disabled={loading}>
                  {loading ? 'Loading…' : 'Generate'}
                </Button>
              </div>
            </Col>
          </Row>
        </CardBody>
      </Card>

      <Row className="g-3 mt-1">
        <Col xl={6}>
          <Card>
            <CardBody>
              <div className="fw-bold">Trending</div>
              <div className="text-muted">Top performers by {metric}</div>

              <div className="mt-3">
                <ReactApexChart
                  height={320}
                  options={trendingChart.options}
                  series={trendingChart.series}
                  type="bar"
                />
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xl={6}>
          <Card>
            <CardBody>
              <div className="fw-bold">Least Trending</div>
              <div className="text-muted">Lowest performers by {metric}</div>

              <div className="mt-3">
                <ReactApexChart
                  height={320}
                  options={leastTrendingChart.options}
                  series={leastTrendingChart.series}
                  type="bar"
                />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col>
          <Card>
            <CardBody>
              <div className="fw-bold">Sales by Day</div>
              <div className="text-muted">Revenue trend across the selected period</div>
              <div className="mt-3">
                <ReactApexChart height={320} options={chart.options} series={chart.series} type="bar" />
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
