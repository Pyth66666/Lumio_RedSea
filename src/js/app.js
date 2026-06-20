import { BUILDING, TARIFF } from './config.js';
import {
  disaggregateSeries,
  summariseSeries,
  estimatePowerFactor,
  efficiencyIndex,
} from './engine.js';
import { generateLast24h, nextReading, generateDay } from './simulator.js';
import { detectWaste, totalDetectedWasteRm, wasteLast24hRm } from './detection.js';
import {
  optimizationBreakdown,
  RECOMMENDATIONS,
  sustainability,
  businessCase,
} from './recommendations.js';
import { parseCsv, toCsv, downloadCsv } from './csv.js';
import {
  createMeterFeed,
  setFeedMode,
  createDailyProfile,
  createBreakdown,
} from './charts.js';

const state = {
  rawReadings: [],
  disagg: null,
  summary: null,
  alerts: [],
  feedMode: 'total',
  source: 'live',
  streamTimer: null,
};

const charts = {};

const rm = (n) => 'RM ' + Math.round(n).toLocaleString('en-MY');
const rm0 = (n) => 'RM ' + Math.round(n).toLocaleString('en-MY');
const kw = (n) => `${n.toFixed(1)} kW`;
const $ = (id) => document.getElementById(id);

export function boot() {
  wireTabs();
  wireFeedToggle();
  wireDataConnection();
  loadLiveDemo();
  startStreaming();
}

function recompute() {
  state.disagg = disaggregateSeries(state.rawReadings);
  state.summary = summariseSeries(state.disagg.series);
  state.alerts = detectWaste(state.disagg.series);
  renderAll();
}

function loadLiveDemo() {
  state.source = 'live';
  state.rawReadings = generateLast24h(new Date());
  recompute();
  setSourceBadge('Live simulated feed');
}

function loadFromCsv(readings) {
  state.source = 'csv';
  stopStreaming();
  state.rawReadings = readings;
  recompute();
  setSourceBadge('Uploaded CSV');
}

function setSourceBadge(text) {
  const el = $('source-badge');
  if (el) el.textContent = text;
}

function startStreaming() {
  stopStreaming();
  state.streamTimer = setInterval(() => {
    if (state.source !== 'live') return;
    const last = state.rawReadings[state.rawReadings.length - 1];
    const next = nextReading(last.timestamp);
    state.rawReadings.push(next);
    if (state.rawReadings.length > 48) state.rawReadings.shift();
    recompute();
  }, 3000);
}

function stopStreaming() {
  if (state.streamTimer) clearInterval(state.streamTimer);
  state.streamTimer = null;
}

function renderAll() {
  renderHero();
  renderKpis();
  renderFeedChart();
  renderAlerts();
  renderBreakdown();
  renderProfile();
  renderOptimization();
  renderRecommendations();
  renderSustainability();
  renderBusinessCase();
}

function renderHero() {
  const wasted = wasteLast24hRm(state.disagg.series);
  $('hero-wasted').textContent = rm(wasted);
}

function renderKpis() {
  const latest = state.disagg.series[state.disagg.series.length - 1];
  const s = state.summary;
  $('kpi-load').textContent = kw(latest.totalKw);
  $('kpi-occupancy').textContent = `${Math.round(latest.occupancy * 100)}%`;
  $('kpi-pf').textContent = estimatePowerFactor(latest).toFixed(2);
  $('kpi-efficiency').textContent = `${efficiencyIndex(latest)}`;
  $('kpi-baseline').textContent = kw(state.disagg.baseline);
  $('kpi-peak').textContent = kw(s.peak);
}

function renderFeedChart() {
  const ctx = $('chart-feed');
  if (!charts.feed) {
    charts.feed = createMeterFeed(ctx, state.disagg.series, state.feedMode);
  } else {
    setFeedMode(charts.feed, state.disagg.series, state.feedMode);
  }
}

function renderAlerts() {
  const wrap = $('alerts');
  wrap.innerHTML = '';
  if (state.alerts.length === 0) {
    wrap.innerHTML = `<div class="alert alert--clean">
      <div class="alert__title">No waste detected</div>
      <div class="alert__detail">This building is running clean for the loaded data. Nothing to recover right now.</div>
    </div>`;
    $('alerts-total').textContent = rm0(0);
    return;
  }
  for (const a of state.alerts) {
    const el = document.createElement('div');
    el.className = `alert alert--${a.severity}`;
    el.innerHTML = `
      <div class="alert__head">
        <span class="alert__title">${a.title}</span>
        <span class="badge badge--est">est</span>
      </div>
      <div class="alert__detail">${a.detail}</div>
      <div class="alert__cost">${rm0(a.costRm)}<span class="alert__per">/month</span></div>
      <span class="alert__sev sev--${a.severity}">${a.severity}</span>`;
    wrap.appendChild(el);
  }
  $('alerts-total').textContent = rm0(totalDetectedWasteRm(state.alerts));
}

function renderBreakdown() {
  const ctx = $('chart-breakdown');
  if (charts.breakdown) charts.breakdown.destroy();
  charts.breakdown = createBreakdown(ctx, state.summary);

  const s = state.summary.split;
  $('split-baseline').textContent = `${Math.round(s.baseline * 100)}%`;
  $('split-hvac').textContent = `${Math.round(s.hvac * 100)}%`;
  $('split-lighting').textContent = `${Math.round(s.lighting * 100)}%`;
  $('split-office').textContent = `${Math.round(s.office * 100)}%`;
}

