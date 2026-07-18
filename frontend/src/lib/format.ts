const LOCALE = 'es-AR';

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatWeight(value: number, decimals: number = 4): string {
  return `${formatNumber(value, decimals)} kg`;
}

export function cleanWeight(val: string): number {
  if (!val) return 0;
  const normalized = val.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}
