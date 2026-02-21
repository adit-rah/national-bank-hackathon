# Bias Detector — Setup Guide

## Prerequisites

You need two things installed on your machine:

1. **Docker Desktop** (includes Docker Compose)
   - macOS: https://docs.docker.com/desktop/install/mac-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/

2. **An LLM API key** (optional — app works fully without one):
   - **Google Gemini (recommended, free tier):** https://aistudio.google.com/apikey
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys

## Quick Start (3 steps)

### Step 1: Create your `.env` file

```bash
cp .env.example .env
```

### Step 2: Add your API key(s)

Open `.env` and fill in at least one key (or skip for template-based coaching):

```env
# Choose your provider: "openai", "anthropic", or "gemini"
LLM_PROVIDER=gemini

# Google Gemini (free tier — recommended)
GEMINI_API_KEY=your-gemini-key-here

# Or OpenAI / Anthropic
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

The database credentials are pre-configured and don't need to be changed.
If you leave all API keys empty, the AI Coach will use a template-based fallback that still provides personalized, data-driven coaching.

### Step 3: Launch

```bash
docker compose up --build
```

Wait for all three services to start (takes ~60 seconds on first build):
- `db` — PostgreSQL database
- `backend` — FastAPI on port 8000
- `frontend` — React dashboard on port 3000

Once you see `Uvicorn running on http://0.0.0.0:8000` in the logs, open:

**http://localhost:3000**

## Using the App

1. **Upload** — Drag and drop a CSV or Excel file with your trade data
2. **Dashboard** — View equity curve, bias scores, heatmaps, and trader archetype
3. **Counterfactual** — Toggle constraints (position cap, stop-loss, daily limit, cooldown) and simulate
4. **AI Coach** — Generate personalized coaching based on your analysis

### Sample Data

The `data/` folder contains four sample datasets you can use:
- `calm_trader.csv` — Systematic disciplined trader
- `overtrader.csv` — High-frequency impulsive trader
- `loss_averse_trader.csv` — Holds losses too long
- `revenge_trader.csv` — Increases risk after losses

### Expected CSV Format

Your CSV must contain these columns:

| Column | Description |
|--------|-------------|
| `timestamp` | Trade date/time (e.g. `2025-03-01 09:30:00`) |
| `asset` | Ticker symbol (e.g. `AAPL`, `TSLA`) |
| `side` | `BUY` or `SELL` |
| `quantity` | Number of shares/units |
| `entry_price` | Entry price per unit |
| `exit_price` | Exit price per unit |
| `profit_loss` | Realized P&L for the trade |
| `balance` | Account balance after the trade |

## API Endpoints

The backend exposes a REST API at `http://localhost:8000`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload CSV/XLSX file |
| `POST` | `/api/trades/manual` | Manual trade entry |
| `POST` | `/api/analysis/{session_id}` | Run bias analysis |
| `GET` | `/api/analysis/{session_id}` | Get cached results |
| `POST` | `/api/counterfactual/{session_id}` | Run simulation |
| `POST` | `/api/coach/{session_id}` | Generate AI coaching |
| `GET` | `/api/sessions` | List all sessions |
| `GET` | `/api/health` | Health check |

Interactive API docs: http://localhost:8000/docs

## Stopping the App

```bash
docker compose down
```

To also wipe the database volume:
```bash
docker compose down -v
```

## Troubleshooting

### "Port 3000/8000/5432 already in use"

Stop whatever is using that port, or change ports in `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change left side
```

### "Connection refused" from frontend

Make sure the backend is fully started. It waits for the DB health check, which takes ~10 seconds. Check logs with:
```bash
docker compose logs backend
```

### "LLM call failed" on Coach tab

- The system auto-falls back to template-based coaching if the LLM call fails
- Check that your API key is valid in `.env`
- Check that `LLM_PROVIDER` matches the key you provided
- You can switch providers from the Coach tab dropdown
- Google Gemini has the most generous free tier (15 requests/minute)

### "Missing required columns" on upload

Your CSV column names must match the expected format (case-insensitive). Common alternatives like `pnl` or `account_balance` are automatically mapped.

### Rebuilding after code changes

```bash
docker compose up --build
```

The backend and frontend both have hot-reload enabled via volume mounts, so most source changes are picked up automatically without rebuilding.
