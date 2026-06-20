export function parseCsv(text) {
  const errors = [];
  const readings = [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push('The file is empty.');
    return { readings, errors };
  }

  // Skip header row if present.
  let start = 0;
  const first = lines[0].toLowerCase();
  if (first.includes('timestamp') || first.includes('time') || first.includes('kw')) {
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const parts = lines[i].split(/[,;\t]/).map((p) => p.trim());
    if (parts.length < 2) {
      errors.push(`Line ${i + 1}: expected 2 columns, got ${parts.length}.`);
      continue;
    }
    const ts = new Date(parts[0]);
    const kw = Number(parts[1]);
    if (Number.isNaN(ts.getTime())) {
      errors.push(`Line ${i + 1}: couldn't read the timestamp "${parts[0]}".`);
      continue;
    }
    if (Number.isNaN(kw)) {
      errors.push(`Line ${i + 1}: couldn't read the kW value "${parts[1]}".`);
      continue;
    }
    readings.push({ timestamp: ts, totalKw: kw });
  }

  readings.sort((a, b) => a.timestamp - b.timestamp);
  return { readings, errors };
}

export function toCsv(readings) {
  const header = 'timestamp,total_kw';
  const rows = readings.map((r) => `${formatLocalIso(r.timestamp)},${r.totalKw}`);
  return [header, ...rows].join('\n');
}

export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatLocalIso(d) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ` +
    `${p(d.getHours())}:${p(d.getMinutes())}`
  );
}
