import { getBinaryExposureMetrics } from '@/lib/binaryExposureMetrics';

export const SECURITY_OVERVIEW_AXES = [
  {
    id: 'binary',
    label: 'Binary Hardening',
    baseline: null,
    current: null,
    direction: 'maximize',
    tooltip: {
      eyebrow: 'Hardening score',
      summary: 'Weighted score from compiler-hardening.',
      formula: 'Score = Σ(compiler hardening score) / Σ(analyzed binaries)\n\ncompiler hardening score:\n(canary + pie + nx + cfi + !debug + relro) / 6\nrelro: full = 1, partial = 0.5',
    },
    accent: '#34d399',
    accentDark: 'rgba(52, 211, 153, 0.88)',
    accentLight: '#059669',
  },
  {
    id: 'privilege',
    label: 'Privilege Exposure',
    baseline: 0.66,
    current: 0.61,
    direction: 'minimize',
    tooltip: {
      eyebrow: 'Exposure share',
      summary: 'Share of binaries with elevated privilege surface.',
      formula: 'Exposure Ratio = Σ(root ∨ setuid ∨ capabilities) / Σ(analyzed binaries)',
    },
    accent: '#60a5fa',
    accentDark: 'rgba(96, 165, 250, 0.88)',
    accentLight: '#2563eb',
  },
  {
    id: 'filesystems',
    label: 'Insecure Mounts',
    baseline: 0.63,
    current: 0.72,
    direction: 'minimize',
    accent: '#f59e0b',
    accentDark: 'rgba(245, 158, 11, 0.88)',
    accentLight: '#d97706',
  },
  {
    id: 'kernel',
    label: 'Kernel Hardening',
    baseline: 0.69,
    current: 0.84,
    direction: 'maximize',
    tooltip: {
      eyebrow: 'Kernel score',
      summary: 'Equal weighted score from secure config and module integrity posture.',
      formula: 'Kernel Score = 0.5 × Config Score + 0.5 × Module Score\n\nConfig Score = (secure − insecure) / analyzed\n\nModule Score = (signed / installed) − (unsigned loaded / loaded)',
    },
    accent: '#a78bfa',
    accentDark: 'rgba(167, 139, 250, 0.88)',
    accentLight: '#7c3aed',
  },
];

export const SECURITY_SIDE_INSIGHTS = [
  {
    id: 'binary',
    label: 'Binary Analysis',
    icon: 'solar:code-square-linear',
    route: '/dashboard/binary-hardening',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.16)',
    units: '2,856',
    unitLabel: 'objects',
    delta: 9.4,
    coverage: 48,
    risks: 2,
    score: 76,
  },
  {
    id: 'kernel',
    label: 'Kernel Analysis',
    icon: 'solar:shield-check-linear',
    route: '/dashboard/kernel-configs',
    accent: '#a78bfa',
    accentSoft: 'rgba(167, 139, 250, 0.16)',
    units: '1,240',
    unitLabel: 'syscalls',
    delta: 12.1,
    coverage: 34,
    risks: 1,
    score: 84,
  },
  {
    id: 'filesystems',
    label: 'Filesystem Analysis',
    icon: 'solar:folder-with-files-linear',
    route: '/dashboard/filesystems',
    accent: '#f59e0b',
    accentSoft: 'rgba(245, 158, 11, 0.16)',
    units: '912',
    unitLabel: 'nodes',
    delta: -3.2,
    coverage: 52,
    risks: 5,
    score: 72,
  },
];

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatMetricCount(value) {
  const numeric = toFiniteNumber(value) ?? 0;
  return new Intl.NumberFormat('en-US').format(Math.max(0, Math.round(numeric)));
}

function countEntries(value) {
  if (Array.isArray(value)) return value.length;

  const numeric = toFiniteNumber(value);
  if (numeric !== null) return Math.max(0, Math.round(numeric));

  if (value && typeof value === 'object') return Object.keys(value).length;
  return 0;
}

