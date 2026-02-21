import { useState } from 'react';
import Plot from 'react-plotly.js';
import { runCounterfactual } from '../api/client';
import type { CounterfactualResult } from '../types';

interface Props {
  sessionId: string;
}

export default function Counterfactual({ sessionId }: Props) {
  const [maxPosPct, setMaxPosPct] = useState<number>(5);
  const [stopLossPct, setStopLossPct] = useState<number>(2);
  const [maxDailyTrades, setMaxDailyTrades] = useState<number>(20);
  const [cooldownMin, setCooldownMin] = useState<number>(5);

  const [enablePos, setEnablePos] = useState(false);
  const [enableSL, setEnableSL] = useState(false);
  const [enableDaily, setEnableDaily] = useState(false);
  const [enableCooldown, setEnableCooldown] = useState(false);

  const [result, setResult] = useState<CounterfactualResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRun = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        max_position_pct: enablePos ? maxPosPct : null,
        stop_loss_pct: enableSL ? stopLossPct : null,
        max_daily_trades: enableDaily ? maxDailyTrades : null,
        cooldown_minutes: enableCooldown ? cooldownMin : null,
      };
      const res = await runCounterfactual(sessionId, params);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-2">Counterfactual Simulator</h3>
        <p className="text-gray-400 text-sm mb-6">
          What would have happened if you applied these discipline rules?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Max position size */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enablePos} onChange={(e) => setEnablePos(e.target.checked)}
                className="rounded bg-dark-600 border-dark-500 text-accent-blue" />
              <span className="text-sm text-gray-300">Cap Position Size</span>
            </label>
            <input type="range" min={1} max={20} step={0.5} value={maxPosPct}
              onChange={(e) => setMaxPosPct(Number(e.target.value))}
              disabled={!enablePos}
              className="w-full accent-accent-blue" />
            <span className="text-xs text-gray-500">{maxPosPct}% of balance</span>
          </div>

          {/* Stop-loss */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enableSL} onChange={(e) => setEnableSL(e.target.checked)}
                className="rounded bg-dark-600 border-dark-500 text-accent-blue" />
              <span className="text-sm text-gray-300">Fixed Stop-Loss</span>
            </label>
            <input type="range" min={0.5} max={10} step={0.5} value={stopLossPct}
              onChange={(e) => setStopLossPct(Number(e.target.value))}
              disabled={!enableSL}
              className="w-full accent-accent-blue" />
            <span className="text-xs text-gray-500">{stopLossPct}% max loss per trade</span>
          </div>

          {/* Max daily trades */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enableDaily} onChange={(e) => setEnableDaily(e.target.checked)}
                className="rounded bg-dark-600 border-dark-500 text-accent-blue" />
              <span className="text-sm text-gray-300">Daily Trade Limit</span>
            </label>
            <input type="range" min={1} max={50} step={1} value={maxDailyTrades}
              onChange={(e) => setMaxDailyTrades(Number(e.target.value))}
              disabled={!enableDaily}
              className="w-full accent-accent-blue" />
            <span className="text-xs text-gray-500">{maxDailyTrades} trades/day max</span>
          </div>

          {/* Cooldown */}
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={enableCooldown} onChange={(e) => setEnableCooldown(e.target.checked)}
                className="rounded bg-dark-600 border-dark-500 text-accent-blue" />
              <span className="text-sm text-gray-300">Cooldown Period</span>
            </label>
            <input type="range" min={1} max={60} step={1} value={cooldownMin}
              onChange={(e) => setCooldownMin(Number(e.target.value))}
              disabled={!enableCooldown}
              className="w-full accent-accent-blue" />
            <span className="text-xs text-gray-500">{cooldownMin} min between trades</span>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={loading || (!enablePos && !enableSL && !enableDaily && !enableCooldown)}
          className="mt-6 px-6 py-2.5 bg-accent-blue hover:bg-accent-blue/80 disabled:bg-dark-600 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
        {error && <p className="mt-2 text-sm text-accent-red">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="bg-gradient-to-r from-accent-blue/10 to-accent-purple/10 border border-accent-blue/30 rounded-xl p-6">
            <p className="text-accent-blue font-medium text-lg">{result.summary}</p>
            <p className="text-gray-400 text-sm mt-2">
              Trades: {result.trades_original} → {result.trades_simulated}
              ({result.trades_simulated - result.trades_original >= 0 ? '+' : ''}{result.trades_simulated - result.trades_original})
            </p>
          </div>

          {/* Metrics comparison */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(result.original).map(([key, orig]) => {
              const sim = result.simulated[key] ?? 0;
              const imp = result.improvement[key] ?? 0;
              const improved = key === 'max_drawdown_pct' || key === 'volatility' ? imp < 0 : imp > 0;
              return (
                <div key={key} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    {key.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-400">
                    {typeof orig === 'number' ? orig.toFixed(2) : orig} →{' '}
                    <span className={improved ? 'text-accent-green' : 'text-accent-red'}>
                      {typeof sim === 'number' ? sim.toFixed(2) : sim}
                    </span>
                  </p>
                  <p className={`text-xs mt-1 ${improved ? 'text-accent-green' : 'text-accent-red'}`}>
                    {imp >= 0 ? '+' : ''}{imp.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>

          {/* Equity curve comparison */}
          <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Equity Curve Comparison</h3>
            <Plot
              data={[
                {
                  x: result.equity_curve_original.map((d) => d.timestamp),
                  y: result.equity_curve_original.map((d) => d.balance),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Original',
                  line: { color: '#6b7280', width: 1.5, dash: 'dot' },
                },
                {
                  x: result.equity_curve_simulated.map((d) => d.timestamp),
                  y: result.equity_curve_simulated.map((d) => d.balance),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Simulated',
                  line: { color: '#3b82f6', width: 2 },
                },
              ]}
              layout={{
                autosize: true,
                height: 350,
                margin: { l: 60, r: 20, t: 10, b: 40 },
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: { color: '#9ca3af', size: 11 },
                xaxis: { gridcolor: '#1f2937' },
                yaxis: { title: 'Balance ($)', gridcolor: '#1f2937' },
                legend: { x: 0, y: 1.12, orientation: 'h', font: { color: '#d1d5db' } },
                hovermode: 'x unified',
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
