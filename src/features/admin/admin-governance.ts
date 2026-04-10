export type AdminGovernanceSummaryItem = {
  label: string;
  value: number | string;
  helper?: string;
  href?: string;
};

export type MissingGovernanceItem = {
  label: string;
  href?: string;
  reason: string;
};

function normalizeCount(value: number | string) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed || trimmed === 'unset' || trimmed === 'none' || trimmed === 'n/a') return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 1;
}

export function buildAdminGovernanceContext(items: AdminGovernanceSummaryItem[]) {
  const missingItems: MissingGovernanceItem[] = items.flatMap((item) => {
    const count = normalizeCount(item.value);
    if (count > 0) return [];
    return [{
      label: item.label,
      href: item.href,
      reason: item.helper ?? `${item.label} has not been configured yet.`,
    }];
  });

  return {
    missingItems,
    missingCount: missingItems.length,
    isReady: missingItems.length === 0,
  };
}
