function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, toFiniteNumber(value) ?? 0));
}

export function isBinaryFlagEnabled(value) {
  return value === true || value === 1 || String(value ?? '').trim().toLowerCase() === 'true';
}

export function normalizeCapabilityName(capability) {
  return String(capability?.name ?? capability?.value ?? capability ?? '').trim().toLowerCase();
}

export function hasNamedCapability(capabilities, target) {
  const normalizedTarget = String(target ?? '').trim().toLowerCase();
  if (!normalizedTarget) return false;

  const items = Array.isArray(capabilities) ? capabilities : [];
  return items.some((capability) => normalizeCapabilityName(capability) === normalizedTarget);
}

export function getBinaryViolationEntries(reportOrViolations) {
  if (Array.isArray(reportOrViolations)) return reportOrViolations;

  const rawViolations = reportOrViolations?.binary_violations;
  if (Array.isArray(rawViolations)) return rawViolations;
  if (rawViolations && typeof rawViolations === 'object') return Object.values(rawViolations);

  return [];
}

function getBinaryViolationsSummary(report) {
  return report?.binary_violations_summary && typeof report.binary_violations_summary === 'object'
    ? report.binary_violations_summary
    : {};
}

function hasRelroProtection(compilerFlags = {}) {
  return isBinaryFlagEnabled(compilerFlags.full_relro)
    || isBinaryFlagEnabled(compilerFlags.partial_relro)
    || isBinaryFlagEnabled(compilerFlags.relro);
}

function getBinaryHardeningScore(compilerFlags = {}) {
  const flagScore =
    (isBinaryFlagEnabled(compilerFlags.canary) ? 1 / 6 : 0) +
    (isBinaryFlagEnabled(compilerFlags.pie) ? 1 / 6 : 0) +
    (isBinaryFlagEnabled(compilerFlags.nx) ? 1 / 6 : 0) +
    (isBinaryFlagEnabled(compilerFlags.cfi) ? 1 / 6 : 0) +
    (!isBinaryFlagEnabled(compilerFlags.debug) ? 1 / 6 : 0);

  const relroScore = isBinaryFlagEnabled(compilerFlags.full_relro)
    ? 1 / 6
    : isBinaryFlagEnabled(compilerFlags.partial_relro)
      ? 1 / 12
      : 0;

  return clamp01(flagScore + relroScore);
}

function findBinaryHardeningSummary(report, reportDiffs) {
  const diffSummary = reportDiffs?.binary?.summary ?? reportDiffs?.binary_diffs?.summary ?? null;
  const diffHardening = diffSummary?.net_hardening_score;

  if (diffHardening && typeof diffHardening === 'object') {
    return {
      previousRatio: toFiniteNumber(diffHardening.previous_ratio),
      currentRatio: toFiniteNumber(diffHardening.current_ratio),
    };
  }

  const summary = report?.binary_violations_summary;
  if (!summary || typeof summary !== 'object') return null;

  const hardening = summary.total_hardening_score;
  if (!hardening || typeof hardening !== 'object') return null;

  return {
    previousRatio: toFiniteNumber(hardening.previous_ratio),
    currentRatio: toFiniteNumber(hardening.current_ratio),
  };
}

export function isRootBinary(binary) {
  return isBinaryFlagEnabled(binary?.file_permissions?.uid_root);
}

export function hasAnyCapabilities(binary) {
  return (Array.isArray(binary?.capabilities) ? binary.capabilities : []).length > 0;
}

export function hasPrivilegeExposure(binary) {
  const isRoot = isRootBinary(binary);
  const hasCapabilities = hasAnyCapabilities(binary);
  const hasSetuid = isBinaryFlagEnabled(binary?.file_permissions?.setuid);

  return isRoot || (!isRoot && hasCapabilities) || (!isRoot && hasSetuid);
}

