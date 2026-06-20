import { TARIFF, TREES_PER_TONNE_CO2 } from './config.js';

export const OPTIMIZATION = [
  { system: 'HVAC scheduling', currentRm: 11520, optimisedRm: 3600 },
  { system: 'Lighting automation', currentRm: 3360, optimisedRm: 840 },
  { system: 'Plug-load control', currentRm: 4200, optimisedRm: 2100 },
];

export function optimizationBreakdown() {
  const rows = OPTIMIZATION.map((r) => {
    const savingMonth = r.currentRm - r.optimisedRm;
    return { ...r, savingMonth, savingYear: savingMonth * 12 };
  });
  const totals = rows.reduce(
    (t, r) => {
      t.currentRm += r.currentRm;
      t.optimisedRm += r.optimisedRm;
      t.savingMonth += r.savingMonth;
      t.savingYear += r.savingYear;
      return t;
    },
    { currentRm: 0, optimisedRm: 0, savingMonth: 0, savingYear: 0 }
  );
  return { rows, totals };
}

export const RECOMMENDATIONS = [
  {
    rank: 1,
    title: 'Schedule HVAC to operating hours',
    priority: 'Critical',
    savingYearRm: 95040,
    payback: '~2-week payback',
  },
  {
    rank: 2,
    title: 'Automate lighting with motion sensors',
    priority: 'High',
    savingYearRm: 30240,
    payback: '~2.6-month payback',
  },
  {
    rank: 3,
    title: 'Cut overnight plug loads with smart strips',
    priority: 'Medium',
    savingYearRm: 25200,
    payback: '~1.2-month payback',
  },
];

export function sustainability(annualSavingRm) {
  const kwhAvoided = annualSavingRm / TARIFF.electricityPerKwh;
  const co2Kg = kwhAvoided * TARIFF.carbonKgPerKwh;
  const co2Tonnes = co2Kg / 1000;
  const trees = co2Tonnes * (1000 / TREES_PER_TONNE_CO2);
  return {
    kwhAvoided: Math.round(kwhAvoided),
    co2Tonnes: Math.round(co2Tonnes),
    trees: Math.round(trees),
  };
}

export function businessCase(annualSavingRm) {
  const subMonthlyLow = 500;
  const subMonthlyHigh = 1500;
  const subYearLow = subMonthlyLow * 12;
  const subYearHigh = subMonthlyHigh * 12;
  const midSubYear = (subYearLow + subYearHigh) / 2;
  return {
    annualSavingRm,
    subMonthlyLow,
    subMonthlyHigh,
    subYearLow,
    subYearHigh,
    returnMultiple: Math.round(annualSavingRm / midSubYear),
    paybackText: 'under one month',
  };
}
