# Bias Detector — National Bank Hackathon

An end-to-end trading psychology analytics app:

- Upload a trade history file (CSV/XLSX)
- Validate + ingest trades into Postgres
- Run feature engineering + behavioral bias detection
- Classify a “Trader Archetype”
- Visualize the results in a React dashboard (Plotly charts)
- Run “What‑If” counterfactual simulations (discipline constraints)
- Generate AI coaching (LLM-backed with fallback)

---

## Table of contents

- [Architecture](#architecture)
- [Run locally (Docker)](#run-locally-docker)
- [Data format](#data-format)
- [Backend API](#backend-api)
- [Pipeline walkthrough (CSV → dashboard)](#pipeline-walkthrough-csv--dashboard)
- [Core derived features (formulas)](#core-derived-features-formulas)
- [Bias scores: how they’re calculated (0–100)](#bias-scores-how-theyre-calculated-0100)
- [How scoring is clamped to 0–100](#how-scoring-is-clamped-to-0100)
- [Archetypes](#archetypes)
- [Temporal “bias timeline”](#temporal-bias-timeline)
- [Counterfactual / What‑If simulator](#counterfactual--whatif-simulator)
- [Dashboard visuals (what each chart means + how it’s built)](#dashboard-visuals-what-each-chart-means--how-its-built)
- [AI Coach](#ai-coach)
- [Persistence note (important)](#persistence-note-important)
- [Troubleshooting](#troubleshooting)

---

## Architecture

### Backend
- **FastAPI** app: `backend/app/main.py`
- Routers:
  - Upload: `backend/app/routers/upload.py`
  - Analysis: `backend/app/routers/analysis.py`
  - Counterfactual: `backend/app/routers/counterfactual.py`
  - Coach: `backend/app/routers/coach.py`
- Services:
  - Ingestion: `backend/app/services/ingestion.py`
  - Feature engineering: `backend/app/services/features.py`
  - Bias scoring orchestration: `backend/app/services/scoring.py`
  - Bias detectors (math): `backend/app/services/bias_detector.py`
  - Archetypes: `backend/app/services/archetypes.py`
  - Temporal rolling bias timeline: `backend/app/services/temporal.py`
  - Counterfactual simulator: `backend/app/services/counterfactual.py`
  - LLM coach: `backend/app/services/coach.py`
- Data model (SQLAlchemy): `backend/app/models.py`

### Frontend
- React app: `frontend/src/App.tsx`
- Pages/components:
  - Upload flow: `frontend/src/components/Upload.tsx`
  - Dashboard container: `frontend/src/components/Dashboard.tsx`
  - Charts: `frontend/src/components/*` (Plotly)
  - What‑If simulator UI: `frontend/src/components/Counterfactual.tsx`
  - AI Coach UI: `frontend/src/components/CoachPanel.tsx`
- API client: `frontend/src/api/client.ts`
- Types: `frontend/src/types/index.ts`

---

## Run locally (Docker)

```bash
docker-compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend health**: `http://localhost:8000/api/health`

---

## Data format

Upload a `.csv`, `.xlsx`, or `.xls` with these required columns:

- `timestamp`
- `asset`
- `side` (BUY/SELL)
- `quantity`
- `entry_price`
- `exit_price`
- `profit_loss`
- `balance`

### Column normalization & aliases
In `backend/app/services/ingestion.py`:

- Columns are normalized to lowercase and spaces become underscores.
- Known aliases are applied (examples):
  - `pnl`, `p&l`, `p_l` → `profit_loss`
  - `account_balance` → `balance`

### Row validation / removals
Rows may be removed if they fail validation:

- Missing critical fields: `timestamp, asset, side, quantity, balance`
- Invalid `side` (not BUY/SELL)
- Impossible values: `quantity <= 0` or `entry_price <= 0` or `exit_price <= 0`

If all rows are removed, upload fails with “No valid rows after validation”.

---

## Backend API

Routes are mounted under `/api` in `backend/app/main.py`.

- `POST /api/upload` (multipart file) → `{ session_id, trade_count, message }`
- `POST /api/analysis/{session_id}` → runs full analysis and returns dashboard payload
- `GET /api/analysis/{session_id}` → returns cached analysis results
- `GET /api/sessions` → lists sessions
- `POST /api/counterfactual/{session_id}` → what‑if simulation
- `POST /api/coach/{session_id}` → coaching response

---

## Pipeline walkthrough (CSV → dashboard)

### Step 1 — Upload (frontend → backend)
Component: `frontend/src/components/Upload.tsx`

1. User drops a file
2. Frontend calls `POST /api/upload`
3. On success, frontend immediately calls `POST /api/analysis/{session_id}`
4. The returned `AnalysisResult` is stored in React state (`frontend/src/App.tsx`) and the dashboard renders it.

### Step 2 — Parse + validate + ingest (backend)
Route: `backend/app/routers/upload.py` (`POST /api/upload`)

- `parse_file()` loads the file into pandas and validates/cleans rows.
- `ingest_dataframe()` bulk inserts trades in chunks (10k at a time) and creates an `AnalysisSession`.

### Step 3 — Run analysis (backend)
Route: `backend/app/routers/analysis.py` (`POST /api/analysis/{session_id}`)

- Loads session trades from DB into a DataFrame.
- Runs the orchestrator `run_full_analysis(df)` in `backend/app/services/scoring.py`.
- Saves results into `BiasResult`.
- Returns the response consumed directly by the dashboard:
  - `feature_summary`
  - session-level bias scores + details
  - `archetype`
  - `bias_timeline`
  - visualization payloads (`equity_curve`, `trade_frequency`, `holding_time_comparison`, `position_scatter`)

---

## Core derived features (formulas)

Feature engineering happens in `backend/app/services/features.py::compute_trade_features(df)`.

Let each trade row i have:
- timestamp (t_i)
- balance (B_i)
- profit/loss (P_i)
- quantity (q_i)
- entry price (e_i)

Win flag
is_win_i = (P_i > 0)

PnL percent (approx)
The denominator is the previous balance (shifted), defaulting to current balance for the first row:
pnl_percent_i = (P_i / previous_balance) * 100

Notional and position size %
notional_i = q_i * e_i
position_size_pct_i = (notional_i / abs(B_i)) * 100

Time since last trade and holding duration (proxy)
time_since_last_i =
- 0 for i = 0
- (t_i - t_{i-1}) in seconds for i > 0

Holding duration is currently set equal to time_since_last (a proxy when you don’t have true open/close timestamps).

Peak balance and drawdown %
peak_i = max(B_0, B_1, ..., B_i)
drawdown_i = ((B_i - peak_i) / peak_i) * 100

Streak index (win/loss streak tracking)
The code forms consecutive groups of wins vs losses and counts within each group:
- wins: +1, +2, +3, ...
- losses: -1, -2, -3, ...

Rolling trade density (1h / 4h)
For each trade time t_i, it counts how many trades occurred in the lookback window:
trades_1h_i = number of j such that t_i - 3600 <= t_j <= t_i
trades_4h_i = number of j such that t_i - 14400 <= t_j <= t_i

Post-loss / post-win flags
after_loss_i = not is_win_{i-1}
after_win_i = is_win_{i-1}

---

## Bias scores: how they’re calculated (0–100)

Bias detection happens in `backend/app/services/bias_detector.py`.

Each bias returns:
- `score`: continuous 0–100 (higher = worse)
- `details`: intermediate metrics and `sub_scores` for explainability

Sigmoid mapping to 0–100
Many sub-signals use a logistic sigmoid mapped to 0–100:
sigmoid(x; m, k) = 100 / (1 + exp(-k * (x - m)))

Where:
- m = midpoint (where output ≈ 50)
- k = steepness (higher makes it transition faster)

Overtrading score
Key signals:
1. Trades per hour:
trades_per_hour = N / duration_hours
freq_score = sigmoid(trades_per_hour; m=120, k=0.02)

2. Post-loss acceleration (trading faster after losses):
r = E[time_since_last | after_loss] / E[time_since_last | not after_loss]
Lower r ⇒ faster after losses ⇒ more overtrading signal.
accel_score = sigmoid(1 - r; m=0.05, k=30)

3. Clustering density (avg rolling 1h count):
cluster_density = E[trades_1h]
cluster_score = sigmoid(cluster_density; m=60, k=0.03)

4. Loss-streak correlation:
Pearson correlation between |streak_index| and trades_1h during losses; only counts if statistically meaningful.

Composite (exact weights in code):
overtrading = 0.40 * freq + 0.25 * accel + 0.20 * cluster + 0.15 * corr

Loss aversion score
Key signals:
1. Magnitude asymmetry:
magnitude_ratio = E[|P| | P<0] / E[|P| | P>0]
mag_score = sigmoid(log(1 + max(magnitude_ratio - 1, 0)); m=0.7, k=4)

2. Holding asymmetry:
hold_ratio = E[holding_duration | P<0] / E[holding_duration | P>0]
hold_score = sigmoid(hold_ratio - 1; m=0.5, k=4)

3. Loss skew (“fat tail”):
skew_ratio = E[|P| | P<0] / median(|P| | P<0)
skew_score = sigmoid(skew_ratio - 1; m=1.0, k=2.5)

4. Win-rate paradox (only if win rate is high AND magnitude ratio is poor):
paradox_score = sigmoid(win_rate * magnitude_ratio; m=1.5, k=2)

Composite:
loss_aversion = 0.45 * mag + 0.20 * hold + 0.15 * skew + 0.20 * paradox

Revenge trading score
Key signals:
1. Post-loss performance deterioration:
Delta = (E[P | after_win] - E[P | after_loss]) / sigma(P)
Scored with sigmoid (with different parameters depending on t-test significance).

2. Negative expectancy after losses:
If E[P | after_loss] < 0, score rises with magnitude.

3. Loss escalation:
Ratio of average absolute losses on 2nd loss in a streak vs the first.

4. Volatility spike after losses:
vol_ratio = sigma(P | after_loss) / sigma(P | after_win)

5. Aggression index (size after loss vs after win):
aggr = E[|notional| | after_loss] / E[|notional| | after_win]

Composite:
revenge = 0.20 * deterioration + 0.20 * expectancy + 0.25 * escalation + 0.20 * volatility + 0.15 * aggression

Anchoring score
Key signals:
1. Exits near entry:
r_i = abs(exit_i / entry_i - 1)
Anchored exit if r_i < 0.002 (within 0.2% of entry).

2. PnL clustering around zero:
Counts trades where |P| is extremely small relative to median |P|.

3. Round-number fixation:
Counts exits where exit price is very close to a rounded integer.

Composite:
anchoring = 0.40 * anchor_exit + 0.35 * zero_cluster + 0.25 * round_number

Overconfidence score
Key signals:
1. Size escalation after wins (ratio of notional sizes)
2. Faster trading during win streaks (cooldown ratio)
3. Concentration creep (unique assets in streak vs normal)
4. Streak overextension (bigger loss after long win streak)
5. Risk drift (bigger size near equity highs vs deep drawdown)

Composite:
overconfidence = 0.25 * size + 0.25 * win_streak_accel + 0.15 * concentration + 0.20 * overextension + 0.15 * risk_drift

---

## How scoring is clamped to 0–100

There are two layers:

1. Many sub-signals use the sigmoid mapping which outputs (0, 100) by design.
2. Final composite scores are passed through `clamp(value, 0, 100)` in `backend/app/utils.py`.

Bias “bands” shown in the UI use:
- `<30` → `disciplined`
- `<60` → `elevated`
- `>=60` → `high_risk`

---

## Archetypes

Archetype classification happens in `backend/app/services/archetypes.py::classify_archetype()`.

It uses a heuristic score derived from:
- position-size variability (std of `position_size_pct`)
- drawdown tolerance (absolute worst drawdown)
- trading frequency
- holding-time variability (std of `holding_duration`)
- plus the average of key bias scores (weighted heavily)

The frontend renders the label + description + key stats in `frontend/src/components/ArchetypeBadge.tsx`.

---

## Temporal “bias timeline”

The bias timeline is computed in `backend/app/services/temporal.py::rolling_bias_timeline(df)`.

Windowing (adaptive)
Let D be session duration in seconds.

- Window size:
  W = clip(0.20 * D, 3600, 8 * 3600)
- Step size:
  S = clip(0.05 * D, 900, 2 * 3600)

For each window [t, t + W) with at least 15 trades, the system recomputes all 5 bias scores.

Each timeline point includes:
- `window_start`, `window_end`
- `timestamp` = center of the window
- bias scores
- `dominant_bias` = argmax bias score in that window

This timeline drives:
- Bias Evolution line chart
- Bias Heatmap
- Equity curve “bias zones”

---

## Counterfactual / What‑If simulator

Backend simulator: `backend/app/services/counterfactual.py::simulate(df, ...)`
Frontend: `frontend/src/components/Counterfactual.tsx`

It replays a session under discipline constraints.

Constraints (math)

1) Max daily trades
Trades are ordered; per day, keep only the first N trades.

2) Cooldown minutes
Let cooldown be C seconds. Keep a trade only if:
t_i - t_last_kept >= C

3) Position size cap
If a trade exceeds a cap p%, it scales the trade down proportionally:
s = p / position_size_pct_i
P_i <- s * P_i, q_i <- s * q_i, position_size_pct_i <- p

4) Stop-loss %
Let running simulated balance before trade i be B.
If trade loss exceeds L% of B, truncate:
P_i <- -abs(B) * (L / 100)

Simulated equity
The simulator builds a running simulated balance:
B_sim_i = B_0 + sum_{j <= i} P_j

Metrics compared (original vs simulated)
Computed in `_compute_metrics()`:
- total trades
- total PnL = sum P
- final balance
- max drawdown (computed from cumulative peak)
- Sharpe proxy:
  Sharpe = (mean(P) / std(P)) * sqrt(252)
- volatility = std(P)
- win rate = Pr(P > 0)

The UI displays:
- original → simulated metric tiles (with % change)
- equity curve comparison plot

---

## Dashboard visuals (what each chart means + how it’s built)

The dashboard is composed in `frontend/src/components/Dashboard.tsx`.

### 1) Metrics bar
Data: `feature_summary` from `backend/app/services/features.py::compute_summary_stats(df)`

- **Win rate**:
  win_rate = (# of P > 0) / N * 100
- **Trades per hour**:
  tph = N / duration_hours
- **Sharpe proxy**:
  (mean(P) / std(P)) * sqrt(252)
- **Max drawdown %**: minimum of `drawdown` series (peak-to-trough)

### 2) Bias radar (and score bars)
Component: `frontend/src/components/BiasRadar.tsx`

- Plots the five final session-level bias scores in polar coordinates.
- Interprets higher scores as higher behavioral risk.

### 3) Archetype card
Component: `frontend/src/components/ArchetypeBadge.tsx`

- Displays archetype label/description and the archetype-driving stats.

### 4) Bias evolution (lines over time)
Component: `frontend/src/components/BiasEvolution.tsx`
Data: `bias_timeline`

- Each line is a bias score recomputed in rolling windows.
- Threshold lines at 30 and 60 align with the bias bands.

### 5) Bias heatmap (time × bias)
Component: `frontend/src/components/BiasHeatmapTimeline.tsx`
Data: `bias_timeline`

- Heatmap where X = window timestamps, Y = bias names, Z = bias score.

### 6) Equity curve (balance + drawdown + bias zones)
Component: `frontend/src/components/EquityCurve.tsx`
Data: `equity_curve` (+ optional `bias_timeline`)

- Balance line: B_i over time
- Drawdown overlay:
  drawdown_i = ((B_i - peak_i) / peak_i) * 100
- Bias zones: for each timeline window, compute:
  maxBias = max(overtrading, loss_aversion, revenge, anchoring, overconfidence)
  and color:
  - maxBias >= 60 → red (high risk)
  - maxBias >= 30 → amber (elevated)
  - else → green (disciplined)

### 7) Trade frequency heatmap (day × hour)
Component: `frontend/src/components/Heatmap.tsx`
Backend: `build_trade_frequency(df)` in `backend/app/services/features.py`

- Day-of-week:
  day = timestamp.dayofweek in [0,6]
- Hour-of-day:
  hour = timestamp.hour in [0,23]
- Each cell value is the count of trades in that (day, hour).

### 8) Holding duration (wins vs losses)
Component: `frontend/src/components/HoldingTime.tsx`
Backend: `build_holding_time_comparison(df)`

- Computes:
  - win mean/median of `holding_duration`
  - loss mean/median of `holding_duration`

**Note:** `holding_duration` is currently a proxy equal to time between consecutive trades.

### 9) Position size vs outcome scatter
Component: `frontend/src/components/PositionScatter.tsx`
Backend: `build_position_scatter(df)`

- X axis: `position_size_pct`
- Y axis: `profit_loss`
- Points are colored win/loss using `is_win`
- Used to visually assess whether larger sizing correlates with larger losses or volatility.

---

## AI Coach

Route: `POST /api/coach/{session_id}` (`backend/app/routers/coach.py`)

- Loads `BiasResult` for the session.
- Builds a structured “analysis” object from scores and details.
- Calls `backend/app/services/coach.py::generate_coaching()`.
- Returns JSON:
  - `feedback`
  - `discipline_plan`
  - `daily_checklist`
  - `journaling_prompts`

If no provider is configured or the call fails, it returns a template-based fallback.

---

## Persistence note (important)

On startup, the backend currently drops and recreates all tables in `backend/app/database.py::init_db()`.

That means sessions and results reset whenever the backend restarts.

---

## Troubleshooting

### Upload failed / Not Found
Usually indicates the frontend `/api` proxy is not reaching the backend (or path rewriting is incorrect).

### “Template-based (no API key)” for coach
This appears when:
- no valid LLM API key is available for the chosen provider, or
- the provider call fails and the service falls