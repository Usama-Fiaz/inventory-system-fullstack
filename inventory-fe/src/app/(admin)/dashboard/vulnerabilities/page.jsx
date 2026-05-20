import React, { useMemo, useState, useDeferredValue } from 'react';
import { Card, CardBody, CardHeader, Col, Row, Table, Badge, Button, Form } from 'react-bootstrap';
import PageMetaData from '@/components/PageTitle';
import IconifyIcon from '@/components/wrappers/IconifyIcon';
import { getStatusIcon } from '../statusIcons';
import { useSelector } from 'react-redux';
import { selectReport, selectReportStatus, selectReportError } from '@/store/slices/reportSlice';
// Severity is NOT present in the current backend/test report payload.
// We only display severity if the backend provides `issue.severity` (or `issue.Severity`).

// Period filter removed - table shows current analysis only
const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'Patched', label: 'Patched' },
  { value: 'Unpatched', label: 'Unpatched' },
  { value: 'Ignored', label: 'Ignored' }
];
const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
  { value: 'N/A', label: 'N/A' }
];
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Normalize status for display: only Patched, Ignored, or Unpatched (open).
function displayStatus(status) {
  if (status === 'Patched' || status === 'Ignored') return status;
  return 'Unpatched';
}

// Build flat CVE rows once (deferred until component mount to keep initial load lighter)
function buildCveRows(data) {
  const normalizeSeverity = (raw) => {
    if (!raw || typeof raw !== 'string') return 'N/A';
    const s = raw.trim().toLowerCase();
    if (s === 'critical') return 'Critical';
    if (s === 'high') return 'High';
    if (s === 'medium') return 'Medium';
    if (s === 'low') return 'Low';
    return 'N/A';
  };

  // metrics is a plain string: "CVSS 2.0", "CVSS 3.0", "CVSS 3.1", or "CVSS 4.0".
  const normalizeMetrics = (raw) => (typeof raw === 'string' && raw.trim() ? raw.trim() : null);

  const out = [];
  const packages = data?.cve?.package ?? [];
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i];
    const packageName = pkg.name ?? '—';
    const version = pkg.version ?? '—';
    const layer = pkg.layer ?? '—';
    const issues = pkg.issue ?? [];
    for (let j = 0; j < issues.length; j++) {
      const issue = issues[j];
      const severity = normalizeSeverity(issue?.severity || issue?.Severity);
        const metrics = normalizeMetrics(issue?.metrics ?? issue?.Metrics);
      out.push({
        id: issue.id ?? '—',
        packageName,
        version,
        layer,
        status: issue.status ?? '—',
        severity,
        metrics,
        link: issue.link,
        description: issue.description
      });
    }
  }
  return out;
}

