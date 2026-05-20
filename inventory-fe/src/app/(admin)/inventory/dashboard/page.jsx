import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Card, CardBody, Col, Row, Table } from 'react-bootstrap';
import dayjs from 'dayjs';
import ReactApexChart from 'react-apexcharts';
import PageMetaData from '@/components/PageTitle';
import httpClient from '@/helpers/httpClient';
import { downloadXlsx } from '@/lib/excel';
import { formatMoney } from '@/lib/currency';

function money(n) {
  return formatMoney(n);
}

export default function InventoryDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [trend, setTrend] = useState([]);
  const [error, setError] = useState(null);

  const range = useMemo(() => {
    const to = dayjs().endOf('day');
    const from = dayjs().subtract(6, 'day').startOf('day');
    return { from, to };
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setError(null);
      try {
        const [ov, low, byDay] = await Promise.all([
          httpClient.get('/api/overview'),
          httpClient.get('/api/items', { params: { lowOnly: 1 } }),
          httpClient.get('/api/reports/revenue-by-day', {
            params: { from: range.from.toISOString(), to: range.to.toISOString() },
          }),
        ]);
        if (!alive) return;
        setOverview(ov.data);
        setLowStock(low.data || []);
        setTrend(byDay.data?.rows || []);
      } catch (e) {
        if (!alive) return;
        setError(e?.response?.data?.error || 'Failed to load dashboard');
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [range.from, range.to]);

  const chart = useMemo(() => {
    const categories = trend.map((r) => r.day);
    const data = trend.map((r) => Number(r.revenue || 0));

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
  }, [trend]);

  const exportLowStock = () => {
    const rows = (lowStock || []).map((it) => ({
      id: it.id,
      name: it.name,
      sku: it.sku,
      category: it.category,
      supplier: it.supplier,
      quantity: it.quantity,
      reorder_level: it.reorder_level,
      purchase_price: it.purchase_price,
    }));
    downloadXlsx(`low-stock-${dayjs().format('YYYY-MM-DD')}`, 'Low Stock', rows);
  };

  return (
    <>
      <PageMetaData title="Inventory Dashboard" />

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <Row className="g-3">
        <Col md={6} xl={4}>
          <Card>
            <CardBody>
              <div className="text-muted">Inventory Value</div>
              <div className="fs-24 fw-bold mt-1">
                {overview ? money(overview.totals.inventoryValue) : '—'}
              </div>
              <div className="text-muted mt-1">Purchase cost value on-hand</div>
            </CardBody>
          </Card>
        </Col>
        <Col md={6} xl={4}>
          <Card>
            <CardBody>
              <div className="text-muted">Items / Units</div>
              <div className="fs-24 fw-bold mt-1">
                {overview ? `${overview.totals.itemsCount} / ${overview.totals.totalUnits}` : '—'}
              </div>
              <div className="text-muted mt-1">Distinct items and total units</div>
            </CardBody>
          </Card>
        </Col>
        <Col md={12} xl={4}>
          <Card>
            <CardBody>
              <div className="text-muted">Today Revenue</div>
              <div className="fs-24 fw-bold mt-1">
                {overview ? money(overview.todaySales.revenue) : '—'}
              </div>
              <div className="text-muted mt-1">Units sold: {overview ? overview.todaySales.units : '—'}</div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mt-1">
        <Col xl={7}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold">Last 7 Days</div>
                  <div className="text-muted">Revenue trend</div>
                </div>
                <Badge bg="light" text="dark">
                  {range.from.format('DD MMM')} - {range.to.format('DD MMM')}
                </Badge>
              </div>
              <div className="mt-3">
                <ReactApexChart height={300} options={chart.options} series={chart.series} type="bar" />
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="fw-bold">Low Stock Alerts</div>
                  <div className="text-muted">Items at or below reorder level</div>
                </div>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={exportLowStock}
                  disabled={lowStock.length === 0}
                >
                  Export Excel
                </button>
              </div>

              <div className="mt-3 table-responsive">
                <Table hover size="sm" className="mb-0 table-dashboard">
                  <thead className="table-header-bg">
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Reorder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStock.slice(0, 10).map((it) => (
                      <tr key={it.id}>
                        <td>
                          <div className="fw-semibold">{it.name}</div>
                          <div className="text-muted fs-13">{it.sku ? `SKU: ${it.sku}` : ''}</div>
                        </td>
                        <td>
                          <Badge bg="warning" text="dark">
                            {it.quantity}
                          </Badge>
                        </td>
                        <td>{it.reorder_level}</td>
                      </tr>
                    ))}
                    {lowStock.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-muted">
                          No low-stock items.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </Table>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
