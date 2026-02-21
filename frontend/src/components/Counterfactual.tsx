import { useState } from 'react';
import Plot from 'react-plotly.js';
import { runCounterfactual } from '../api/client';
import type { CounterfactualResult } from '../types';

interface Props { sessionId: string; }

const CONSTRAINTS = [
  { key: 'position', label: 'Position Size Cap', desc: 'Max position as % of balance', min: 1, max: 20, step: 0.5, unit: '%', def: 5 },
  { key: 'stopLoss', label: 'Stop-Loss', desc: 'Max loss per trade', min: 0.5, max: 10, step: 0.5, unit: '%', def: 2 },
  { key: 'daily', label: 'Daily Trade Limit', desc: 'Max trades per day', min: 1, max: 50, step: 1, unit: '', def: 20 },
  { key: 'cooldown', label: 'Cooldown Period', desc: 'Min time between trades', min: 1, max: 60, step: 1, unit: 'min', def: 5 },
] as const;

const METRIC_NAMES: Record<string, string> = {
  total_trades: 'Trades', total_pnl: 'Total PnL', final_balance: 'Final Balance',
  max_drawdown_pct: 'Max Drawdown', sharpe_ratio: 'Sharpe', volatility: 'Volatility', win_rate: 'Win Rate',
};

export default function Counterfactual({ sessionId }: Props) {
  const [vals, setVals] = useState<Record<string, number>>({ position: 5, stopLoss: 2, daily: 20, cooldown: 5 });
  const [on, setOn] = useState<Record<string, boolean>>({ position: false, stopLoss: false, daily: false, cooldown: false });
  const [result, setResult] = useState<CounterfactualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const anyOn = Object.values(on).some(Boolean);

  const run = async () => {
    setLoading(true); setError('');
    try {
      const res = await runCounterfactual(sessionId, {
        max_position_pct: on.position ? vals.position : null,
        stop_loss_pct: on.stopLoss ? vals.stopLoss : null,
        max_daily_trades: on.daily ? vals.daily : null,
        cooldown_minutes: on.cooldown ? vals.cooldown : null,
      });
      setResult(res);
    } catch (e: any) { setError(e?.response?.data?.detail || 'Simulation failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-5">
        <p className="data-label mb-1">What-If Simulator</p>
        <p className="text-[12px] text-[#3a4258] mb-5">
          Toggle discipline constraints to see how they would have affected your performance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CONSTRAINTS.map(c => (
            <div key={c.key} className={`px-4 py-3.5 rounded-lg border transition-all duration-150 ${
              on[c.key] ? 'bg-blue-500/[0.03] border-blue-500/15' : 'bg-white/[0.01] border-white/[0.03]'
            }`}>
              <div className="flex items-center justify-between mb-2.5">
                <div>
                  <p className={`text-[12px] font-medium ${on[c.key] ? 'text-[#c9cdd5]' : 'text-[#5a6174]'}`}>{c.label}</p>
                  <p className="text-[10px] text-[#2a3040] mt-0.5">{c.desc}</p>
                </div>
                <button
                  onClick={() => setOn(p => ({ ...p, [c.key]: !p[c.key] }))}
                  className={`toggle-track ${on[c.key] ? 'active' : ''}`}
                >
                  <div className="toggle-thumb" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={c.min} max={c.max} step={c.step} value={vals[c.key]}
                  onChange={e => setVals(p => ({ ...p, [c.key]: Number(e.target.value) }))}
                  disabled={!on[c.key]} className="flex-1"
                />
                <span className={`mono text-[11px] w-14 text-right ${on[c.key] ? 'text-[#8a90a0]' : 'text-[#2a3040]'}`}>
                  {vals[c.key]}{c.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={run} disabled={loading || !anyOn} className="btn-primary">
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Running…
              </span>
            ) : 'Run Simulation'}
          </button>
          {!anyOn && <span className="text-[11px] text-[#3a4258]">Enable at least one constraint</span>}
          {error && <span className="text-[11px] text-red-400">{error}</span>}
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="card p-4 border-blue-500/8">
            <p className="text-[13px] text-[#c9cdd5] leading-relaxed">{result.summary}</p>
            <p className="text-[11px] text-[#3a4258] mt-1.5 mono">
              {result.trades_simulated.toLocaleString()} / {result.trades_original.toLocaleString()} trades included
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.02] rounded-xl overflow-hidden border border-white/[0.04]">
            {Object.entries(result.original).map(([k, orig], i) => {
              const sim = result.simulated[k] ?? 0;
              const imp = result.improvement[k] ?? 0;
              const good = k === 'max_drawdown_pct' || k === 'volatility' ? imp < 0 : imp > 0;
              return (
                <div key={k} className="bg-[#0a0d16] px-3.5 py-3">
                  <p className="data-label mb-1">{METRIC_NAMES[k] || k.replace(/_/g, ' ')}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="mono text-[11px] text-[#4a5068]">{typeof orig === 'number' ? orig.toFixed(1) : orig}</span>
                    <span className="text-[#2a3040]">→</span>
                    <span className={`mono text-[12px] font-semibold ${good ? 'text-emerald-400' : 'text-red-400'}`}>
                      {typeof sim === 'number' ? sim.toFixed(1) : sim}
                    </span>
                  </div>
                  <p className={`mono text-[9px] mt-0.5 ${good ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                    {imp >= 0 ? '+' : ''}{imp.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* Equity comparison */}
          <div className="card p-5">
            <p className="data-label mb-4">Equity Curve Comparison</p>
            <Plot
              data={[
                {
                  x: result.equity_curve_original.map(d => d.timestamp),
                  y: result.equity_curve_original.map(d => d.balance),
                  type: 'scatter', mode: 'lines', name: 'Original',
                  line: { color: 'rgba(90,97,116,0.4)', width: 1.5, dash: 'dot' },
                  hovertemplate: '$%{y:,.0f}<extra>Original</extra>',
                },
                {
                  x: result.equity_curve_simulated.map(d => d.timestamp),
                  y: result.equity_curve_simulated.map(d => d.balance),
                  type: 'scatter', mode: 'lines', name: 'Simulated',
                  line: { color: '#3b82f6', width: 1.5 },
                  hovertemplate: '$%{y:,.0f}<extra>Simulated</extra>',
                },
              ]}
              layout={{
                autosize: true, height: 300,
                margin: { l: 50, r: 12, t: 4, b: 32 },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                font: { color: '#4a5068', size: 10, family: 'Inter' },
                xaxis: { gridcolor: 'rgba(255,255,255,0.025)', tickfont: { size: 9 }, showgrid: false },
                yaxis: { gridcolor: 'rgba(255,255,255,0.025)', tickfont: { size: 9 }, tickprefix: '$' },
                legend: { x: 0, y: 1.08, orientation: 'h', font: { color: '#5a6174', size: 10 } },
                hovermode: 'x unified',
                hoverlabel: { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11 } },
                showlegend: true,
              }}
              config={{ responsive: true, displayModeBar: false }}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  );
}
