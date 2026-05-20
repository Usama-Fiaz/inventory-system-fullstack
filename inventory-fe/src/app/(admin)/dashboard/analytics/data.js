import { currency } from '@/context/constants';
// Severity breakdown requires backend-provided severity/CVSS.

export const countries = [{
  icon: 'circle-flags:us',
  name: 'United States',
  value: 82.5,
  amount: 659,
  variant: 'secondary'
}, {
  icon: 'circle-flags:ru',
  name: 'Russia',
  value: 70.5,
  amount: 485,
  variant: 'info'
}, {
  icon: 'circle-flags:cn',
  name: 'China',
  value: 65.8,
  amount: 355,
  variant: 'warning'
}, {
  icon: 'circle-flags:ca',
  name: 'Canada',
  value: 55.8,
  amount: 204,
  variant: 'success'
}];
export const browsers = [{
  name: 'Chrome',
  percentage: 62.5,
  amount: 5.06
}, {
  name: 'Firefox',
  percentage: 12.3,
  amount: 1.5
}, {
  name: 'Safari',
  percentage: 9.86,
  amount: 1.03
}, {
  name: 'Brave',
  percentage: 3.15,
  amount: 0.3
}, {
  name: 'Opera',
  percentage: 3.01,
  amount: 1.58
}, {
  name: 'Falkon',
  percentage: 2.8,
  amount: 0.01
}, {
  name: 'Other',
  percentage: 6.38,
  amount: 3.6
}];
export const pagesList = [{
  path: '/dashboard',
  views: 4265,
  avgTime: '09m:45s',
  exitRate: 20.4,
  variant: 'danger'
}, {
  path: '/apps/chat',
  views: 2584,
  avgTime: '05m:02s',
  exitRate: 12.25,
  variant: 'warning'
}, {
  path: '/auth/sign-in',
  views: 3369,
  avgTime: '04m:25s',
  exitRate: 5.2,
  variant: 'success'
}, {
  path: '/apps/email',
  views: 985,
  avgTime: '02m:03s',
  exitRate: 64.2,
  variant: 'danger'
}, {
  path: '/apps/social',
  views: 653,
  avgTime: '15m:56s',
  exitRate: 2.4,
  variant: 'success'
}];

// Format numbers with commas for better readability
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const parseImprovedTrend = (value) => {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['yes', 'true', 'improved', 'up', 'increase'].includes(normalized);
};

const normalizeTrendValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  return raw.endsWith('%') ? raw : `${raw}%`;
};

