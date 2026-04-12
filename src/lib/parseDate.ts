export function parseDateToYear(date: string): number | null {
  if (!date) return null;
  const s = date.toLowerCase()
    .replace(/b\.c\.e?\.?/g, "bce")
    .replace(/a\.d\.?/g, "ce")
    .replace(/\bca\.?\s*|\bcirca\s*/g, "")
    .trim();

  const bceRange = s.match(/(\d+)\s*[–\-]\s*(\d+)\s*bc[e]?/);
  if (bceRange) return -(parseInt(bceRange[1]) + parseInt(bceRange[2])) / 2;

  const bceToCe = s.match(/(\d+)\s*bc[e]?\s*[–\-]\s*(\d+)\s*c[e]?/);
  if (bceToCe) return (-parseInt(bceToCe[1]) + parseInt(bceToCe[2])) / 2;

  const bce = s.match(/(\d+)\s*bc[e]?/);
  if (bce) return -parseInt(bce[1]);

  const ceRange = s.match(/(\d{1,4})\s*[–\-]\s*(\d{1,4})/);
  if (ceRange) {
    const a = parseInt(ceRange[1]), b = parseInt(ceRange[2]);
    if (b > a && b <= 2100) return (a + b) / 2;
  }

  const century = s.match(/(\d+)(?:st|nd|rd|th)\s*century/);
  if (century) return (parseInt(century[1]) - 1) * 100 + 50;

  const year = s.match(/\b(\d{3,4})\b/);
  if (year) return parseInt(year[1]);

  return null;
}
