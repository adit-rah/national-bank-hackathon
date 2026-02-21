# National Bank Bias Detector
## Full Implementation Plan (Winning Architecture)

## 1. Strategic Positioning

### Most teams will:

- Calculate basic averages
- Flag simple thresholds
- Show generic advice

### This project will instead deliver:

- A scalable financial analytics engine
- Quantified bias scoring with statistical validation
- Context-aware personalization
- Counterfactual simulations ("what would have happened if…")
- An AI-driven trading coach grounded in real metrics

**The key differentiator:**
> Bias detection will be signal-driven, not rule-of-thumb.

## 2. System Architecture

### 2.1 High-Level Architecture

**Tech Stack:**
- **Frontend:** React + Plotly
- **Backend API:** FastAPI
- **Analytics Engine:** Python (pandas, numpy, scikit-learn)
- **Database:** PostgreSQL
- **AI Layer:** OpenAI API
- **Deployment:** Dockerized services

**Architecture flow:**
1. Data ingestion
2. Normalization
3. Feature engineering
4. Bias detection engine
5. Bias scoring layer
6. Personalization layer
7. Visualization layer
8. AI insight generation

## 3. Data Ingestion Layer

### 3.1 Supported Inputs

- CSV upload
- Excel upload
- Manual entry form

**The judging dataset will be 20x larger. Therefore:**

- Use chunked processing
- Use vectorized pandas operations
- Avoid row-wise loops
- Pre-index timestamp fields

### 3.2 Data Schema

**Required fields:**
- `timestamp`
- `side` (buy/sell)
- `asset`
- `quantity`
- `entry_price`
- `exit_price`
- `pnl`
- `account_balance`

**Derived fields:**
- `holding_duration`
- `pnl_percent`
- `trade_risk_ratio`
- `drawdown_at_trade`
- `streak_index`
- `volatility_proxy`

## 4. Feature Engineering Layer

> **This is where most teams will be weak. This is where you win.**

### 4.1 Trade-Level Features

- Holding time (seconds, minutes, hours)
- Win/loss flag
- PnL percent relative to balance
- Position size as % of balance
- Time since last trade
- Trade clustering (rolling 1h / 4h window)
- Loss streak length
- Win streak length
- Balance drawdown %
- Volatility regime (rolling std of pnl or balance change)

### 4.2 Psychological Signal Features

**Loss aversion indicators:**
- Avg holding time (loss) / Avg holding time (win)
- Avg loss size / Avg win size
- Median vs mean loss divergence

**Overtrading indicators:**
- Trades per hour
- Trades per balance unit
- Post-loss trade frequency increase
- Trade frequency during volatility spikes

**Revenge trading indicators:**
- Position size delta after loss
- Risk spike following negative streak
- Reduced cooldown time after losses

## 5. Bias Detection Engine

**Each bias is scored 0–100.**

> Not binary. Continuous severity scoring.

### 5.1 Overtrading Detection

**Metrics:**
- Z-score of trade frequency vs baseline
- Correlation between loss streak and trade frequency
- Rolling trade cluster density

**Formula example:**

```python
Overtrading Score = weighted_sum(
    normalized(trades_per_hour),
    normalized(cluster_density),
    normalized(freq_increase_after_loss)
)
```

**Threshold bands:**
- **0–30:** disciplined
- **30–60:** elevated activity
- **60–100:** high impulsivity risk

### 5.2 Loss Aversion Detection

**Core signal:**
- `Holding_time_loss > Holding_time_win`
- `Avg_loss > Avg_win`
- Risk-reward imbalance

**Composite score built from:**
- Holding asymmetry ratio
- Loss magnitude asymmetry
- Stop-loss inconsistency

**Add statistical validation:**
- t-test between holding times
- significance indicator in dashboard

> This demonstrates rigor to judges.

### 5.3 Revenge Trading Detection

**Signals:**
- Position size increase after loss
- Risk spike after 2+ loss streak
- Reduced cooldown interval after loss

