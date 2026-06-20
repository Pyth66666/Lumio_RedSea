import { COEFFICIENTS, BASELINE_WINDOW, BUILDING } from './config.js';

export function occupancyFraction(date) {
  const day = date.getDay();
  const hour = date.getHours() + date.getMinutes() / 60;

  if (!BUILDING.workdays.includes(day)) return 0;
  if (hour < BUILDING.openHour || hour >= BUILDING.closeHour) return 0;

  const open = BUILDING.openHour;
  const close = BUILDING.closeHour;
  const mid = (open + close) / 2;
  const halfSpan = (close - open) / 2;
  // Triangular profile flattened at top; floor of 0.15 prevents open/close boundary
  // intervals from being misclassified as empty while daytime HVAC is already running.
  const frac = 1 - Math.abs(hour - mid) / halfSpan;
  return Math.max(0.15, Math.min(1, frac * 1.25));
}

export function findBaseline(readings) {
  const nightLoads = readings
    .filter((r) => {
      const h = r.timestamp.getHours();
      return h >= BASELINE_WINDOW.startHour && h < BASELINE_WINDOW.endHour;
    })
    .map((r) => r.totalKw);

  if (nightLoads.length === 0) {
    // Fallback: lowest 5% of all readings.
    const sorted = [...readings].map((r) => r.totalKw).sort((a, b) => a - b);
    const idx = Math.max(0, Math.floor(sorted.length * 0.05));
    return sorted[idx] ?? 0;
  }
  return Math.min(...nightLoads);
}

export function disaggregateReading(reading, baseline) {
  const { timestamp, totalKw } = reading;
  const remainder = Math.max(0, totalKw - baseline);
  const occ = occupancyFraction(timestamp);
  const occupied = occ > 0;

  let lighting;
  let hvac;

  if (occupied) {
    lighting = remainder * COEFFICIENTS.occupied.lighting;
    hvac = remainder * COEFFICIENTS.occupied.hvac;
  } else {
    lighting = remainder * COEFFICIENTS.empty.lighting;
    hvac = remainder * COEFFICIENTS.empty.hvac;
  }

  let office = remainder - hvac - lighting;
  if (office < 0) office = 0;

  const isWaste = !occupied && remainder > 0;
  const wasteKw = isWaste ? hvac + lighting : 0;

  return { timestamp, totalKw, baseline, hvac, lighting, office, occupancy: occ, isWaste, wasteKw };
}

export function disaggregateSeries(readings) {
  const baseline = findBaseline(readings);
  const series = readings.map((r) => disaggregateReading(r, baseline));
  return { baseline, series };
}

export function summariseSeries(series) {
  if (series.length === 0) {
    return {
      avgTotal: 0, avgBaseline: 0, avgHvac: 0, avgLighting: 0,
      avgOffice: 0, peak: 0,
      split: { baseline: 0, hvac: 0, lighting: 0, office: 0 },
    };
  }
  const n = series.length;
  const sum = series.reduce(
    (acc, r) => {
      acc.total += r.totalKw;
      acc.baseline += r.baseline;
      acc.hvac += r.hvac;
      acc.lighting += r.lighting;
      acc.office += r.office;
      acc.peak = Math.max(acc.peak, r.totalKw);
      return acc;
    },
    { total: 0, baseline: 0, hvac: 0, lighting: 0, office: 0, peak: 0 }
  );

  const avgTotal = sum.total / n;
  const split = avgTotal > 0
    ? {
        baseline: sum.baseline / sum.total,
        hvac: sum.hvac / sum.total,
        lighting: sum.lighting / sum.total,
        office: sum.office / sum.total,
      }
    : { baseline: 0, hvac: 0, lighting: 0, office: 0 };

  return {
    avgTotal,
    avgBaseline: sum.baseline / n,
    avgHvac: sum.hvac / n,
    avgLighting: sum.lighting / n,
    avgOffice: sum.office / n,
    peak: sum.peak,
    split,
  };
}

// More inductive HVAC load → lower power factor. Bounded estimate, shown with "est" badge.
export function estimatePowerFactor(reading) {
  const load = reading.totalKw || 1;
  const hvacShare = reading.hvac / load;
  const pf = 0.97 - hvacShare * 0.18;
  return Math.max(0.8, Math.min(0.98, pf));
}

export function efficiencyIndex(reading) {
  const load = reading.totalKw || 1;
  const wasteShare = reading.wasteKw / load;
  return Math.round(Math.max(0, Math.min(100, 100 - wasteShare * 100)));
}
