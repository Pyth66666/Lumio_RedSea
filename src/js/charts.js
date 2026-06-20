import { PALETTE } from './config.js';

const FONT = "'JetBrains Mono', monospace";
const Chart = window.Chart;

if (Chart) {
  Chart.defaults.color = PALETTE.textDim;
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.borderColor = 'rgba(141,160,188,0.12)';
}

function timeLabel(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

const baseScales = {
  x: {
    grid: { display: false },
    ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8, font: { family: FONT, size: 10 } },
  },
  y: {
    grid: { color: 'rgba(141,160,188,0.10)' },
    ticks: { font: { family: FONT, size: 10 }, callback: (v) => `${v} kW` },
    beginAtZero: true,
  },
};

export function createMeterFeed(ctx, series, mode = 'total') {
  return new Chart(ctx, {
    type: 'line',
    data: buildFeedData(series, mode),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: mode === 'disaggregated',
          position: 'bottom',
          labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: PALETTE.navyPanel,
          titleFont: { family: FONT },
          bodyFont: { family: FONT },
          callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(1)} kW` },
        },
      },
      scales: baseScales,
      animation: { duration: 350 },
    },
  });
}

export function buildFeedData(series, mode) {
  const labels = series.map((r) => timeLabel(r.timestamp));
  if (mode === 'total') {
    return {
      labels,
      datasets: [
        {
          label: 'Total load',
          data: series.map((r) => r.totalKw),
          borderColor: PALETTE.electricBlue,
          backgroundColor: 'rgba(59,158,255,0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
        },
      ],
    };
  }
  const ds = (label, key, color) => ({
    label,
    data: series.map((r) => r[key]),
    borderColor: color,
    backgroundColor: hexA(color, 0.18),
    fill: true,
    stack: 'load',
    tension: 0.3,
    pointRadius: 0,
    borderWidth: 1.5,
  });
  return {
    labels,
    datasets: [
      ds('Baseline', 'baseline', PALETTE.baseline),
      ds('HVAC', 'hvac', PALETTE.electricBlue),
      ds('Lighting', 'lighting', PALETTE.amber),
      ds('Office', 'office', PALETTE.teal),
    ],
  };
}

export function setFeedMode(chart, series, mode) {
  const data = buildFeedData(series, mode);
  chart.data = data;
  chart.options.scales.y.stacked = mode === 'disaggregated';
  chart.options.scales.x.stacked = mode === 'disaggregated';
  chart.options.plugins.legend.display = mode === 'disaggregated';
  chart.update();
}

export function createDailyProfile(ctx, series) {
  const labels = series.map((r) => timeLabel(r.timestamp));
  const ds = (label, key, color) => ({
    label,
    data: series.map((r) => r[key]),
    backgroundColor: hexA(color, 0.75),
    borderWidth: 0,
    stack: 'profile',
  });
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        ds('Baseline', 'baseline', PALETTE.baseline),
        ds('HVAC', 'hvac', PALETTE.electricBlue),
        ds('Lighting', 'lighting', PALETTE.amber),
        ds('Office', 'office', PALETTE.teal),
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } } },
        tooltip: { backgroundColor: PALETTE.navyPanel },
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 8, font: { family: FONT, size: 10 } } },
        y: { stacked: true, grid: { color: 'rgba(141,160,188,0.10)' }, ticks: { font: { family: FONT, size: 10 }, callback: (v) => `${v}` }, beginAtZero: true },
      },
    },
  });
}

export function createBreakdown(ctx, summary) {
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Baseline', 'HVAC', 'Lighting', 'Office'],
      datasets: [
        {
          label: 'Average kW',
          data: [summary.avgBaseline, summary.avgHvac, summary.avgLighting, summary.avgOffice],
          backgroundColor: [PALETTE.baseline, PALETTE.electricBlue, PALETTE.amber, PALETTE.teal].map((c) => hexA(c, 0.8)),
          borderWidth: 0,
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: PALETTE.navyPanel, callbacks: { label: (c) => `${c.parsed.x.toFixed(1)} kW avg` } } },
      scales: {
        x: { grid: { color: 'rgba(141,160,188,0.10)' }, ticks: { font: { family: FONT, size: 10 }, callback: (v) => `${v} kW` }, beginAtZero: true },
        y: { grid: { display: false }, ticks: { font: { family: FONT, size: 11 } } },
      },
    },
  });
}

function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
