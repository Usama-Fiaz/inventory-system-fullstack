import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, Col, Form, Row, Table } from 'react-bootstrap';
import dayjs from 'dayjs';
import PageMetaData from '@/components/PageTitle';
import httpClient from '@/helpers/httpClient';
import { downloadXlsx } from '@/lib/excel';
import { formatMoney } from '@/lib/currency';

function money(n) {
  return formatMoney(n);
}

export default function InventorySalesPage() {
  const [items, setItems] = useState([]);
  const [recentSales, setRecentSales] = useState([]);

  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [soldAt, setSoldAt] = useState(() => dayjs().format('YYYY-MM-DDTHH:mm'));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const selected = useMemo(
    () => items.find((x) => String(x.id) === String(itemId)),
    [items, itemId]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [it, sales] = await Promise.all([
        httpClient.get('/api/items'),
        httpClient.get('/api/sales', { params: { limit: 20 } }),
      ]);
      setItems(it.data || []);
      setRecentSales(sales.data?.rows || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load');
    }
  }, []);

  const onExport = async () => {
    setError(null);
    try {
      const res = await httpClient.get('/api/sales', { params: { limit: 1000 } });
      const rows = (res.data?.rows || []).map((s) => ({
        id: s.id,
        itemName: s.itemName,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        total: s.total,
        soldAt: s.soldAt,
      }));
      downloadXlsx(`sales-${dayjs().format('YYYY-MM-DD')}`, 'Sales', rows);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to export');
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected && !unitPrice) {
      setUnitPrice(String(selected.purchase_price || ''));
    }
  }, [selected, unitPrice]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await httpClient.post('/api/sales', {
        itemId: Number(itemId),
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        soldAt: dayjs(soldAt).toISOString(),
      });
      setSuccess(`Sale recorded. Remaining qty: ${res.data.item.quantity}`);
      await load();
    } catch (e2) {
      setError(e2?.response?.data?.error || 'Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMetaData title="Inventory Sales" />

      <Row className="align-items-center g-2 mb-3">
        <Col>
          <h4 className="mb-0">Sales</h4>
          <div className="text-muted">Record sales and automatically deduct inventory.</div>
        </Col>
        <Col xs="auto">
          <Button variant="light" onClick={onExport}>
            Export Excel
          </Button>
        </Col>
      </Row>

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success" className="mb-3">
          {success}
        </Alert>
      ) : null}

      <Row className="g-3">
        <Col xl={5}>
          <Card>
            <CardBody>
              <div className="fw-bold mb-2">Record Sale</div>

              <Form onSubmit={onSubmit}>
                <Row className="g-2">
                  <Col xs={12}>
                    <Form.Label>Item</Form.Label>
                    <Form.Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                      <option value="">Select item…</option>
                      {items.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} (Qty: {it.quantity})
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={6}>
                    <Form.Label>Quantity</Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Label>Unit Price</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                    />
                  </Col>

                  <Col xs={12}>
                    <Form.Label>Sold At</Form.Label>
                    <Form.Control
                      type="datetime-local"
                      value={soldAt}
                      onChange={(e) => setSoldAt(e.target.value)}
                    />
                  </Col>

                  <Col xs={12}>
                    <Button
                      type="submit"
                      variant="primary"
                      className="w-100"
                      disabled={loading || !itemId || !quantity || !unitPrice}
                    >
                      {loading ? 'Saving…' : 'Record Sale'}
                    </Button>
                  </Col>

                  {selected ? (
                    <Col xs={12}>
                      <div className="text-muted fs-13">
                        On-hand: <span className="fw-semibold">{selected.quantity}</span>
                      </div>
                    </Col>
                  ) : null}
                </Row>
              </Form>
            </CardBody>
          </Card>
        </Col>

        <Col xl={7}>
          <Card>
            <CardBody>
              <div className="fw-bold mb-2">Recent Sales</div>
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0 table-dashboard">
                  <thead className="table-header-bg">
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Total</th>
                      <th>Sold At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="fw-semibold">{s.itemName}</div>
                        </td>
                        <td>
                          <Badge bg="light" text="dark">
                            {s.quantity}
                          </Badge>
                        </td>
                        <td>{money(s.unitPrice)}</td>
                        <td>{money(Number(s.unitPrice) * Number(s.quantity))}</td>
                        <td>{dayjs(s.soldAt).format('DD MMM YYYY HH:mm')}</td>
                      </tr>
                    ))}
                    {recentSales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-muted">
                          No sales yet.
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
