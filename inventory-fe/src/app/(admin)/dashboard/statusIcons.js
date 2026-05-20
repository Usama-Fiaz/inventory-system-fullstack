const STATUS_ICON_MAP = {
  // Kernel-style trend glyphs (used across the app)
  improved: 'mdi:trending-up',
  regressed: 'mdi:trending-down',
  mixed: 'solar:transfer-vertical-bold',
  new: 'solar:add-circle-bold',
  deleted: 'solar:minus-circle-bold',
  review: 'mdi:alert-outline',
  patched: 'solar:check-circle-bold',
  unpatched: 'solar:danger-triangle-bold',
  ignored: 'solar:minus-circle-bold',
};

export function getStatusIcon(status) {
  if (!status) return STATUS_ICON_MAP.improved;
  const key = String(status).toLowerCase().trim();
  if (key === 'need review' || key === 'need_review' || key === 'needreview') return STATUS_ICON_MAP.review;
  return STATUS_ICON_MAP[key] || STATUS_ICON_MAP.improved;
}

export default getStatusIcon;