function findSummaryCurrentValue(section, preferredKeys = []) {
  const summary = section?.summary;

  for (const key of preferredKeys) {
    const currentValue = toFiniteNumber(summary?.[key]?.current);
    if (currentValue !== null) return currentValue;
  }

  if (summary && typeof summary === 'object') {
    for (const value of Object.values(summary)) {
      const currentValue = toFiniteNumber(value?.current);
      if (currentValue !== null) return currentValue;
    }
  }

  const directCurrent = toFiniteNumber(section?.current);
  return directCurrent ?? null;
}

function getCoveragePercent(changedCount, totalCount) {
  if (!totalCount) return 0;
  return Math.min(100, Math.round((changedCount / totalCount) * 100));
}

function getAxisDeltaById(axes, id) {
  const axis = (Array.isArray(axes) ? axes : []).find((item) => item?.id === id);
  const baseline = toFiniteNumber(axis?.baseline);
  const current = toFiniteNumber(axis?.current);
  if (baseline === null || current === null) return 0;

  if (baseline === 0) {
    if (current === 0) return 0;
    return axis?.direction === 'minimize' ? -100 : 100;
  }

  return axis?.direction === 'minimize'
    ? ((baseline - current) / baseline) * 100
    : ((current - baseline) / baseline) * 100;
}

/**
 * Returns the absolute posture-point delta for a single axis.
 * Both current and baseline are normalised to "higher is better" (0–1)
 * before differencing, so the result is in the same pp units as
 * getOverviewComposite and is free of denominator bias.
 */
function getAxisAbsoluteDeltaById(axes, id) {
  const axis = (Array.isArray(axes) ? axes : []).find((item) => item?.id === id);
  const baseline = toFiniteNumber(axis?.baseline);
  const current = toFiniteNumber(axis?.current);
  if (baseline === null || current === null) return 0;

  const isMinimize = axis?.direction === 'minimize';
  const normCurrent = Math.max(0, Math.min(1, isMinimize ? 1 - current : current));
  const normBaseline = Math.max(0, Math.min(1, isMinimize ? 1 - baseline : baseline));
  return Number(((normCurrent - normBaseline) * 100).toFixed(1));
}

function countBinaryCoverage(binaryDiffs) {
  return ['added', 'removed', 'delta'].reduce((sum, key) => sum + countEntries(binaryDiffs?.[key]), 0);
}

function countKernelCoverage(kernelDiffs) {
  return ['added', 'improved', 'regressed', 'review'].reduce(
    (sum, key) => sum + countEntries(kernelDiffs?.[key]),
    0,
  );
}

function clampKernelScore(value) {
  const numeric = toFiniteNumber(value) ?? 0;
  return Math.max(-1, Math.min(1, numeric));
}

function safeRatio(numerator, denominator) {
  const num = toFiniteNumber(numerator) ?? 0;
  const den = toFiniteNumber(denominator) ?? 0;
  if (!den) return 0;
  return num / den;
}

function resolveCurrentValue(summary, key) {
  return toFiniteNumber(summary?.[key]?.current);
}

function resolvePreviousValue(summary, key) {
  return toFiniteNumber(summary?.[key]?.previous);
}

function resolveSummaryPair(summary, key) {
  const node = summary?.[key];
  if (!node || typeof node !== 'object') {
    return { previous: null, current: null };
  }

  return {
    previous: toFiniteNumber(node.previous),
    current: toFiniteNumber(node.current),
  };
}

function resolveFilesystemViolationScore(filesystemDelta = {}) {
  const summary = filesystemDelta?.summary && typeof filesystemDelta.summary === 'object'
    ? filesystemDelta.summary
    : filesystemDelta ?? {};

  const summaryPair = resolveSummaryPair(summary, 'net_violation_score');
  if (summaryPair.previous !== null || summaryPair.current !== null) {
    return {
      ...summaryPair,
      metric: 'violationScore',
    };
  }

  const directPair = resolveSummaryPair(filesystemDelta, 'net_violation_score');
  return {
    ...directPair,
    metric: directPair.previous !== null || directPair.current !== null ? 'violationScore' : null,
  };
}

