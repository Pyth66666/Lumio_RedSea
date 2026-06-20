import { TARIFF, BUILDING } from './config.js';

function monthlyCostRm(kw, hoursPerDay, daysPerWeek = 7) {
  const hoursPerMonth = hoursPerDay * (daysPerWeek / 7) * 30;
  return kw * hoursPerMonth * TARIFF.electricityPerKwh;
}

export function detectWaste(series) {
  const alerts = [];

  const afterHours = series.filter((r) => {
    const h = r.timestamp.getHours();
    const day = r.timestamp.getDay();
    const isWorkday = BUILDING.workdays.includes(day);
    return isWorkday && (h < BUILDING.openHour || h >= BUILDING.closeHour);
  });
  const weekend = series.filter((r) => !BUILDING.workdays.includes(r.timestamp.getDay()));

  // Rule 1: HVAC running after-hours
  const hvacAfterHours = afterHours.filter((r) => r.hvac > 3 && r.totalKw - r.baseline > 2);
  if (hvacAfterHours.length > 0) {
    const avgKw = avg(hvacAfterHours.map((r) => r.hvac));
    alerts.push({
      id: 'hvac-after-hours',
      title: 'HVAC running after-hours',
      detail: `Cooling averaging ${avgKw.toFixed(1)} kW outside ${pad(BUILDING.openHour)}–${pad(BUILDING.closeHour)} on workdays.`,
      severity: 'critical',
      costRm: round0(monthlyCostRm(avgKw, hoursAfterHours(), 5)),
      active: true,
    });
  }

  // Rule 2: Lights on in an empty building
  // Threshold > 2 kW remainder avoids tripping on baseline jitter in clean buildings.
  const lightsEmpty = series.filter(
    (r) => r.occupancy === 0 && r.lighting > 3 && r.totalKw - r.baseline > 2
  );
  if (lightsEmpty.length > 0) {
    const avgKw = avg(lightsEmpty.map((r) => r.lighting));
    const emptyHrs = 24 - (BUILDING.closeHour - BUILDING.openHour);
    alerts.push({
      id: 'lights-empty',
      title: 'Lights on in an empty building',
      detail: `Lighting averaging ${avgKw.toFixed(1)} kW at 0% scheduled occupancy.`,
      severity: 'high',
      costRm: round0(monthlyCostRm(avgKw, emptyHrs, 7)),
      active: true,
    });
  }

  // Rule 3: Weekend consumption
  const weekendActive = weekend.filter((r) => r.totalKw - r.baseline > 3);
  if (weekendActive.length > 0) {
    const avgKw = avg(weekendActive.map((r) => r.totalKw - r.baseline));
    alerts.push({
      id: 'weekend-consumption',
      title: 'Weekend consumption',
      detail: `Discretionary load averaging ${avgKw.toFixed(1)} kW while the building is closed.`,
      severity: 'medium',
      costRm: round0(monthlyCostRm(avgKw, 9, 2)),
      active: true,
    });
  }

  // Rule 4: High load, low occupancy
  const highLowOcc = series.filter((r) => r.office > 18 && r.occupancy < 0.25);
  if (highLowOcc.length > 0) {
    const avgKw = avg(highLowOcc.map((r) => r.office));
    alerts.push({
      id: 'high-load-low-occupancy',
      title: 'High load, low occupancy',
      detail: `Office load averaging ${avgKw.toFixed(1)} kW at under 25% occupancy.`,
      severity: 'medium',
      costRm: round0(monthlyCostRm(avgKw - 18, 6, 5)),
      active: true,
    });
  }

  return alerts;
}

export function totalDetectedWasteRm(alerts) {
  return alerts.filter((a) => a.active).reduce((s, a) => s + a.costRm, 0);
}

export function wasteLast24hRm(series) {
  const kwh = series.reduce((s, r) => s + r.wasteKw * 0.5, 0);
  return kwh * TARIFF.electricityPerKwh;
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}
function round0(n) { return Math.round(n); }
function hoursAfterHours() { return 24 - (BUILDING.closeHour - BUILDING.openHour); }
function pad(h) { return String(h).padStart(2, '0') + ':00'; }