const toNumeric = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const numeric = Number(raw.replace(/,/g, '').replace('%', ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const pickNumeric = (sources, keys) => {
  for (const source of sources) {
    if (!source || typeof source !== 'object') continue;
    for (const key of keys) {
      const value = toNumeric(source[key]);
      if (value != null) return value;
    }
  }
  return null;
};

const formatPercent = (value) => {
  if (!Number.isFinite(value)) return null;
  const fixed = Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
  return `${fixed.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')}%`;
};

const toNumericTrendValue = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const numeric = Number(raw.replace('%', ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const parseTrendNode = (node) => {
  if (!node || typeof node !== 'object') return null;
  if (node.value === undefined && node.change === undefined) return null;
  const value = normalizeTrendValue(node.value ?? node.change);
  if (!value) return null;
  return {
    improved: node.improved === undefined ? null : parseImprovedTrend(node.improved),
    value,
    numericValue: toNumericTrendValue(node.value ?? node.change),
  };
};

const resolveFilesystemTrend = (reportDiffs) => {
  const filesystemsDelta =
    reportDiffs?.filesystems_delta ??
    reportDiffs?.filesystems ??
    reportDiffs?.filesystems_diffs ??
    null;
  const trends = filesystemsDelta?.trends ?? null;
  if (!trends || typeof trends !== 'object') return null;
  const fallbackImproved =
    trends.improved ??
    trends?.total_no_exec?.improved ??
    trends?.total_no_suid?.improved;
  const parsed = parseTrendNode({
    improved: fallbackImproved,
    value: trends.change,
  });
  return parsed;
};

const resolveFilesystemNetTrend = (reportDiffs, currentTotal, fallbackTrend) => {
  const filesystemsDelta =
    reportDiffs?.filesystems_delta ??
    reportDiffs?.filesystems ??
    reportDiffs?.filesystems_diffs ??
    null;

  const trends = filesystemsDelta?.trends ?? null;
  const summary = filesystemsDelta?.summary ?? null;
  const sources = [trends, summary, filesystemsDelta];

  let current = pickNumeric(sources, ['current_total', 'current', 'total_current', 'new_total', 'latest_total']);
  if (current == null) current = Number.isFinite(currentTotal) ? currentTotal : null;

  let previous = pickNumeric(sources, ['previous_total', 'previous', 'total_previous', 'old_total', 'baseline_total', 'last_total']);
  let deltaAbs = pickNumeric(sources, ['delta', 'count_delta', 'total_delta', 'change_count', 'absolute_change', 'change_abs']);

  const percent =
    fallbackTrend?.numericValue ??
    pickNumeric(sources, ['change', 'percent_change', 'pct_change', 'delta_percent']);
  const hasPercent = Number.isFinite(percent) && percent > 0;

  const improvedSignal =
    (fallbackTrend?.improved === true || fallbackTrend?.improved === false)
      ? fallbackTrend.improved
      : null;

  if (deltaAbs == null && current != null && previous != null) {
    deltaAbs = Math.abs(current - previous);
  }

  if (previous == null && current != null && deltaAbs != null && improvedSignal != null) {
    previous = improvedSignal ? current + deltaAbs : current - deltaAbs;
  }

  if (deltaAbs == null && hasPercent && current != null && improvedSignal != null) {
    const ratio = percent / 100;
    if (improvedSignal && ratio < 1) {
      previous = current / (1 - ratio);
      deltaAbs = previous - current;
    } else if (!improvedSignal) {
      previous = current / (1 + ratio);
      deltaAbs = current - previous;
    }
  }

  const roundedDelta = deltaAbs != null ? Math.max(0, Math.round(Math.abs(deltaAbs))) : null;
  const roundedPrevious = previous != null ? Math.max(0, Math.round(previous)) : null;
  const roundedCurrent = current != null ? Math.max(0, Math.round(current)) : null;

  let direction = 'neutral';
  if (roundedDelta > 0) {
    if (improvedSignal != null) {
      direction = improvedSignal ? 'improved' : 'regressed';
    } else if (roundedCurrent != null && roundedPrevious != null) {
      direction = roundedCurrent < roundedPrevious ? 'improved' : 'regressed';
    }
  }

  const percentDisplay = hasPercent ? formatPercent(percent) : null;
  const value =
    roundedDelta != null && roundedDelta > 0
      ? percentDisplay
        ? `${formatNumber(roundedDelta)} (${percentDisplay})`
        : `${formatNumber(roundedDelta)}`
      : percentDisplay ?? '0';

  return {
    ...(fallbackTrend ?? {}),
    value,
    display: value,
    deltaAbs: roundedDelta,
    percentValue: hasPercent ? percent : null,
    currentTotal: roundedCurrent,
    previousTotal: roundedPrevious,
    direction,
    improved: direction === 'improved' ? true : direction === 'regressed' ? false : fallbackTrend?.improved ?? null,
  };
};

const resolveFilesystemSubTrends = (reportDiffs) => {
  const filesystemsDelta =
    reportDiffs?.filesystems_delta ??
    reportDiffs?.filesystems ??
    reportDiffs?.filesystems_diffs ??
    null;
  const trends = filesystemsDelta?.trends ?? null;
  if (!trends || typeof trends !== 'object') {
    return { noexec: null, nosuid: null };
  }
  return {
    noexec: parseTrendNode(trends?.total_no_exec),
    nosuid: parseTrendNode(trends?.total_no_suid),
  };
};

/**
 * Derive Cerboscan-style stats from the report object.
 * Used by Stats component - pass report from Redux (selectReport).
 */
export function getStatData(report, reportDiffs = null) {
  if (!report) return [];

  const filesystemCount = report?.system_hardening?.mount_flag_violations?.length ?? 0;
  const kernelEnableCount = report?.system_hardening?.kernel_config?.need_to_enable?.length ?? 0;
  const kernelDisableCount = report?.system_hardening?.kernel_config?.need_to_disable?.length ?? 0;
  const binaryFilesCount = report?.binary_violations?.length ?? 0;

  const filesystemViolations = report?.system_hardening?.mount_flag_violations ?? [];
  const filesystemTrend = resolveFilesystemTrend(reportDiffs);
  const filesystemNetTrend = resolveFilesystemNetTrend(reportDiffs, filesystemCount, filesystemTrend);
  const filesystemSubTrends = resolveFilesystemSubTrends(reportDiffs);
  const uniqueMountPoints = new Set(filesystemViolations.map(v => v?.mountpoint || v?.path || v?.mountpath || '')).size;
  const commonFlags = filesystemViolations.reduce((acc, v) => {
    const flags = v?.flags || [];
    flags.forEach(flag => {
      const key = (flag || '').toString().toLowerCase();
      if (key) acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
  const mostCommonFlag = Object.keys(commonFlags).sort((a, b) => commonFlags[b] - commonFlags[a])[0] || 'N/A';
  const flagViolations = {
    noexec: commonFlags.noexec ?? 0,
    nosuid: commonFlags.nosuid ?? 0,
    nodev: commonFlags.nodev ?? 0,
    ro: commonFlags.ro ?? 0,
  };

  // Vulnerabilities (Unpatched)
  // We count "Unpatched" as anything that is neither Patched nor Ignored.
  const unpatchedIssues = [];
  const packageMap = new Map();
  // Severity breakdown (unpatched only) comes from backend `issue.severity`.
  const severityCounts = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0,
  };
  (report?.cve?.package ?? []).forEach(pkg => {
    if (Array.isArray(pkg?.issue)) {
      pkg.issue.forEach(issue => {
        const s = issue?.status;
        const isUnpatched = s !== 'Patched' && s !== 'Ignored';
        if (pkg?.name) packageMap.set(pkg.name, true);
        if (!isUnpatched) return;

        unpatchedIssues.push(issue);

        // Only count severity if backend provides it.
        const sevRaw = issue?.severity || issue?.Severity;
        if (typeof sevRaw === 'string') {
          const sev = sevRaw.toLowerCase();
          const normalized =
            sev === 'critical' ? 'Critical' :
            sev === 'high' ? 'High' :
            sev === 'medium' ? 'Medium' :
            sev === 'low' ? 'Low' :
            null;
          if (normalized) {
            severityCounts[normalized] += 1;
          }
        }
      });
    }
  });
  const criticalCount = severityCounts.Critical;
  const highCount = severityCounts.High;
  const mediumCount = severityCounts.Medium;
  const lowCount = severityCounts.Low;
  const uniquePackages = packageMap.size;

  const binaryViolations = report?.binary_violations ?? [];
  const hardeningStats = {
    pie: binaryViolations.filter(b => b?.pie === 0).length,
    relro: binaryViolations.filter(b => b?.relro === 0).length,
    canary: binaryViolations.filter(b => b?.canary === 0).length,
    nx: binaryViolations.filter(b => b?.nx === 0).length
  };
  const mostNeededFeature = Object.keys(hardeningStats).sort((a, b) => hardeningStats[b] - hardeningStats[a])[0] || 'N/A';

  return [{
  title: 'Filesystem Violations',
  icon: 'tabler:server-2',
  stat: `${formatNumber(filesystemCount)} Mountpaths`,
  change: filesystemNetTrend?.value ?? '—',
  trend: filesystemNetTrend,
  value: filesystemCount,
  route: '/dashboard/filesystems',
  tooltip: 'Mount paths missing required security flags: each entry is a filesystem mount point with the required flags.',
  additionalStats: {
    uniqueMounts: uniqueMountPoints,
    commonFlag: mostCommonFlag,
    totalViolations: filesystemCount,
    flagViolations,
    flagTrends: filesystemSubTrends,
  }
}, {
  title: 'Kernel Configurations',
  icon: 'solar:cpu-bold-duotone',
  stat: `${kernelEnableCount} Enable ${kernelDisableCount} Disable`,
  change: '—',
  trend: null,
  enableCount: kernelEnableCount,
  disableCount: kernelDisableCount,
  route: '/dashboard/kernel-configs',
  tooltip: 'Kernel settings requiring action: Enable configs strengthen security, Disable configs remove vulnerable features.'
}, {
  title: 'Vulnerabilities',
  icon: unpatchedIssues.length > 0 ? 'tabler:shield-search' : 'tabler:shield-check',
  stat: `${formatNumber(unpatchedIssues.length)} Unpatched CVEs`,
  change: '0.3%',
  value: unpatchedIssues.length,
  route: '/dashboard/vulnerabilities',
  tooltip: 'Open (unpatched) CVEs: vulnerabilities that are neither Patched nor Ignored.',
  additionalStats: {
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    packages: uniquePackages
  }
}, {
  title: 'Binary Hardening',
  icon: 'solar:shield-check-bold-duotone',
  stat: `${formatNumber(binaryFilesCount)} Files`,
  change: '10.6%',
  value: binaryFilesCount,
  route: '/dashboard/binary-hardening',
  tooltip: 'Number of binary executable files that require security hardening. Binary hardening protects executables from exploitation by adding security features like stack canaries and position-independent code.',
  additionalStats: {
    pie: hardeningStats.pie,
    relro: hardeningStats.relro,
    canary: hardeningStats.canary,
    mostNeeded: mostNeededFeature.toUpperCase()
  }
}];
}
export const onlineUsers = [{
  name: 'Chrome',
  percentage: '62.5%',
  amount: 5000
}, {
  name: 'Firefox',
  percentage: '9.86',
  amount: 1030
}, {
  name: 'Safari',
  percentage: '12.3%',
  amount: 1500
}, {
  name: 'Opera',
  percentage: '2.8%',
  amount: 9900
}, {
  name: 'Web',
  percentage: '1.05%',
  amount: 2500
}, {
  name: 'Other',
  percentage: '6.38%',
  amount: 3600
}, {
  name: 'Safari',
  percentage: '9.86',
  amount: 1.03
}, {
  name: 'Web',
  percentage: '1.05%',
  amount: 2500
}, {
  name: 'Other',
  percentage: '6.38%',
  amount: 3600
}, {
  name: 'Safari',
  percentage: '9.86',
  amount: 1.03
}, {
  name: 'Web',
  percentage: '1.05%',
  amount: 2500
}, {
  name: 'Other',
  percentage: '6.38%',
  amount: 3600
}, {
  name: 'Safari',
  percentage: '9.86',
  amount: 1.03
}];
export const topPages = [{
  path: 'rasket/dashboard',
  views: 4265,
  avgTime: '09m:45s',
  exitRate: 20.4,
  variant: 'danger'
}, {
  path: 'rasket/chat',
  views: 2584,
  avgTime: '05m:02s',
  exitRate: 12.25,
  variant: 'warning'
}, {
  path: 'rasket/auth-login',
  views: 3369,
  avgTime: '04m:25s',
  exitRate: 5.2,
  variant: 'success'
}, {
  path: 'rasket/email',
  views: 985,
  avgTime: '02m:03s',
  exitRate: 64.2,
  variant: 'danger'
}, {
  path: 'rasket/social',
  views: 653,
  avgTime: '15m:56s',
  exitRate: 2.4,
  variant: 'success'
}];