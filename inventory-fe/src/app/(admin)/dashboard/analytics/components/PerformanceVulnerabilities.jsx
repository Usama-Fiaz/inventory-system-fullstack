import { useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card, CardBody, CardTitle } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { selectReport, selectReportStatus, selectReportError } from '@/store/slices/reportSlice';
import { useLayoutContext } from '@/context/useLayoutContext';

const CHART_HEIGHT = 340;

const PerformanceVulnerabilities = () => {
  const { themeMode } = useLayoutContext();
  const report = useSelector(selectReport);
  const status = useSelector(selectReportStatus);
  const error = useSelector(selectReportError);
  const isDark = themeMode === 'dark';

  /**
   * Bar chart requirement:
   * - Only UNPATCHED packages
   * - Top 5 packages
   * - Each bar is STACKED by severity (Critical/High/Medium/Low)
   * - Y axis shows total count
   *
   * NOTE: severity is expected from backend (`issue.severity`).
   */
  const { categories, series } = useMemo(() => {
    const pkgs = report?.cve?.package ?? [];
    const perPkg = new Map();

    for (const pkg of pkgs) {
      const name = pkg?.name ?? '—';
      const issues = Array.isArray(pkg?.issue) ? pkg.issue : [];
      for (const issue of issues) {
        const status = issue?.status;
        const isUnpatched = status !== 'Patched' && status !== 'Ignored';
        if (!isUnpatched) continue;

        const sevRaw = (issue?.severity || issue?.Severity || 'N/A').toString();
        const sev = sevRaw.toLowerCase();
        const normalized =
          sev === 'critical' ? 'Critical' :
          sev === 'high' ? 'High' :
          sev === 'medium' ? 'Medium' :
          sev === 'low' ? 'Low' :
          null;
        if (!normalized) continue;

        if (!perPkg.has(name)) {
          perPkg.set(name, { Critical: 0, High: 0, Medium: 0, Low: 0, total: 0 });
        }
        const row = perPkg.get(name);
        row[normalized] += 1;
        row.total += 1;
      }
    }

    const top = [...perPkg.entries()]
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const cats = top.map((t) => t.name);
    const mk = (key) => top.map((t) => t[key] ?? 0);

    return {
      categories: cats,
      series: [
        { name: 'Critical', data: mk('Critical') },
        { name: 'High', data: mk('High') },
        { name: 'Medium', data: mk('Medium') },
        { name: 'Low', data: mk('Low') },
      ],
    };
  }, [report]);

  const options = useMemo(() => ({
    theme: {
      mode: isDark ? 'dark' : 'light',
    },
    chart: {
      height: CHART_HEIGHT,
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      background: 'transparent',
      redrawOnParentResize: true,
      redrawOnWindowResize: true,
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 400,
        dynamicAnimation: { enabled: true, speed: 400 },
      },
    },
    plotOptions: {
      bar: {
        columnWidth: '45%',
        barHeight: '85%',
        borderRadius: 6,
        distributed: false,
        dataLabels: {
          enabled: false,
          total: {
            enabled: true,
            offsetY: -4,
            style: {
              fontSize: '12px',
              fontWeight: 600,
              color: isDark ? '#e2e8f0' : '#373d3f',
            },
          },
        },
      },
    },
    dataLabels: { enabled: false },
    states: {
      hover: { filter: { type: 'none' } },
      active: { filter: { type: 'none' } },
    },
    stroke: { width: 0 },
    colors: [
        '#18181b', // Critical
        '#ef4444', // High
        '#f97316', // Medium
        '#fcd34d', // Low     — amber-300, a bit lighter
    ],
    xaxis: {
      categories,
      crosshairs: { show: false },
      title: {
        text: 'Unpatched packages',
        style: { fontSize: '12px', fontWeight: 500, color: isDark ? '#e2e8f0' : '#374151' }
      },
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: {
        show: true,
        maxHeight: 80,
        rotate: -15,
        hideOverlappingLabels: false,
        trim: true,
        style: { fontSize: '11px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#374151' }
      }
    },
    yaxis: {
      title: { text: 'Unpatched CVE', style: { fontSize: '12px', fontWeight: 600, color: isDark ? '#e2e8f0' : '#374151' } },
      axisBorder: { show: false },
      labels: {
        formatter: (val) => Math.round(val),
        style: { fontWeight: 400, color: isDark ? '#e2e8f0' : '#374151' }
      }
    },
    grid: {
      strokeDashArray: 3,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 10, right: 8 }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      markers: { radius: 10 },
      /**
       * ApexCharts legend interactivity:
       * - Clicking a legend item toggles that series on/off (default behavior).
       * - Double-click isolates a single series (depending on ApexCharts version/config).
       * If you want strict "click to isolate", we can implement it with chart events.
       */
      onItemClick: { toggleDataSeries: true },
      onItemHover: { highlightDataSeries: true },
    },
    tooltip: {
      y: { formatter: (val) => `${val}` }
    }
  }), [categories, isDark]);

  if (status === 'idle' || status === 'loading') {
    return (
      <Card className="border-0 shadow-sm h-100">
        <CardBody className="p-3">
          <CardTitle as="h5" className="mb-0">CVE Findings</CardTitle>
          <div className="text-center py-5 text-muted">Loading report...</div>
        </CardBody>
      </Card>
    );
  }

  if (status === 'failed' && !report) {
    return (
      <Card className="border-0 shadow-sm h-100">
        <CardBody className="p-3">
          <CardTitle as="h5" className="mb-0">CVE Findings</CardTitle>
          <div className="text-center py-5 text-danger">
            Failed to load report
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm h-100">
      <CardBody className="p-3">
      <CardTitle className="mb-0" style={{ fontSize: '18px', fontWeight: 600 }}>
      Top 5 Packages by Unpatched CVEs
      </CardTitle>
        <div dir="ltr" style={{ transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }}>
          {categories.length > 0 ? (
            <ReactApexChart
              options={options}
              series={series}
              type="bar"
              height={CHART_HEIGHT}
            />
          ) : (
            <div className="text-center py-5 text-muted">No unpatched CVE findings available.</div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default PerformanceVulnerabilities;
