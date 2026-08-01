export function formatCurrency(value?: number | null): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(num);
}

export function formatNumber(value?: number | null): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  return new Intl.NumberFormat('es-CO').format(num);
}

export function formatPercent(value?: number | null, decimals = 1): string {
  const num = typeof value === 'number' && !isNaN(value) ? value : 0;
  return `${num.toFixed(decimals)}%`;
}
