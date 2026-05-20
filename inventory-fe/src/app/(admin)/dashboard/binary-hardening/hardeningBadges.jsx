/** Shared Yes/No / RELRO pills for Binary Hardening tables */
export const YES_NO_PILL = {
  padding: '4px 10px',
  fontWeight: 600,
  fontSize: '11px',
  borderRadius: 6,
  border: '1px solid transparent',
  minWidth: '56px',
  textAlign: 'center',
  backgroundClip: 'padding-box',
  fontFamily: '"Ubuntu", "Cantarell", "Noto Sans", "DejaVu Sans", "Liberation Sans", "Segoe UI", Roboto, sans-serif',
  letterSpacing: '0.01em',
};

export const SAFE_PILL = {
  ...YES_NO_PILL,
  background: '#ecfdf5',
  color: '#059669',
  borderColor: '#10b981',
};

export const RISK_PILL = {
  ...YES_NO_PILL,
  background: '#fef2f2',
  color: '#dc2626',
  borderColor: '#f87171',
};

export const PARTIAL_PILL = {
  ...YES_NO_PILL,
  background: '#fffbeb',
  color: '#d97706',
  borderColor: '#fbbf24',
};

export function Pill({ children, style }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ value, yesIsSafe = true }) {
  const displayYes = value === 1 || value === true;
  const pillStyle = displayYes
    ? (yesIsSafe ? SAFE_PILL : RISK_PILL)
    : (yesIsSafe ? RISK_PILL : SAFE_PILL);

  return (
    <Pill style={pillStyle}>
      {displayYes ? 'Yes' : 'No'}
    </Pill>
  );
}

export function RelroBadge({ relro, partialRelro }) {
  if (partialRelro && !relro) {
    return (
      <Pill style={PARTIAL_PILL}>
        Partial
      </Pill>
    );
  }
  const displayYes = relro === 1 || relro === true;
  return (
    <Pill style={displayYes ? SAFE_PILL : RISK_PILL}>
      {displayYes ? 'Yes' : 'No'}
    </Pill>
  );
}

export function GroupExecBadge({ value }) {
  return <StatusBadge value={value} yesIsSafe={false} />;
}