function normalizeConfigCompliance(value, fallback = 'review') {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return fallback;
  if (raw.includes('insecure')) return 'insecure';
  if (raw.includes('secure')) return 'secure';
  if (raw.includes('review') || raw.includes('unknown')) return 'review';
  return fallback;
}

function filterNewRisks(items, type) {
  if (!items) return 0;
  const list = Array.isArray(items) ? items : Object.values(items);
  if (type === 'config') {
    return list.filter((item) =>
      normalizeConfigCompliance(
        item?.currCompliance ?? item?.Compliance ?? item?.compliance,
      ) === 'insecure',
    ).length;
  }
  if (type === 'module') {
    return list.filter((item) => item?.signed === false || item?.signed === 'false' || item?.signed == null).length;
  }
  return 0;
}

export function computeKernelHardeningDelta(configDelta = {}, moduleDelta = {}) {
  const configSummary = configDelta?.summary ?? {};
  const moduleSummary = moduleDelta?.summary ?? {};

  const configPrevious = safeRatio(
    resolvePreviousValue(configSummary, 'total_secure') - resolvePreviousValue(configSummary, 'total_insecure'),
    resolvePreviousValue(configSummary, 'total_analyzed'),
  );
  const configCurrent = safeRatio(
    resolveCurrentValue(configSummary, 'total_secure') - resolveCurrentValue(configSummary, 'total_insecure'),
    resolveCurrentValue(configSummary, 'total_analyzed'),
  );

  const modulePreviousSigned =
    resolvePreviousValue(moduleSummary, 'total_signed') ??
    Math.max((resolvePreviousValue(moduleSummary, 'total_installed') ?? 0) - (resolvePreviousValue(moduleSummary, 'total_unsigned') ?? 0), 0);
  const moduleCurrentSigned =
    resolveCurrentValue(moduleSummary, 'total_signed') ??
    Math.max((resolveCurrentValue(moduleSummary, 'total_installed') ?? 0) - (resolveCurrentValue(moduleSummary, 'total_unsigned') ?? 0), 0);

  const modulePrevious =
    safeRatio(modulePreviousSigned, resolvePreviousValue(moduleSummary, 'total_installed')) -
    safeRatio(resolvePreviousValue(moduleSummary, 'total_unsigned_and_loaded'), resolvePreviousValue(moduleSummary, 'total_loaded'));
  const moduleCurrent =
    safeRatio(moduleCurrentSigned, resolveCurrentValue(moduleSummary, 'total_installed')) -
    safeRatio(resolveCurrentValue(moduleSummary, 'total_unsigned_and_loaded'), resolveCurrentValue(moduleSummary, 'total_loaded'));

  const previousScore = clampKernelScore((configPrevious * 0.5) + (modulePrevious * 0.5));
  const currentScore = clampKernelScore((configCurrent * 0.5) + (moduleCurrent * 0.5));

  let percentChange = 0;
  if (previousScore === 0) {
    if (currentScore > 0) percentChange = 100;
    else if (currentScore < 0) percentChange = -100;
  } else {
    percentChange = ((currentScore - previousScore) / previousScore) * 100;
  }

  return {
    previousScore,
    currentScore,
    percentChange: Number(percentChange.toFixed(1)),
  };
}

