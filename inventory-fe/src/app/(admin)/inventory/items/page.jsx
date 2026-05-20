import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Form,
  Modal,
  Row,
  Table,
} from 'react-bootstrap';
import dayjs from 'dayjs';
import PageMetaData from '@/components/PageTitle';
import httpClient from '@/helpers/httpClient';
import { downloadXlsx } from '@/lib/excel';
import { formatMoney } from '@/lib/currency';

function money(n) {
  return formatMoney(n);
}

function ItemModal({ show, onHide, initial, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: '',
    supplier: '',
    purchasePrice: 0,
    quantity: 0,
    reorderLevel: 5,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!initial) {
      setForm({
        name: '',
        sku: '',
        category: '',
        supplier: '',
        purchasePrice: 0,
        quantity: 0,
        reorderLevel: 5,
        notes: '',
      });
      return;
    }
    setForm({
      name: initial.name || '',
      sku: initial.sku || '',
      category: initial.category || '',
      supplier: initial.supplier || '',
      purchasePrice: Number(initial.purchase_price || 0),
      quantity: Number(initial.quantity || 0),
      reorderLevel: Number(initial.reorder_level || 0),
      notes: initial.notes || '',
    });
  }, [initial]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        purchasePrice: Number(form.purchasePrice || 0),
        quantity: Number(form.quantity || 0),
        reorderLevel: Number(form.reorderLevel || 0),
      };

      const res = initial
        ? await httpClient.put(`/api/items/${initial.id}`, payload)
        : await httpClient.post('/api/items', payload);

      onSaved(res.data);
      onHide();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>{initial ? 'Edit Item' : 'Add Inventory Item'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}

        <Row className="g-3">
          <Col xs={12}>
            <Form.Label>Name</Form.Label>
            <Form.Control
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Item name"
            />
          </Col>
          <Col md={6}>
            <Form.Label>SKU</Form.Label>
            <Form.Control
              value={form.sku}
              onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
              placeholder="Optional"
            />
          </Col>
          <Col md={6}>
            <Form.Label>Category</Form.Label>
            <Form.Control
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="Optional"
            />
          </Col>
          <Col md={6}>
            <Form.Label>Supplier</Form.Label>
            <Form.Control
              value={form.supplier}
              onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}
              placeholder="Optional"
            />
          </Col>
          <Col md={6}>
            <Form.Label>Purchase Price</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
            />
          </Col>
          <Col md={6}>
            <Form.Label>Quantity</Form.Label>
            <Form.Control
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
            />
          </Col>
          <Col md={6}>
            <Form.Label>Reorder Level</Form.Label>
            <Form.Control
              type="number"
              value={form.reorderLevel}
              onChange={(e) => setForm((p) => ({ ...p, reorderLevel: e.target.value }))}
            />
          </Col>
          <Col xs={12}>
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Optional"
            />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={submit} disabled={loading || !form.name}>
          {loading ? 'Saving…' : 'Save'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function RestockModal({ show, onHide, item, onSaved }) {
  const [quantityAdded, setQuantityAdded] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [restockedAt, setRestockedAt] = useState(() => dayjs().format('YYYY-MM-DDTHH:mm'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!show) return;
    setQuantityAdded('');
    setUnitCost(item ? String(item.purchase_price || '') : '');
    setRestockedAt(dayjs().format('YYYY-MM-DDTHH:mm'));
    setError(null);
  }, [item, show]);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await httpClient.post('/api/restocks', {
        itemId: Number(item.id),
        quantityAdded: Number(quantityAdded),
        unitCost: Number(unitCost),
        restockedAt: dayjs(restockedAt).toISOString(),
      });
      onSaved(res.data);
      onHide();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to restock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Restock</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {item ? (
          <div className="mb-3">
            <div className="fw-semibold">{item.name}</div>
            <div className="text-muted fs-13">On-hand: {item.quantity}</div>
          </div>
        ) : null}

        <Row className="g-3">
          <Col md={6}>
            <Form.Label>Quantity Added</Form.Label>
            <Form.Control
              type="number"
              value={quantityAdded}
              onChange={(e) => setQuantityAdded(e.target.value)}
              placeholder="e.g. 20"
            />
          </Col>
          <Col md={6}>
            <Form.Label>Unit Cost</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              placeholder="e.g. 12.50"
            />
          </Col>
          <Col xs={12}>
            <Form.Label>Restocked At</Form.Label>
            <Form.Control
              type="datetime-local"
              value={restockedAt}
              onChange={(e) => setRestockedAt(e.target.value)}
            />
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="light" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={submit}
          disabled={loading || !quantityAdded || !unitCost}
        >
          {loading ? 'Updating…' : 'Restock'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function InventoryItemsPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [lowOnly, setLowOnly] = useState(false);

  const [error, setError] = useState(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [restockOpen, setRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState(null);

  const totalValue = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.purchase_price), 0),
    [items]
  );

  const onExport = () => {
    const rows = (items || []).map((it) => ({
      id: it.id,
      name: it.name,
      sku: it.sku,
      category: it.category,
      supplier: it.supplier,
      purchase_price: it.purchase_price,
      quantity: it.quantity,
      reorder_level: it.reorder_level,
      notes: it.notes,
      created_at: it.created_at,
      updated_at: it.updated_at,
    }));
    downloadXlsx(`items-${dayjs().format('YYYY-MM-DD')}`, 'Items', rows);
  };

  const onExportRestocks = async () => {
    setError(null);
    try {
      const res = await httpClient.get('/api/restocks', { params: { limit: 1000 } });
      const rows = (res.data?.rows || []).map((r) => ({
        id: r.id,
        itemName: r.itemName,
        quantityAdded: r.quantityAdded,
        unitCost: r.unitCost,
        total: r.total,
        restockedAt: r.restockedAt,
      }));
      downloadXlsx(`restocks-${dayjs().format('YYYY-MM-DD')}`, 'Restocks', rows);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to export restocks');
    }
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await httpClient.get('/api/items', {
        params: { q: q || undefined, lowOnly: lowOnly ? 1 : 0 },
      });
      setItems(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to load items');
    }
  }, [lowOnly, q]);

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async (it) => {
    const ok = window.confirm(`Delete "${it.name}"?`);
    if (!ok) return;
    setError(null);
    try {
      await httpClient.delete(`/api/items/${it.id}`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <>
      <PageMetaData title="Inventory Items" />

      {error ? (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}

      <Row className="align-items-center g-2 mb-3">
        <Col>
          <h4 className="mb-0">Inventory</h4>
          <div className="text-muted">Manage items, stock levels, and purchase cost value.</div>
        </Col>
        <Col xs="auto">
          <Button variant="light" className="me-2" onClick={onExport} disabled={items.length === 0}>
            Export Excel
          </Button>
          <Button variant="light" className="me-2" onClick={onExportRestocks}>
            Export Restocks
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setEditItem(null);
              setItemModalOpen(true);
            }}
          >
            Add Item
          </Button>
        </Col>
      </Row>

      <Card>
        <CardBody>
          <Row className="g-2 align-items-center">
            <Col md={5}>
              <Form.Control
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search items, SKU, category…"
              />
            </Col>
            <Col md={4}>
              <Form.Check
                type="switch"
                id="low-only"
                label="Low stock only"
                checked={lowOnly}
                onChange={(e) => setLowOnly(e.target.checked)}
              />
            </Col>
            <Col md={3} className="text-md-end">
              <Badge bg="light" text="dark">
                Inventory value: {money(totalValue)}
              </Badge>
            </Col>
          </Row>

          <div className="table-responsive mt-3">
            <Table hover size="sm" className="mb-0 table-dashboard">
              <thead className="table-header-bg">
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Purchase</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const isLow = Number(it.quantity) <= Number(it.reorder_level);
                  const value = Number(it.quantity) * Number(it.purchase_price);
                  return (
                    <tr key={it.id}>
                      <td>
                        <div className="fw-semibold">{it.name}</div>
                        <div className="text-muted fs-13">
                          {(it.sku ? `SKU: ${it.sku}` : 'No SKU') + (it.category ? ` · ${it.category}` : '')}
                        </div>
                      </td>
                      <td>{it.quantity}</td>
                      <td>{money(it.purchase_price)}</td>
                      <td>{money(value)}</td>
                      <td>
                        {isLow ? (
                          <Badge bg="warning" text="dark">
                            Low
                          </Badge>
                        ) : (
                          <Badge bg="secondary">OK</Badge>
                        )}
                      </td>
                      <td className="text-end">
                        <Button
                          size="sm"
                          variant="light"
                          className="me-1"
                          onClick={() => {
                            setEditItem(it);
                            setItemModalOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="light"
                          className="me-1"
                          onClick={() => {
                            setRestockItem(it);
                            setRestockOpen(true);
                          }}
                        >
                          Restock
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => onDelete(it)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-muted">
                      No items found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </Table>
          </div>
        </CardBody>
      </Card>

      <ItemModal
        show={itemModalOpen}
        onHide={() => setItemModalOpen(false)}
        initial={editItem}
        onSaved={() => load()}
      />

      <RestockModal
        show={restockOpen}
        onHide={() => setRestockOpen(false)}
        item={restockItem}
        onSaved={() => load()}
      />
    </>
  );
}
