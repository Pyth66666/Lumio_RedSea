export const TARIFF = {
  electricityPerKwh: 0.74,
  carbonKgPerKwh: 0.601,
};

export const BUILDING = {
  name: 'Menara Lumio',
  location: 'Kuala Lumpur',
  areaSqm: 4200,
  floors: 5,
  occupants: 280,
  annualBudgetRm: 360000,
  openHour: 7,
  closeHour: 19,
  workdays: [1, 2, 3, 4, 5],
};

// Tuned heuristics — not calibrated against measured ground truth.
export const COEFFICIENTS = {
  occupied: {
    lighting: 0.18,
    hvac: 0.55,
  },
  empty: {
    lighting: 0.80,
    hvac: 0.70,
  },
};

// Deep-night window used to find the always-on baseline (02:00–05:00).
export const BASELINE_WINDOW = { startHour: 2, endHour: 5 };

// ~25 kg CO2 absorbed per tree per year.
export const TREES_PER_TONNE_CO2 = 25;

export const PALETTE = {
  navy: '#0A1628',
  navyPanel: '#0F1E33',
  electricBlue: '#3B9EFF',
  amber: '#FFB347',
  teal: '#2DD4BF',
  baseline: '#94A3B8',
  textDim: '#8DA0BC',
};
