import { useState } from 'react';
import Plot from 'react-plotly.js';
import { runCounterfactual } from '../api/client';
import type { CounterfactualResult } from '../types';

interface Props {
  sessionId: string;
}

interface Constraint {
  key: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultValue: number;
}

const CONSTRAINTS: Constraint[] = [
  { key: 'position', label: 'Position Size Cap', description: 'Maximum position as % of balance', min: 1, max: 20, step: 0.5, unit: '%', defaultValue: 5 },
  { key: 'stopLoss', label: 'Stop-Loss', description: 'Max loss per trade as % of balance', min: 0.5, max: 10, step: 0.5, unit: '%', defaultValue: 2 },
  { key: 'daily', label: 'Daily Trade Limit', description: 'Maximum trades per day', min: 1, max: 50, step: 1, unit: ' trades', defaultValue: 20 },
  { key: 'cooldown', label: 'Cooldown Period', description: 'Min time between trades', min: 1, max: 60, step: 1, unit: ' min', defaultValue: 5 },
];

const METRIC_LABELS: Record<string, string> = {
  total_trades: 'Total Trades',
  total_pnl: 'Total PnL',
  final_balance: 'Final Balance',
  max_drawdown_pct: 'Max Drawdown',
  sharpe_ratio: 'Sharpe Ratio',
  volatility: 'Volatility',
  win_rate: 'Win Rate',
};

export default function Counterfactual({ sessionId }: Props) {
  const [values, setValues] = useState<Record<string, number>>({
    position: 5, stopLoss: 2, daily: 20, cooldown: 5,
  });
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    position: false, stopLoss: false, daily: false, cooldown: false,
  });

  const [result, setResult] = useState<CounterfactualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const anyEnabled = Object.values(enabled).some(Boolean);

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await runCounterfactual(sessionId, {
        max_position_pct: enabled.position ? values.position : null,
        stop_loss_pct: enabled.stopLoss ? values.stopLoss : null,
        max_daily_trades: enabled.daily ? values.daily : null,
        cooldown_minutes: enabled.cooldown ? values.cooldown : null,
      });
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <div className="card p-6">
        <div className="mb-6">
          <p className="section-title mb-1">What-If Simulator</p>
          <p className="text-[13px] text-gray-500">
            Toggle discipline constraints and see how they would have affected your performance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CONSTRAINTS.map((c) => (
            <div
              key={c.key}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                enabled[c.key]
                  ? 'bg-accent-blue/[0.04] border-accent-blue/20'
                  : 'bg-white/[0.01] border-white/[0.04] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] text-gray-200 font-medium">{c.label}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{c.description}</p>
                </div>
                <button
                  onClick={() => setEnabled(prev => ({ ...prev, [c.key]: !prev[c.key] }))}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                    enabled[c.key] ? 'bg-accent-blue' : 'bg-white/[0.08]'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    enabled[c.key] ? 'translate-x-4' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={c.min}
                  max={c.max}
                  step={c.step}
                  value={values[c.key]}
                  onChange={(e) => setValues(prev => ({ ...prev, [c.key]: Number(e.target.value) }))}
                  disabled={!enabled[c.key]}
                  className="flex-1"
                />
                <span className={`text-xs font-mono w-16 text-right ${enabled[c.key] ? 'text-gray-300' : 'text-gray-700'}`}>
                  {values[c.key]}{c.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={handleRun}
            disabled={loading || !anyEnabled}
            className="px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/80 disabled:bg-white/[0.04] disabled:text-gray-600 text-white text-[13px] font-medium rounded-xl transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Running...
              </span>
            ) : 'Run Simulation'}
          </button>
          {!anyEnabled && <span className="text-[12px] text-gray-600">Enable at least one constraint</span>}
        </div>
        {error && <p className="mt-3 text-[12px] text-accent-red">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in-up">
          {/* Summary insight */}
          <div className="card p-5 border-accent-blue/10">
            <p className="text-[14px] text-gray-200 leading-relaxed">{result.summary}</p>
            <p className="text-[12px] text-gray-600 mt-2">
              Trades included: {result.trades_simulated.toLocaleString()} of {result.trades_original.toLocaleString()}
            </p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(result.original).map(([key, orig]) => {
              const sim = result.simulated[key] ?? 0;
              const imp = result.improvement[key] ?? 0;
              const improved = key === 'max_drawdown_pct' || key === 'volatility' ? imp < 0 : imp > 0;
              return (
                <div key={key} className="card px-4 py-3">
                  <p className="text-[10px] font-medium text-gray-600 uppercase tracking-wider mb-1.5">
                    {METRIC_LABELS[key] || key.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[12px] text-gray-500 font-mono">
                      {typeof orig === 'number' ? orig.toFixed(1) : orig}
                    </span>
                    <span className="text-gray-700">→</span>
                    <span className={`text-[13px] font-semibold font-mono ${improved ? 'text-accent-green' : 'text-accent-red'}`}>
                      {typeof sim === 'number' ? sim.toFixed(1) : sim}
                    </span>
                  </div>
                  <p className={`text-[10px] font-mono mt-1 ${improved ? 'text-accent-green/70' : 'text-accent-red/70'}`}>
                    {imp >= 0 ? '+' : ''}{imp.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* Equity comparison */}
          <div className="card p-6">
            <p className="section-title mb-4">Equity Curve Comparison</p>
            <Plot
              data={[
                {
                  x: result.equity_curve_original.map((d) => d.timestamp),
                  y: result.equity_curve_original.map((d) => d.balance),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Original',
                  line: { color: 'rgba(107,114,128,0.5)', width: 1.5, dash: 'dot' },
                },
                {
                  x: result.equity_curve_simulated.map((d) => d.timestamp),
                  y: result.equity_curve_simulated.map((d) => d.balance),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Simulated',
                  line: { color: '#60a5fa', width: 2 },
                },
              ]}
              layout={{
                autosize: true,
                height: 320,
                margin: { l: 55, r: 16, t: 8, b: 36 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#6b7280', size: 10, family: 'Inter' },
                xaxis: { gridcolor: 'rgba(255,255,255,0.03)', tickfont: { size: 9 } },
                yaxis: {
                  title: { text: 'Balance', font: { size: 10, color: '#4b5563' } },
                  gridcolor: 'rgba(255,255,255,0.03)',
                  tickfont: { size: 9 },
                  tickprefix: '$',
                },
                legend: { x: 0, y: 1.1, orientation: 'h', font: { color: '#9ca3af', size: 10 } },
                hovermode: 'x unified',
                hoverlabel: {
                  bgcolor: '#1a2540',
                  bordercolor: 'rgba(255,255,255,0.1)',
                  font: { color: '#e5e7eb', size: 11, family: 'Inter' },
                },
              }}
              config={{ responsive: true, displayModeBar: false }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
