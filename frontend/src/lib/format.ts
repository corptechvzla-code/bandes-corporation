const LOCALE = 'es-AR';

export type WeightUnit = 'kg' | 'g';

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatWeight(value: number, unit: WeightUnit = 'kg', decimals?: number): string {
  if (unit === 'g') {
    const dec = decimals ?? 2;
    return `${formatNumber(value, dec)} g`;
  }
  const dec = decimals ?? 4;
  return `${formatNumber(value / 1000, dec)} kg`;
}

export function cleanWeight(val: string): number {
  if (!val) return 0;
  const normalized = val.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}