export function getBinaryExposureMetrics(reportOrViolations, reportDiffs = null) {
  const violations = getBinaryViolationEntries(reportOrViolations);
  const summary = Array.isArray(reportOrViolations) ? {} : getBinaryViolationsSummary(reportOrViolations);
  const hardeningSummary = Array.isArray(reportOrViolations)
    ? null
    : findBinaryHardeningSummary(reportOrViolations, reportDiffs);

  let rootCount = 0;
  let rootGidCount = 0;
  let setuidCount = 0;
  let setgidCount = 0;
  let groupExecCount = 0;
  let worldExecCount = 0;
  let withAnyCapabilitiesCount = 0;
  let nonRootWithCapabilitiesCount = 0;
  let nonRootWithSetuidCount = 0;
  let capSysAdminCount = 0;
  let privilegeExposureCount = 0;
  let compilerRiskCount = 0;
  let permissionRiskCount = 0;
  let hardeningScoreSum = 0;
  let noNxCount = 0;
  let noCanaryCount = 0;
  let noRelroCount = 0;
  let noPieCount = 0;
  let inferredWeakCompilerCount = 0;

  for (const violation of violations) {
    const compilerFlags = violation?.compiler_flags ?? {};
    const filePermissions = violation?.file_permissions ?? {};
    const capabilities = Array.isArray(violation?.capabilities) ? violation.capabilities : [];

    const isRoot = isBinaryFlagEnabled(filePermissions.uid_root);
    const hasSetuid = isBinaryFlagEnabled(filePermissions.setuid);
    const hasCapabilities = capabilities.length > 0;
    const hasCapSysAdmin = hasNamedCapability(capabilities, 'cap_sys_admin');
    const hasPrivilege = isRoot || (!isRoot && hasCapabilities) || (!isRoot && hasSetuid);
    const hardeningScore = getBinaryHardeningScore(compilerFlags);
    const hasCompilerRisk = !isBinaryFlagEnabled(compilerFlags.canary)
      || !isBinaryFlagEnabled(compilerFlags.pie)
      || !isBinaryFlagEnabled(compilerFlags.nx)
      || !hasRelroProtection(compilerFlags)
      || !isBinaryFlagEnabled(compilerFlags.cfi)
      || isBinaryFlagEnabled(compilerFlags.debug);
    const hasPermissionRisk = isRoot
      || isBinaryFlagEnabled(filePermissions.world_exec)
      || hasSetuid;

    if (isRoot) rootCount++;
    if (isBinaryFlagEnabled(filePermissions.gid_root)) rootGidCount++;
    if (hasSetuid) setuidCount++;
    if (isBinaryFlagEnabled(filePermissions.setgid)) setgidCount++;
    if (isBinaryFlagEnabled(filePermissions.group_exec)) groupExecCount++;
    if (isBinaryFlagEnabled(filePermissions.world_exec)) worldExecCount++;
    if (hasCapabilities) withAnyCapabilitiesCount++;
    if (!isRoot && hasCapabilities) nonRootWithCapabilitiesCount++;
    if (!isRoot && hasSetuid) nonRootWithSetuidCount++;
    if (hasCapSysAdmin) capSysAdminCount++;
    if (hasPrivilege) privilegeExposureCount++;
    if (hasCompilerRisk) compilerRiskCount++;
    if (hasPermissionRisk) permissionRiskCount++;
    hardeningScoreSum += hardeningScore;
    if (!isBinaryFlagEnabled(compilerFlags.nx)) noNxCount++;
    if (!isBinaryFlagEnabled(compilerFlags.canary)) noCanaryCount++;
    if (!hasRelroProtection(compilerFlags)) noRelroCount++;
    if (!isBinaryFlagEnabled(compilerFlags.pie)) noPieCount++;
    if (hasCompilerRisk) inferredWeakCompilerCount++;
  }

  const totalAnalyzed = Math.max(
    toFiniteNumber(summary.total_binaries_scanned) ?? 0,
    violations.length,
  );
  const totalWeakBinaries = Math.max(
    0,
    toFiniteNumber(summary.total_incomplete_compiler_hardening) ?? inferredWeakCompilerCount,
  );
  const totalWithCapabilities = Math.max(
    0,
    toFiniteNumber(summary.total_with_capabilities) ?? withAnyCapabilitiesCount,
  );
  const totalInsecureFilePermissions = Math.max(
    0,
    toFiniteNumber(summary.total_insecure_file_permissions) ?? permissionRiskCount,
  );
  const computedHardeningRatio = totalAnalyzed ? clamp01(hardeningScoreSum / totalAnalyzed) : 0;
  const previousHardeningRatio = hardeningSummary?.previousRatio ?? null;
  const currentHardeningRatio = hardeningSummary?.currentRatio ?? computedHardeningRatio;

  return {
    totalAnalyzed,
    totalViolationEntries: violations.length,
    totalWeakBinaries,
    totalWithCapabilities,
    totalInsecureFilePermissions,
    binaryHardeningScore: currentHardeningRatio,
    binaryHardeningSummary: {
      previousRatio: previousHardeningRatio,
      currentRatio: currentHardeningRatio,
    },
    privilegeExposureCount,
    privilegeExposureRatio: totalAnalyzed ? clamp01(privilegeExposureCount / totalAnalyzed) : 0,
    rootCount,
    rootGidCount,
    setuidCount,
    setgidCount,
    groupExecCount,
    worldExecCount,
    withAnyCapabilitiesCount,
    nonRootWithCapabilitiesCount,
    nonRootWithSetuidCount,
    capSysAdminCount,
    compilerRiskCount,
    permissionRiskCount,
    noNxCount,
    noCanaryCount,
    noRelroCount,
    noPieCount,
  };
}