export function computeFilesystemHardeningDelta(filesystemDelta = {}) {
  const violationScore = resolveFilesystemViolationScore(filesystemDelta);
  if (violationScore.metric === 'violationScore') {
    const previousScore = violationScore.previous ?? 0;
    const currentScore = violationScore.current ?? 0;

    let percentChange = 0;
    if (previousScore === 0) {
      percentChange = currentScore === 0 ? 0 : -100;
    } else {
      percentChange = ((previousScore - currentScore) / previousScore) * 100;
    }

    return {
      previousScore,
      currentScore,
      percentChange: Number(percentChange.toFixed(1)),
      metric: 'violationScore',
      isLowerBetter: true,
    };
  }

  const summary = filesystemDelta?.summary && typeof filesystemDelta.summary === 'object'
    ? filesystemDelta.summary
    : filesystemDelta ?? {};

  const previousScore = clampKernelScore(safeRatio(
    resolvePreviousValue(summary, 'total_secure_mounts'),
    resolvePreviousValue(summary, 'total_mountpaths'),
  ));
  const currentScore = clampKernelScore(safeRatio(
    resolveCurrentValue(summary, 'total_secure_mounts'),
    resolveCurrentValue(summary, 'total_mountpaths'),
  ));

  let percentChange = 0;
  if (previousScore === 0) {
    percentChange = currentScore > 0 ? 100 : 0;
  } else {
    percentChange = ((currentScore - previousScore) / previousScore) * 100;
  }

  return {
    previousScore,
    currentScore,
    percentChange: Number(percentChange.toFixed(1)),
    metric: 'secureRatio',
    isLowerBetter: false,
  };
}

export function buildSecurityOverviewAxes({ report, reportDiffs } = {}) {
  const binaryMetrics = getBinaryExposureMetrics(report, reportDiffs);
  const filesystemDelta = computeFilesystemHardeningDelta(
    reportDiffs?.filesystems ?? reportDiffs?.filesystems_diffs ?? reportDiffs?.filesystems_delta ?? {},
  );
  const kernelDelta = computeKernelHardeningDelta(
    reportDiffs?.kernel_config ?? reportDiffs?.kernel_config_diffs ?? {},
    reportDiffs?.kernel_modules ?? reportDiffs?.kernel_module_diffs ?? reportDiffs?.kernel_modules_diffs ?? reportDiffs?.kernel_module ?? {},
  );

  return SECURITY_OVERVIEW_AXES.map((axis) => {
    if (axis.id === 'binary') {
      const previousRatio = binaryMetrics.binaryHardeningSummary?.previousRatio;
      const currentRatio = binaryMetrics.binaryHardeningSummary?.currentRatio;
      return {
        ...axis,
        baseline: previousRatio,
        current: currentRatio,
      };
    }

    if (axis.id === 'privilege') {
      return {
        ...axis,
        current: binaryMetrics.totalAnalyzed ? binaryMetrics.privilegeExposureRatio : axis.current,
      };
    }

    if (axis.id === 'kernel') {
      return {
        ...axis,
        baseline: kernelDelta.previousScore,
        current: kernelDelta.currentScore,
      };
    }

    if (axis.id === 'filesystems') {
      return {
        ...axis,
        label: 'Insecure Mounts',
        direction: 'minimize',
        tooltip: {
          eyebrow: 'Violation score',
          summary: 'Weighted score based on missing secure flags.',
          formula: 'Violation Score: Σ(all mounts over missing flags × weighted score) / Σ(all mounts)\n\nMissing flag set:\n[ro, noexec, nodev, nosuid, verity, hidepid]'
        },
        baseline: filesystemDelta.previousScore,
        current: filesystemDelta.currentScore,
      };
    }

    return axis;
  });
}

