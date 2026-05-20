import { Col, Row, Card, CardBody, CardHeader, Table, Badge, Nav } from 'react-bootstrap';
import { useState } from 'react';
import PageMetaData from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { useSelector } from 'react-redux';
import { selectReport, selectReportStatus, selectReportError } from '@/store/slices/reportSlice';

export default function KernelConfigsPage() {
  // Read the report from Redux (no report.json usage)
  const report = useSelector(selectReport);
  const status = useSelector(selectReportStatus);
  const error = useSelector(selectReportError);
  const loading = status === 'idle' || status === 'loading';
  const [activeTab, setActiveTab] = useState('enable');
  const enableConfigs = report?.system_hardening?.kernel_config?.need_to_enable ?? [];
  const disableConfigs = report?.system_hardening?.kernel_config?.need_to_disable ?? [];
  const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  if (loading) {
    return (
      <>
        <PageMetaData title="Kernel Configs Details" />
        <div className="text-center py-5 text-muted">Loading report...</div>
      </>
    );
  }
  if (status === 'failed') {
    return (
      <>
        <PageMetaData title="Kernel Configs Details" />
        <div className="text-center py-5 text-danger">
          Failed to load report
        </div>
      </>
    );
  }

  return (
    <>
      <PageMetaData title="Kernel Configs Details" />
      <Row className="g-4">
        <Col>
          <Card>
            <CardHeader className="d-flex align-items-center gap-2">
              <IconifyIcon icon="solar:cpu-bolt-bold-duotone" className="fs-24 text-info" />
              <div>
                <h4 className="mb-0">Kernel Configuration Settings</h4>
              </div>
            </CardHeader>
            <CardBody>
              <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
                <Nav.Item>
                  <Nav.Link eventKey="enable">
                    Enable
                    <Badge bg="info" className="ms-2">{enableConfigs.length}</Badge>
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="disable">
                    Disable
                    <Badge bg="secondary" className="ms-2">{disableConfigs.length}</Badge>
                  </Nav.Link>
                </Nav.Item>
              </Nav>

              <div className="mt-3">
                {activeTab === 'enable' ? (
                  enableConfigs.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Kernel Config Name</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {enableConfigs.map((config, idx) => {
                            const configName = config.name || config.config || 'N/A';
                            const reason = config.description || 'Configuration setting for improved security';
                            return (
                              <tr key={idx}>
                                <td className="fw-semibold font-monospace" style={{ fontSize: '14px' }}>
                                  {configName}
                                </td>
                                <td className="text-muted" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                  {reason}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <IconifyIcon icon="solar:check-circle-bold-duotone" className="fs-48 text-success mb-3" />
                      <p className="text-muted">All required kernel configurations are enabled.</p>
                    </div>
                  )
                ) : (
                  disableConfigs.length > 0 ? (
                    <div className="table-responsive">
                      <Table hover>
                        <thead>
                          <tr>
                            <th>Kernel Config Name</th>
                            <th>Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disableConfigs.map((config, idx) => {
                            const configName = config.name || config.config || 'N/A';
                            const reason = config.description || 'Configuration setting for improved security';
                            return (
                              <tr key={idx}>
                                <td className="fw-semibold font-monospace" style={{ fontSize: '14px' }}>
                                  {configName}
                                </td>
                                <td className="text-muted" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                                  {reason}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-5">
                      <IconifyIcon icon="solar:check-circle-bold-duotone" className="fs-48 text-success mb-3" />
                      <p className="text-muted">All vulnerable kernel configurations are disabled.</p>
                    </div>
                  )
                )}
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
