/**
 * Formatting helpers for dates, codes, and scores.
 */

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatPercentage(decimal) {
  if (decimal == null) return '0%';
  return `${(decimal * 100).toFixed(1)}%`;
}

export function truncate(text, max = 100) {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '...' : text;
}