**Key metric:**

```python
Post-loss aggression index = 
    avg(position_size_after_loss) / avg(position_size_after_win)
```

> If > 1.2, strong revenge signal.

**Add classification model:**

Train gradient boosting classifier to predict:
> "Is next trade higher risk than baseline?"

**Use features:**
- recent pnl
- streak length
- time since loss
- volatility regime

This supports optional "future bias prediction."

## 6. Personalization Engine

> **This is where projects win or lose.**

### 6.1 Trader Risk Archetype Classification

**Cluster traders using:**
- Position size variability
- Drawdown tolerance
- Trade frequency
- Holding time distribution

Use KMeans or Gaussian Mixture.

**Output archetypes:**
- Systematic disciplined
- Aggressive opportunistic
- Emotionally reactive
- Conservative defensive

All recommendations adapt to archetype.

## 7. Counterfactual Simulator (Major Differentiator)

> **Judges love "what if" analysis.**

**Simulations:**
- Cap position size at X%
- Enforce fixed stop-loss
- Limit daily trade count
- Enforce cooldown period

**Recalculate:**
- Adjusted drawdown
- Adjusted Sharpe ratio
- Adjusted PnL
- Reduced volatility

**Display:**

> "If you limited trades to 10/day, max drawdown would drop by 23%."

This proves impact.

## 8. Visualization Layer

Built with React + Plotly.

### Required Visualizations

- Equity curve + drawdown overlay
- Trade frequency heatmap (hour/day)
- Holding time comparison (wins vs losses)
- Position size vs outcome scatter plot
- Bias severity radar chart

### Optional

- Emotional risk timeline

### Design principles

- Financial-grade aesthetic
- Minimal clutter
- Interactive tooltips with explanations

## 9. AI Trading Coach

Powered by OpenAI API.

**Inputs:**
- Bias scores
- Archetype classification
- Statistical highlights
- Recent trade behavior

**Output:**
- Personalized psychological feedback
- Structured discipline plan
- Daily habit checklist
- Journaling prompts

**Important:**
AI output must reference actual metrics.

**Example:**

> "Your average loss is 1.8x larger than your average win. This pattern is consistent with loss aversion. Consider implementing a fixed 2% stop-loss."

That grounded specificity wins credibility.

## 10. Performance & Scalability Strategy

Judging dataset is 20x larger.

**Optimizations:**
- Use vectorized pandas
- Precompute rolling metrics efficiently
- Cache computed bias scores
- Avoid recalculating full dataset on UI change
- Use async FastAPI endpoints
- Pre-index timestamps in PostgreSQL

**Benchmark target:**

> Full analysis under 3 seconds for 20x dataset.

## 11. Testing Strategy

**Synthetic datasets simulating:**
- Clean disciplined trader
- Heavy revenge trader
- Chronic loss-averse trader

Ensure bias scores reflect expected outcomes.

## 12. Demo Strategy (Critical)

**Demo script:**

1. Upload dataset
2. Show immediate dashboard
3. Highlight one severe bias
4. Drill into statistical evidence
5. Show counterfactual simulation
6. Show AI coach recommendation
7. Explain behavioral finance reasoning

**Finish with:**

> "This system doesn't just detect bias — it quantifies it, predicts it, and shows traders how to fix it."

## 13. Optional Advanced Enhancements

**If time allows:**

- Sentiment analysis of trader notes
- Volatility regime detection using rolling ATR proxy
- Real-time bias alert system
- Emotional risk index over time
- Explainable ML visualization (feature importance)

## 14. Why This Wins

### Performance

- Scalable, efficient backend
- Handles large datasets smoothly

### Creativity

- Counterfactual simulator
- Bias severity scoring
- Risk archetypes
- AI coach grounded in metrics

### Behavioral Finance Insight

- Statistically validated signals
- Clear psychological mapping
- Non-generic explanations

### Personalization

- Dynamic risk classification
- Custom recommendations
- Adaptive feedback loops
