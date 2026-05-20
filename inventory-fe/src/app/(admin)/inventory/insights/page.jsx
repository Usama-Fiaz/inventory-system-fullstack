import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Card, CardBody, Col, Form, Row, Table } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import httpClient from '@/helpers/httpClient';

export default function InventoryInsightsPage() {
  const [targetDays, setTargetDays] = useState(14);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);

  const load = useCallback(async (days) => {
    setError(null);
    try {
      const res = await httpClient.get('/api/insights/restock', {
        params: { targetDays: days },
      });
      setRows(res.data?.rows || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load insights');
    }
  }, []);

  useEffect(() => {
    load(targetDays);
  }, [load, targetDays]);

  return (
    <>
      <PageMetaData title="Inventory Insights" />

      <Row className="align-items-center g-2 mb-3">
        <Col>
          <h4 className="mb-0">Insights</h4>
          <div className="text-muted">Low stock alerts and restock recommendations based on recent sales.</div>
        </Col>
        <Col xs="auto">
          <Form.Select value={targetDays} onChange={(e) => setTargetDays(Number(e.target.value))}>
            {[7, 14, 21, 30, 45, 60].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </Form.Select>
        </Col>
      </Row>

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <Card>
        <CardBody>
          <div className="table-responsive">
            <Table hover size="sm" className="mb-0 table-dashboard">
              <thead className="table-header-bg">
                <tr>
                  <th>Item</th>
                  <th>On-hand</th>
                  <th>Avg/day (30d)</th>
                  <th>Days left</th>
                  <th>Recommended</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.itemId}>
                    <td>
                      <div className="fw-semibold">{r.itemName}</div>
                      <div className="text-muted fs-13">Reorder ≤ {r.reorderLevel}</div>
                    </td>
                    <td>{r.onHand}</td>
                    <td>{Number(r.avgDailySales || 0).toFixed(2)}</td>
                    <td>{r.daysOfStockLeft == null ? '—' : Number(r.daysOfStockLeft).toFixed(1)}</td>
                    <td>
                      <Badge
                        bg={r.recommendedRestockQty > 0 ? 'primary' : 'light'}
                        text={r.recommendedRestockQty > 0 ? 'light' : 'dark'}
                      >
                        {r.recommendedRestockQty}
                      </Badge>
                    </td>
                    <td>
                      {r.isLowStock ? (
                        <Badge bg="warning" text="dark">
                          Low
                        </Badge>
                      ) : (
                        <Badge bg="secondary">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted">
                      No data.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
