/**
 * ISO 8601 UTC tarih string'ini Türkçe locale ile formatlar.
 *
 * Kural:
 * - UTC saat 00:00 ise sadece "GG.AA.YYYY" döndürür.
 * - UTC saat farklıysa "GG.AA.YYYY HH:mm" döndürür (cihaz yerel saatine göre).
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  if (d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0) {
    const timeStr = d.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr} ${timeStr}`;
  }

  return dateStr;
}