function renderProfile() {
  const ctx = $('chart-profile');
  if (charts.profile) charts.profile.destroy();
  charts.profile = createDailyProfile(ctx, state.disagg.series);
}

function renderOptimization() {
  const { rows, totals } = optimizationBreakdown();
  const tbody = $('opt-rows');
  tbody.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.system}</td>
      <td class="num">${rm0(r.currentRm)}</td>
      <td class="num">${rm0(r.optimisedRm)}</td>
      <td class="num num--save">${rm0(r.savingMonth)}</td>
      <td class="num num--save">${rm0(r.savingYear)}</td>`;
    tbody.appendChild(tr);
  }
  $('opt-total-current').textContent = rm0(totals.currentRm);
  $('opt-total-optimised').textContent = rm0(totals.optimisedRm);
  $('opt-total-month').textContent = rm0(totals.savingMonth);
  $('opt-total-year').textContent = rm0(totals.savingYear);
}

function renderRecommendations() {
  const wrap = $('recommendations');
  wrap.innerHTML = '';
  for (const r of RECOMMENDATIONS) {
    const el = document.createElement('div');
    el.className = 'rec';
    el.innerHTML = `
      <div class="rec__rank">${r.rank}</div>
      <div class="rec__body">
        <div class="rec__title">${r.title}</div>
        <div class="rec__meta">
          <span class="pill pill--${r.priority.toLowerCase()}">${r.priority}</span>
          <span class="rec__pay">${r.payback}</span>
        </div>
      </div>
      <div class="rec__save">${rm0(r.savingYearRm)}<span class="rec__per">/yr</span></div>`;
    wrap.appendChild(el);
  }
}

function renderSustainability() {
  const { totals } = optimizationBreakdown();
  const s = sustainability(totals.savingYear);
  $('sus-kwh').textContent = s.kwhAvoided.toLocaleString('en-MY');
  $('sus-co2').textContent = s.co2Tonnes.toLocaleString('en-MY');
  $('sus-trees').textContent = s.trees.toLocaleString('en-MY');
}

function renderBusinessCase() {
  const { totals } = optimizationBreakdown();
  const bc = businessCase(totals.savingYear);
  $('bc-saving').textContent = rm0(bc.annualSavingRm);
  $('bc-sub').textContent = `${rm0(bc.subYearLow)}–${rm0(bc.subYearHigh)}`;
  $('bc-return').textContent = `${bc.returnMultiple}×`;
  $('bc-payback').textContent = bc.paybackText;
}

function wireTabs() {
  const tabs = document.querySelectorAll('[data-tab]');
  const panels = document.querySelectorAll('[data-panel]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('is-active'));
      panels.forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('is-active');
      // charts need a resize nudge when their panel becomes visible
      Object.values(charts).forEach((c) => c && c.resize());
    });
  });
}

function wireFeedToggle() {
  const buttons = document.querySelectorAll('[data-feed]');
  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      buttons.forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      state.feedMode = b.dataset.feed;
      renderFeedChart();
    });
  });
}

function wireDataConnection() {
  const drop = $('dropzone');
  const fileInput = $('file-input');
  const status = $('upload-status');

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { readings, errors } = parseCsv(String(reader.result));
      if (readings.length === 0) {
        status.className = 'upload-status upload-status--error';
        status.textContent = errors[0] || 'No valid rows found. Expected: timestamp, total_kw.';
        return;
      }
      status.className = 'upload-status upload-status--ok';
      const noun = readings.length === 1 ? 'reading' : 'readings';
      status.textContent = `Loaded ${readings.length} ${noun}${errors.length ? ` (${errors.length} skipped)` : ''}. Dashboard rebuilt — open the Dashboard tab.`;
      loadFromCsv(readings);
    };
    reader.onerror = () => {
      status.className = 'upload-status upload-status--error';
      status.textContent = "Couldn't read that file. Try exporting a fresh CSV from myTNB.";
    };
    reader.readAsText(file);
  };

  drop.addEventListener('click', () => fileInput.click());
  drop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  ['dragenter', 'dragover'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-drag'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-drag'); })
  );
  drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  $('btn-mytnb').addEventListener('click', () => {
    const btn = $('btn-mytnb');
    btn.disabled = true;
    btn.textContent = 'Connecting to myTNB…';
    setTimeout(() => {
      btn.textContent = 'Authorising business account…';
      setTimeout(() => {
        btn.textContent = '✓ Connected — pulling interval data';
        loadLiveDemo();
        startStreaming();
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'Connect myTNB';
        }, 1800);
      }, 900);
    }, 900);
  });

  $('btn-sample-busy').addEventListener('click', () => {
    const day = generateDay(new Date(), { wasteFactor: 1 });
    downloadCsv('lumio-sample-menara-lumio.csv', toCsv(day));
  });
  $('btn-sample-clean').addEventListener('click', () => {
    const day = generateDay(new Date(), { wasteFactor: 0 });
    downloadCsv('lumio-sample-clean-building.csv', toCsv(day));
  });

  $('btn-reset').addEventListener('click', () => {
    loadLiveDemo();
    startStreaming();
    status.className = 'upload-status';
    status.textContent = 'Reset to the live simulated feed.';
  });
}

export const META = { BUILDING, TARIFF };