export function buildSecuritySideInsights({ report, reportDiffs, axes = SECURITY_OVERVIEW_AXES } = {}) {
  const binaryMetrics = getBinaryExposureMetrics(report);
  const binaryDiffs = reportDiffs?.binary ?? reportDiffs?.binary_diffs ?? {};
  const filesystemDiffs = reportDiffs?.filesystems ?? reportDiffs?.filesystems_diffs ?? reportDiffs?.filesystems_delta ?? {};
  const kernelConfigDiffs = reportDiffs?.kernel_config ?? reportDiffs?.kernel_config_diffs ?? {};
  const kernelModuleDiffs =
    reportDiffs?.kernel_modules ?? reportDiffs?.kernel_module_diffs ?? reportDiffs?.kernel_modules_diffs ?? reportDiffs?.kernel_module ?? {};

  const filesystemHardeningDelta = computeFilesystemHardeningDelta(filesystemDiffs);
  const kernelHardeningDelta = computeKernelHardeningDelta({ summary: kernelConfigDiffs?.summary ?? {} }, { summary: kernelModuleDiffs?.summary ?? {} });

  const kernelConfigSummary = report?.system_hardening?.kernel_config?.summary ?? {};
  const kernelModulesSummary = report?.system_hardening?.kernel_modules?.summary ?? {};

  const binaryTotal = binaryMetrics.totalAnalyzed;
  const binaryChanged = countBinaryCoverage(binaryDiffs);
  const binaryCoverage = getCoveragePercent(binaryChanged, binaryTotal);
  const binaryRegressed = countEntries(binaryDiffs?.regressed ?? binaryDiffs?.delta); // Binary diffs usually use 'delta' or 'regressed'
  const binaryNewRisks = countEntries(binaryDiffs?.added); 

  const kernelConfigTotal =
    findSummaryCurrentValue(kernelConfigDiffs, ['total_analyzed']) ??
    toFiniteNumber(kernelConfigSummary.total_analyzed) ??
    Math.max(0, countEntries(report?.system_hardening?.kernel_config) - (report?.system_hardening?.kernel_config?.summary ? 1 : 0));
  const kernelModulesTotal =
    findSummaryCurrentValue(kernelModuleDiffs, ['total_installed']) ??
    toFiniteNumber(kernelModulesSummary.total_installed) ??
    Math.max(0, countEntries(report?.system_hardening?.kernel_modules) - (report?.system_hardening?.kernel_modules?.summary ? 1 : 0));

  const kernelConfigSecure =
    findSummaryCurrentValue(kernelConfigDiffs, ['total_secure']) ??
    toFiniteNumber(kernelConfigSummary.total_secure) ??
    0;

  const kernelModulesUnsigned =
    findSummaryCurrentValue(kernelModuleDiffs, ['total_unsigned']) ??
    toFiniteNumber(kernelModulesSummary.total_unsigned) ??
    0;
  const kernelModulesSigned =
    findSummaryCurrentValue(kernelModuleDiffs, ['total_signed']) ??
    toFiniteNumber(kernelModulesSummary.total_signed) ??
    Math.max(kernelModulesTotal - kernelModulesUnsigned, 0);

  const kernelConfigRegressed = countEntries(kernelConfigDiffs?.regressed);
  const kernelModulesRegressed = countEntries(kernelModuleDiffs?.regressed);
  // New risks are only the risky entries introduced by `added` in config/module diffs.
  const kernelConfigNew = filterNewRisks(kernelConfigDiffs?.added, 'config');
  const kernelModulesNew = filterNewRisks(kernelModuleDiffs?.added, 'module');
  const kernelConfigUnresolved = countEntries(kernelConfigDiffs?.unresolved);
  const kernelModulesUnresolved = countEntries(kernelModuleDiffs?.unresolved);

  const kernelConfigChanged = countKernelCoverage(kernelConfigDiffs);
  const kernelModulesChanged = countKernelCoverage(kernelModuleDiffs);
  const kernelTotal = kernelConfigTotal + kernelModulesTotal;
  const kernelChanged = kernelConfigChanged + kernelModulesChanged;
  const kernelSecure = kernelConfigSecure + kernelModulesSigned;
  const kernelRegressions = kernelConfigRegressed + kernelModulesRegressed;
  const kernelNewRisks = kernelConfigNew + kernelModulesNew;
  const kernelUnresolvedGaps = kernelConfigUnresolved + kernelModulesUnresolved;
  // Kernel sidecard total risks = regressions + new risks + unresolved gaps.
  const kernelTotalRisks = kernelUnresolvedGaps + kernelRegressions + kernelNewRisks;

  return SECURITY_SIDE_INSIGHTS.map((item) => {
    if (item.id === 'binary') {
      // Binary domain covers both compiler hardening and privilege exposure.
      // Average the two normalised absolute-pt deltas so the badge reflects
      // the full picture, consistent with how the composite score is built.
      const binaryAxisDelta = getAxisAbsoluteDeltaById(axes, 'binary');
      const privilegeAxisDelta = getAxisAbsoluteDeltaById(axes, 'privilege');
      const binaryDomainDelta = Number(((binaryAxisDelta + privilegeAxisDelta) / 2).toFixed(1));
      // Contribution to overall = sum of both axis deltas / totalAxes
      const binaryContribution = Number(((binaryAxisDelta + privilegeAxisDelta) / axes.length).toFixed(1));
      return {
        ...item,
        subtitle: 'Security Posture',
        delta: binaryDomainDelta,
        contribution: binaryContribution,
        axisIds: ['binary', 'privilege'],
        units: formatMetricCount(binaryTotal),
        unitLabel: 'objects',
        hideUnitLabel: true,
        coverage: binaryCoverage,
        driftCount: binaryChanged,
        risks: binaryChanged,
        regressions: binaryRegressed,
        newRisks: binaryNewRisks,
        formula: '(Current Hardening ratio − Prev ratio) × 100  [abs. pts, normalised 0–100]',
        hideSummary: true,
        summaryLabel: 'Drift',
        summaryValue: `${binaryCoverage}% drift`,
      };
    }

    if (item.id === 'kernel') {
      const kernelAxisDelta = getAxisAbsoluteDeltaById(axes, 'kernel');
      return {
        ...item,
        subtitle: 'Security Posture',
        delta: kernelAxisDelta,
        contribution: Number((kernelAxisDelta / axes.length).toFixed(1)),
        axisIds: ['kernel'],
        score: kernelHardeningDelta.currentScore,
        previousScore: kernelHardeningDelta.previousScore,
        units: formatMetricCount(kernelTotal),
        unitLabel: 'units',
        hideUnitLabel: true,
        hideSummary: true,
        coverage: getCoveragePercent(kernelChanged, kernelTotal),
        driftCount: kernelChanged,
        secureCount: kernelSecure,
        risks: kernelTotalRisks,
        regressions: kernelRegressions,
        newRisks: kernelNewRisks,
        formula: '(Current Kernel Score − Prev Score) × 100  [abs. pts, normalised 0–100]  where Score = (0.5 × Config) + (0.5 × Module)',
        summaryLabel: 'Drift',
        summaryValue: `${getCoveragePercent(kernelChanged, kernelTotal)}% drift`,
        sections: [
          {
            label: 'Config',
            units: formatMetricCount(kernelConfigTotal),
            coverage: getCoveragePercent(kernelConfigChanged, kernelConfigTotal),
            changed: kernelConfigChanged,
          },
          {
            label: 'Modules',
            units: formatMetricCount(kernelModulesTotal),
            coverage: getCoveragePercent(kernelModulesChanged, kernelModulesTotal),
            changed: kernelModulesChanged,
          },
        ],
      };
    }

    if (item.id === 'filesystems') {
      const filesystemTotal =
        findSummaryCurrentValue(filesystemDiffs, ['total_mountpaths']) ??
        toFiniteNumber(filesystemDiffs?.summary?.total_mountpaths?.current) ??
        0;
      const filesystemChanged =
        countEntries(filesystemDiffs?.mounts_added) +
        countEntries(filesystemDiffs?.mount_path_delta ?? filesystemDiffs?.mounts_delta);
      const fsCoverage = getCoveragePercent(filesystemChanged, filesystemTotal);
      const filesystemSecure =
        findSummaryCurrentValue(filesystemDiffs, ['total_secure_mounts']) ??
        toFiniteNumber(filesystemDiffs?.summary?.total_secure_mounts?.current) ??
        0;
      const filesystemRisks =
        findSummaryCurrentValue(filesystemDiffs, ['total_insecure_mounts']) ??
        toFiniteNumber(filesystemDiffs?.summary?.total_insecure_mounts?.current) ??
        0;
      
      const fsMountDelta = filesystemDiffs?.mount_path_delta ?? filesystemDiffs?.mounts_delta ?? [];
      const fsRegressed = Array.isArray(fsMountDelta)
        ? fsMountDelta.filter((m) => {
            const added = Array.isArray(m?.flags_added) ? m.flags_added.length : 0;
            const removed = Array.isArray(m?.flags_removed) ? m.flags_removed.length : 0;
            return removed > 0 && added === 0;
          }).length
        : countEntries(filesystemDiffs?.regressed ?? 0);
      const fsNew = countEntries(filesystemDiffs?.mounts_added ?? filesystemDiffs?.added);
      
      const fsAxisDelta = getAxisAbsoluteDeltaById(axes, 'filesystems');
      return {
        ...item,
        subtitle: 'Security Posture',
        delta: fsAxisDelta,
        contribution: Number((fsAxisDelta / axes.length).toFixed(1)),
        axisIds: ['filesystems'],
        score: filesystemHardeningDelta.currentScore,
        previousScore: filesystemHardeningDelta.previousScore,
        units: formatMetricCount(filesystemTotal),
        unitLabel: 'nodes',
        coverage: fsCoverage,
        driftCount: filesystemChanged,
        secureCount: filesystemSecure,
        risks: filesystemRisks,
        regressions: fsRegressed,
        newRisks: fsNew,
        formula: filesystemHardeningDelta.metric === 'violationScore'
          ? '(1 − Current Violation Score) − (1 − Prev Score)  [abs. pts, normalised 0–100]'
          : '(Current Secure Ratio − Prev Secure Ratio) × 100  [abs. pts, normalised 0–100]',
      };
    }
  });
}