export default function VulnerabilitiesPage() {
  // Read the report from Redux (no report.json usage)
  const report = useSelector(selectReport);
  const status = useSelector(selectReportStatus);
  const error = useSelector(selectReportError);
  const loading = status === 'idle' || status === 'loading';
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [expandedRows, setExpandedRows] = useState({});
  const [summaries, setSummaries] = useState({});
  const [loadingRows, setLoadingRows] = useState({});

  const allRows = useMemo(() => buildCveRows(report), [report]);
  const deferredStatus = useDeferredValue(statusFilter);
  const deferredSeverity = useDeferredValue(severityFilter);

  const filteredRows = useMemo(() => {
    let filtered = allRows;
    
    // Apply status filter
    if (deferredStatus) {
      if (deferredStatus === 'Unpatched') {
        filtered = filtered.filter((r) => r.status !== 'Patched' && r.status !== 'Ignored');
      } else {
        filtered = filtered.filter((r) => r.status === deferredStatus);
      }
    }
    
    // Apply severity filter
    if (deferredSeverity) {
      filtered = filtered.filter((r) => r.severity === deferredSeverity);
    }
    
    return filtered;
  }, [allRows, deferredStatus, deferredSeverity]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = useMemo(
    () => filteredRows.slice(start, start + pageSize),
    [filteredRows, start, pageSize]
  );

  const formatNumber = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(1);
  };

  if (loading) {
    return (
      <>
        <PageMetaData title="Vulnerabilities" />
        <div className="text-center py-5 text-muted">Loading report...</div>
      </>
    );
  }
  if (status === 'failed') {
    return (
      <>
        <PageMetaData title="Vulnerabilities" />
        <div className="text-center py-5 text-danger">
          Failed to load report
        </div>
      </>
    );
  }

  return (
    <>
      <PageMetaData title="Vulnerabilities" />
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <CardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-2 border-bottom py-3">

              <h4 className="mb-0">CVE Findings</h4>

              <div className="d-flex align-items-center gap-3 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <div className="d-flex align-items-center gap-1">
                    <IconifyIcon icon={getStatusIcon('improved')} style={{ fontSize: '16px', color: '#16a34a' }} />
                    <span className="text-body-secondary" style={{ fontSize: '0.85rem' }}>Patched</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <IconifyIcon icon={getStatusIcon('regressed')} style={{ fontSize: '16px', color: '#d97706' }} />
                    <span className="text-body-secondary" style={{ fontSize: '0.85rem' }}>Ignored</span>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <IconifyIcon icon={getStatusIcon('regressed')} style={{ fontSize: '16px', color: '#dc2626' }} />
                    <span className="text-body-secondary" style={{ fontSize: '0.85rem' }}>Unpatched</span>
                  </div>
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="d-flex align-items-center gap-1"
                >
                  <IconifyIcon icon="solar:filter-bold" style={{ fontSize: '16px' }} />
                  <span>Filters</span>
                </Button>
                <Form.Select
                  size="sm"
                  style={{ width: 'auto', minWidth: 140 }}
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all-severity'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
                <Form.Select
                  size="sm"
                  style={{ width: 'auto', minWidth: 140 }}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value || 'all'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {pageRows.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <Table hover className="mb-0 align-middle table-dashboard">
                      <thead>
                        <tr className="table-header-bg">
                          <th>CVE-ID</th>
                          <th className="text-center">Severity</th>
                          <th>Package Name</th>
                          <th>Version</th>
                          <th>Layer</th>
                          <th className="text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageRows.map((row, idx) => {
                          // Generate NVD link from CVE-ID if not provided
                          const nvdLink = row.link || (row.id && row.id.startsWith('CVE-') ? `https://nvd.nist.gov/vuln/detail/${row.id}` : null);
                          // Use a composite key so the same CVE ID across different packages expands independently
                          const rowKey = `${row.id}::${row.packageName}::${row.version}`;
                          const isExpanded = !!expandedRows[rowKey];
                          const isLoading = !!loadingRows[rowKey];
                          const summary = summaries[rowKey];

                          const handleExpand = (e) => {
                            e.stopPropagation();
                            setExpandedRows((prev) => ({ ...prev, [rowKey]: !prev[rowKey] }));
                            if (!summaries[rowKey] && !loadingRows[rowKey]) {
                              setLoadingRows((prev) => ({ ...prev, [rowKey]: true }));
                              // Simulate async AI summary fetch
                              setTimeout(() => {
                                setSummaries((prev) => ({ ...prev, [rowKey]: 'This is an AI-assisted summary of the CVE.' }));
                                setLoadingRows((prev) => ({ ...prev, [rowKey]: false }));
                              }, 1200);
                            }
                          };

                          return (
                            <React.Fragment key={`${row.id}-${start + idx}`}>
                              <tr>
                                <td className="fw-semibold font-monospace">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    {nvdLink ? (
                                      <a
                                        href={nvdLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary text-decoration-none"
                                        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                                        onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                                        onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                                      >
                                        {row.id}
                                      </a>
                                    ) : (
                                      row.id
                                    )}
                                    <span className="table-expand-icon" style={{ color: '#888', cursor: 'pointer' }} onClick={handleExpand}>
                                      <IconifyIcon icon={isExpanded ? 'bx:chevron-up' : 'bx:chevron-down'} />
                                    </span>
                                  </span>
                                </td>
                              <td className="text-center">
                                {(() => {
                                  const severity = row.severity;
                                  const severityStyles = {
                                    'Critical': { bg: 'rgba(24,24,27,0.80)',    color: '#fff',    cvssColor: 'rgba(255,255,255,0.78)', divider: 'rgba(255,255,255,0.25)' },
                                    'High':     { bg: 'rgba(239,68,68,0.82)',   color: '#fff',    cvssColor: 'rgba(255,255,255,0.80)', divider: 'rgba(255,255,255,0.28)' },
                                    'Medium':   { bg: 'rgba(249,115,22,0.82)',  color: '#fff',    cvssColor: 'rgba(255,255,255,0.80)', divider: 'rgba(255,255,255,0.28)' },
                                    'Low':      { bg: 'rgba(253,230,138,0.88)', color: '#78350f', cvssColor: 'rgba(120,53,15,0.62)',   divider: 'rgba(120,53,15,0.18)'   },
                                    'N/A':      { bg: 'rgba(229,231,235,0.88)', color: '#4b5563', cvssColor: 'rgba(75,85,99,0.62)',    divider: 'rgba(75,85,99,0.18)'    },
                                  };
                                  const style = severityStyles[severity] || severityStyles['N/A'];
                                  const cvssLabel = row.metrics ?? 'N/A';
                                  return (
                                    <span
                                      className="d-inline-flex align-items-center rounded-pill"
                                      style={{
                                        background: style.bg,
                                        padding: '0.25rem 0.72rem',
                                        gap: 0,
                                        userSelect: 'none',
                                        whiteSpace: 'nowrap'
                                      }}
                                      title={cvssLabel ? `${severity} · ${cvssLabel}` : severity}
                                    >
                                      <span style={{ color: style.color, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.03em' }}>
                                        {severity}
                                      </span>
                                      {cvssLabel && (
                                        <>
                                          <span aria-hidden="true" style={{ display: 'inline-block', width: '1px', height: '0.75em', background: style.divider, margin: '0 0.42rem', borderRadius: '1px', flexShrink: 0 }} />
                                          <span style={{ color: style.cvssColor, fontWeight: 600, fontSize: '0.68rem', letterSpacing: '0.01em' }}>
                                            {cvssLabel}
                                          </span>
                                        </>
                                      )}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td>{row.packageName}</td>
                              <td>{row.version}</td>
                              <td>{row.layer}</td>
                              <td className="text-center">
                                {(() => {
                                  const display = displayStatus(row.status);
                                  const statusConfig = display === 'Patched'
                                    ? { icon: getStatusIcon('patched'), color: '#16a34a' }
                                    : display === 'Ignored'
                                      ? { icon: getStatusIcon('ignored'), color: '#d97706' }
                                      : { icon: getStatusIcon('unpatched'), color: '#dc2626' };
                                  return (
                                    <IconifyIcon 
                                      icon={statusConfig.icon} 
                                      className="table-status-icon"
                                      style={{ color: statusConfig.color }} 
                                      title={display}
                                    />
                                  );
                                })()}
                              </td>
                              </tr>
                              {isExpanded && (
                                <tr>
                                  <td colSpan={6} style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb', padding: '0.75rem 1rem' }}>
                                    <div className="table-expanded-content" style={{ color: '#222', minHeight: 32 }}>
                                      <span style={{ fontWeight: 500, color: '#0d6efd' }}>AI-assisted summary:</span>
                                      {isLoading ? (
                                        <span className="ms-2 text-muted">Generating summary...</span>
                                      ) : (
                                        <span className="ms-2">{summary}</span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 p-3 border-top bg-light">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted small">
                        Showing {formatNumber(start + 1)}–{formatNumber(Math.min(start + pageSize, filteredRows.length))} of {formatNumber(filteredRows.length)}
                      </span>
                      <Form.Select size="sm" className="w-auto" value={pageSize} onChange={handlePageSizeChange}>
                        {PAGE_SIZE_OPTIONS.map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </Form.Select>
                    </div>
                    <div className="d-flex align-items-center gap-1">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <IconifyIcon icon="bx:left-arrow-alt" />
                      </Button>
                      <span className="px-2 small">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <IconifyIcon icon="bx:right-arrow-alt" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-5 text-muted">
                  <IconifyIcon icon="solar:shield-check-bold-duotone" className="fs-48 text-success mb-2" />
                  <p className="mb-0">No CVE entries match the current filters.</p>
                </div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  );
}
