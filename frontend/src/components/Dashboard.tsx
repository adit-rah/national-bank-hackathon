import { useState } from 'react';
import type { AnalysisResult } from '../types';
import EquityCurve from './EquityCurve';
import Heatmap from './Heatmap';
import HoldingTime from './HoldingTime';
import PositionScatter from './PositionScatter';
import BiasRadar from './BiasRadar';
import BiasEvolution from './BiasEvolution';
import BiasHeatmapTimeline from './BiasHeatmapTimeline';
import ArchetypeBadge from './ArchetypeBadge';
import Counterfactual from './Counterfactual';
import CoachPanel from './CoachPanel';

interface Props {
  result: AnalysisResult;
}

function fmt(val: number, kind: 'n' | '$' | '%' | 'r' | 'x'): string {
  switch (kind) {
    case '$': return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case '%': return `${val.toFixed(1)}%`;
    case 'r': return val.toFixed(2);
    case 'x': return val.toFixed(1);
    default: return val.toLocaleString();
  }
}

type Tab = 'overview' | 'simulator' | 'coach';

export default function Dashboard({ result }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const s = result.feature_summary;

  const metrics = [
    { label: 'Total Trades', value: fmt(s.total_trades, 'n'), color: 'text-white' },
    { label: 'Win Rate', value: fmt(s.win_rate, '%'), color: s.win_rate >= 50 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Total PnL', value: fmt(s.total_pnl, '$'), color: s.total_pnl >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Sharpe Ratio', value: fmt(s.sharpe_ratio, 'r'), color: s.sharpe_ratio >= 1 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Max Drawdown', value: fmt(s.max_drawdown_pct, '%'), color: 'text-red-400' },
    { label: 'Trades / Hour', value: fmt(s.trades_per_hour, 'x'), color: 'text-white' },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'simulator', label: 'What-If Simulator' },
    { key: 'coach', label: 'AI Coach' },
  ];

  return (
    <div className="space-y-5">
      {/* ─── Metrics bar ────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-px bg-white/[0.02] rounded-xl overflow-hidden border border-white/[0.04]">
        {metrics.map((m, i) => (
          <div
            key={m.label}
            className={`bg-[#0a0d16] px-4 py-3.5 ${i < metrics.length - 1 ? 'border-r border-white/[0.03]' : ''}`}
          >
            <p className="data-label mb-1">{m.label}</p>
            <p className={`stat-value ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Tab bar ────────────────────────────────────── */}
      <div className="flex items-center gap-0.5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[12px] font-medium rounded-md transition-all duration-150 ${
              activeTab === tab.key
                ? 'bg-white/[0.06] text-white'
                : 'text-[#5a6174] hover:text-[#8a90a0] hover:bg-white/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <BiasRadar
                  overtrading={result.overtrading}
                  lossAversion={result.loss_aversion}
                  revengeTrading={result.revenge_trading}
                  anchoring={result.anchoring}
                  overconfidence={result.overconfidence}
                />
              </div>
              <ArchetypeBadge archetype={result.archetype} />
            </div>

            <BiasEvolution data={result.bias_timeline} />

            <BiasHeatmapTimeline data={result.bias_timeline} />

            <EquityCurve data={result.equity_curve} biasTimeline={result.bias_timeline} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Heatmap data={result.trade_frequency} />
              <HoldingTime data={result.holding_time_comparison} />
            </div>

            <PositionScatter data={result.position_scatter} />
          </div>
        )}

        {activeTab === 'simulator' && <Counterfactual sessionId={result.session_id} />}
        {activeTab === 'coach' && <CoachPanel sessionId={result.session_id} />}
      </div>
    </div>
  );
}