/**
 * Computes the composite security posture score for a set of axes.
 *
 * All axes are normalised to a "higher = better" 0–1 scale before averaging:
 *   - direction: 'maximize'  →  normalised = value          (binary, kernel)
 *   - direction: 'minimize'  →  normalised = (1 − value)    (privilege, filesystems)
 *
 * Returns both the absolute score (0–100) for current and baseline, plus the
 * delta in percentage points (current − baseline), avoiding denominator bias.
 */
export function getOverviewComposite(items = SECURITY_OVERVIEW_AXES) {
  const safeItems = Array.isArray(items) ? items : [];

  let currentSum = 0;
  let baselineSum = 0;
  let count = 0;

  for (const item of safeItems) {
    const baseline = toFiniteNumber(item?.baseline);
    const current = toFiniteNumber(item?.current);
    if (baseline === null || current === null) continue;

    const isMinimize = item?.direction === 'minimize';
    const normalizedCurrent = Math.max(0, Math.min(1, isMinimize ? 1 - current : current));
    const normalizedBaseline = Math.max(0, Math.min(1, isMinimize ? 1 - baseline : baseline));

    currentSum += normalizedCurrent;
    baselineSum += normalizedBaseline;
    count++;
  }

  if (count === 0) return { currentScore: 0, baselineScore: 0, delta: 0 };

  const currentScore = (currentSum / count) * 100;
  const baselineScore = (baselineSum / count) * 100;
  const delta = currentScore - baselineScore;

  return {
    currentScore: Number(currentScore.toFixed(1)),
    baselineScore: Number(baselineScore.toFixed(1)),
    delta: Number(delta.toFixed(1)),
  };
}

/** @deprecated Use getOverviewComposite instead */
export function getOverviewDelta(items = SECURITY_OVERVIEW_AXES) {
  return getOverviewComposite(items).delta;
}

export function formatSignedPercent(value) {
  const numeric = Number(value ?? 0);
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}%`;
}

export function getDeltaDirection(value) {
  if (value > 0) return 'improvement';
  if (value < 0) return 'regression';
  return 'neutral';
}

export function getRiskTone(risks) {
  if (risks >= 5) return 'high';
  if (risks >= 2) return 'medium';
  return 'low';
}