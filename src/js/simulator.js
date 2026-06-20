import { BUILDING, BASELINE_WINDOW } from './config.js';

const BASELINE_WINDOW_END = BASELINE_WINDOW.endHour;
const TRUE_BASELINE_KW = 26;
const PEAK_HVAC_KW = 52;
const PEAK_LIGHTING_KW = 22;
const PEAK_OFFICE_KW = 14;

// Deterministic pseudo-random so the demo is stable across reloads.
function seededNoise(seed) {
  const x = Math.sin(seed * 99991.7) * 43758.5453;
  return x - Math.floor(x);
}

// HVAC tracks outdoor heat, peaking early afternoon.
function coolingCurve(hour) {
  const peak = 14;
  const spread = 4.5;
  return Math.exp(-((hour - peak) ** 2) / (2 * spread ** 2));
}

function totalKwAt(ts, opts = {}) {
  const wasteFactor = opts.wasteFactor ?? 1;
  const hour = ts.getHours() + ts.getMinutes() / 60;
  const day = ts.getDay();
  const isWorkday = BUILDING.workdays.includes(day);
  const isOpen = isWorkday && hour >= BUILDING.openHour && hour < BUILDING.closeHour;

  // Deep-night setback (02:00–05:00) keeps the meter at the true floor on any day,
  // preventing baseline-estimate pollution when the demo runs on a weekend.
  let baseline = TRUE_BASELINE_KW;
  if (hour >= 5 && hour < 7) baseline = TRUE_BASELINE_KW + 2;

  let hvac = 0;
  if (isOpen) {
    hvac = PEAK_HVAC_KW * coolingCurve(hour);
  } else if (isWorkday && hour >= BUILDING.closeHour && hour < 24) {
    const taper = hour >= 22 ? 0.3 : 1;
    hvac = 9 * wasteFactor * taper;
  } else if (!isWorkday && hour >= 9 && hour < 18) {
    hvac = 11 * wasteFactor * coolingCurve(hour);
  }

  let lighting = 0;
  if (isOpen) {
    lighting = PEAK_LIGHTING_KW * (0.6 + 0.4 * seededNoise(hour));
  } else if (
    // NOT during the 02:00–05:00 baseline window so the floor stays clean.
    (hour >= BUILDING.closeHour && hour < 24) ||
    (hour >= BASELINE_WINDOW_END && hour < BUILDING.openHour)
  ) {
    lighting = 4 * wasteFactor;
  }

  let office = 0;
  if (isOpen) {
    const occ = 1 - Math.abs(hour - 13) / 6;
    office = PEAK_OFFICE_KW * Math.max(0.3, occ);
  } else if (hour >= BUILDING.closeHour && hour < 24) {
    office = 3 * wasteFactor;
  }

  const noise = (seededNoise(ts.getTime() / 1.7e6) - 0.5) * 1.4;
  return Math.max(0, baseline + hvac + lighting + office + noise);
}

export function generateDay(dateAnchor, opts = {}) {
  const readings = [];
  const base = new Date(dateAnchor);
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 48; i++) {
    const ts = new Date(base.getTime() + i * 30 * 60 * 1000);
    readings.push({ timestamp: ts, totalKw: round1(totalKwAt(ts, opts)) });
  }
  return readings;
}

export function generateLast24h(now = new Date()) {
  const readings = [];
  const end = new Date(now);
  end.setMinutes(end.getMinutes() < 30 ? 0 : 30, 0, 0);
  for (let i = 47; i >= 0; i--) {
    const ts = new Date(end.getTime() - i * 30 * 60 * 1000);
    readings.push({ timestamp: ts, totalKw: round1(totalKwAt(ts)) });
  }
  return readings;
}

export function nextReading(lastTs) {
  const ts = new Date(lastTs.getTime() + 30 * 60 * 1000);
  return { timestamp: ts, totalKw: round1(totalKwAt(ts)) };
}

function round1(n) {
  return Math.round(n * 10) / 10;
}
