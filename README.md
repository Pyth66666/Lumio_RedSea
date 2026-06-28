# Lumio — Electricity Intelligence for Commercial Buildings

> **See the waste. Stop the waste.**
> Zero hardware. Reads the TNB smart meter you already have.


---
## Slides

[View project slides (PDF)](https://drive.google.com/file/d/1PbX2Of25d_D4euHnLV41izBOKY5yBSAb/view?usp=sharing)

---
## Project Description

Commercial buildings waste a significant share of their electricity budget on systems running when nobody is there — HVAC cooling empty floors, lights left on overnight, weekend consumption with zero occupancy. Lumio fixes this without installing any hardware.

Malaysia already has 4.5M+ TNB smart meters sending half-hourly readings to myTNB — sitting unused beyond billing. Lumio reads that single total figure, reconstructs where every kilowatt is going (HVAC, lighting, office equipment, baseline), costs the waste in ringgit at the live TNB tariff, and tells building managers exactly how to stop it. Live the same day.

Demo building: **Menara Lumio** — a 4,200 m² commercial office in Kuala Lumpur.

---

## Team

**Team Name:** Red Sea

| # | Name | Role |
|---|---|---|
| 1 | Eya Hia | Team Lead · Full-Stack & Product — disaggregation engine, dashboard, TNB integration |
| 2 | Lwin | Data & Analytics — detection rules, load-profile validation, savings model |
| 3 | Adeif | Business & Pitch — market research, business model, deck and demo |

---

## Technologies Used

| Layer | Technology |
|---|---|
| Markup | HTML5 |
| Styling | Vanilla CSS3 — custom design system, dark mode, fully responsive |
| Logic | Vanilla JavaScript (ES Modules) — no build step, no bundler |
| Charts | Chart.js v4.4.1 (MIT) — vendored locally, works offline |
| Fonts | Space Grotesk · Inter · JetBrains Mono (Google Fonts) |

No server, no database, no framework. The full engine runs client-side. Double-click `index.html` to run.

> AI Assistance: Code scaffolding and styling support provided by Claude (Anthropic).

---

## Challenge and Approach

**The problem.** Knowing which system is burning electricity requires sub-meters on every circuit — hardware costing ~RM 25,000+ per building, weeks to install, impossible to scale.

**The approach.** Lumio installs nothing. It reads the single total-kW reading the TNB smart meter already produces and reconstructs the per-system breakdown — a transparent, rule-based form of Non-Intrusive Load Monitoring (NILM).

```
baseline   = min(total_kw between 02:00–05:00)
remainder  = total_kw − baseline
occupied   = calendar(hour, weekday)         ← no sensor needed

if occupied:   lighting = remainder × 0.18 · hvac = remainder × 0.55
if empty:      lighting = remainder × 0.80 · hvac = remainder × 0.70  ← waste

waste_rm = (hvac + lighting while empty) × RM 0.74 / kWh
```

Accuracy is directional (±10–15%), which is standard for single-meter NILM. Every estimate carries an "est" badge in the UI. The approach changes the economics entirely — onboarding drops from weeks to the same day, and customer capex drops from ~RM 25,000 to zero.

---

## Usage Instructions

**Option A — open directly:**
Double-click `index.html` in any modern browser.

**Option B — local server** (recommended for ES modules):
```bash
python3 -m http.server 8000
# open http://localhost:8000
```

**Tabs:**
- **Dashboard** — live feed, KPI cards, alerts, optimization table, recommendations, sustainability and business case
- **How it works** — the disaggregation engine explained step by step
- **Data connection** — upload your own CSV, mock myTNB OAuth, download sample files, reset to live demo

**Feed toggle (Dashboard):**
Switch between *Total load* (raw meter view) and *Disaggregated* (the signature view: one line splitting into Baseline / HVAC / Lighting / Office).

**Upload your own data:**
Drag and drop a CSV onto the Data connection tab. The dashboard rebuilds from your data immediately.

```
CSV format:
timestamp,total_kw
2026-06-21 02:00,26.0
2026-06-21 02:30,25.9
```

Sample files are available to download from the Data connection tab — one busy building (with alerts) and one clean building (detector stays quiet).
