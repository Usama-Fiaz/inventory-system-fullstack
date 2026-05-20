import { useState } from 'react';
import { Accordion, Alert, Button, Card, CardBody, Col, Form, Modal, Row } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import httpClient from '@/helpers/httpClient';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { CURRENCIES, getCurrencyCode, setCurrencyCode } from '@/lib/currency';

export default function InventorySettingsPage() {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [file, setFile] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [currency, setCurrency] = useState(getCurrencyCode());

  const exportDb = async () => {
    setError(null);
    setSuccess(null);
    setExporting(true);
    try {
      const res = await httpClient.get('/api/admin/db/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app.db';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setSuccess('Database exported successfully.');
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to export database');
    } finally {
      setExporting(false);
    }
  };

  const doImportDb = async () => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('db', file);
      await httpClient.post('/api/admin/db/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess('Database imported successfully. Please refresh the page.');
      setFile(null);
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to import database');
    } finally {
      setImporting(false);
    }
  };

  const openConfirm = () => {
    if (!file) return;
    setConfirmText('');
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    if (importing) return;
    setConfirmOpen(false);
  };

  const confirmAndImport = async () => {
    if (confirmText.trim().toUpperCase() !== 'RESTORE') return;
    setConfirmOpen(false);
    await doImportDb();
  };

  const saveCurrency = () => {
    setError(null);
    setSuccess(null);
    setCurrencyCode(currency);
    setSuccess('Currency updated successfully.');
  };

  const changePassword = async () => {
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword) {
      setError('Please enter your current password and a new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await httpClient.post('/api/admin/password/change', {
        currentPassword,
        newPassword,
      });
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <>
      <PageMetaData title="Settings" />

      <Row className="align-items-center g-2 mb-3">
        <Col>
          <h4 className="mb-0">Settings</h4>
          <div className="text-muted">Backup and restore your store data.</div>
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
        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="fw-bold">Currency</div>
              <div className="text-muted">Choose how prices and totals are displayed.</div>

              <div className="mt-3">
                <Form.Group controlId="currency">
                  <Form.Label className="fw-semibold">Currency</Form.Label>
                  <Form.Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>

              <div className="d-flex justify-content-end mt-3">
                <Button variant="primary" onClick={saveCurrency}>
                  Save
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="fw-bold">Security</div>
              <div className="text-muted">Change your admin password.</div>

              <Row className="g-3 mt-1">
                <Col xs={12} md={4}>
                  <Form.Group controlId="current-password">
                    <Form.Label className="fw-semibold">Current password</Form.Label>
                    <Form.Control
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={changingPassword}
                      autoComplete="current-password"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} md={4}>
                  <Form.Group controlId="new-password">
                    <Form.Label className="fw-semibold">New password</Form.Label>
                    <Form.Control
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={changingPassword}
                      autoComplete="new-password"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} md={4}>
                  <Form.Group controlId="confirm-password">
                    <Form.Label className="fw-semibold">Confirm new password</Form.Label>
                    <Form.Control
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={changingPassword}
                      autoComplete="new-password"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end mt-3">
                <Button variant="primary" onClick={changePassword} disabled={changingPassword}>
                  {changingPassword ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col xs={12}>
          <Card>
            <CardBody>
              <div className="d-flex align-items-start justify-content-between gap-3">
                <div>
                  <div className="fw-bold">Backup & Restore</div>
                  <div className="text-muted">Export a backup or restore from a backup file.</div>
                </div>
                <Button variant="primary" onClick={exportDb} disabled={exporting}>
                  <IconifyIcon icon="solar:download-broken" className="me-1" />
                  {exporting ? 'Exporting…' : 'Export DB'}
                </Button>
              </div>

              <div className="mt-3">
                <Accordion>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>
                      <span className="fw-semibold">Restore from backup</span>
                    </Accordion.Header>
                    <Accordion.Body>
                      <Alert variant="warning" className="mb-3">
                        Restoring will <b>replace</b> your current data. Export a backup first.
                      </Alert>

                      <Form.Group controlId="db-file">
                        <Form.Label className="fw-semibold">Backup file</Form.Label>
                        <Form.Control
                          type="file"
                          accept=".db,.sqlite,.sqlite3"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          disabled={importing}
                        />
                        <Form.Text className="text-muted">
                          Accepted: .db, .sqlite, .sqlite3
                        </Form.Text>
                      </Form.Group>

                      <div className="d-flex justify-content-end mt-3">
                        <Button variant="danger" onClick={openConfirm} disabled={importing || !file}>
                          <IconifyIcon icon="solar:upload-broken" className="me-1" />
                          {importing ? 'Restoring…' : 'Restore DB'}
                        </Button>
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Modal show={confirmOpen} onHide={closeConfirm} centered>
        <Modal.Header closeButton={!importing}>
          <Modal.Title>Confirm restore</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-muted">
            This will replace your current database. To continue, type <b>RESTORE</b> below.
          </div>
          <Form.Control
            className="mt-3"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type RESTORE"
            autoFocus
            disabled={importing}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={closeConfirm} disabled={importing}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmAndImport}
            disabled={importing || confirmText.trim().toUpperCase() !== 'RESTORE'}
          >
            Restore
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
