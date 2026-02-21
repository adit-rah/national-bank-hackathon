import { useState } from 'react';
import type { AnalysisResult } from '../types';
import EquityCurve from './EquityCurve';
import Heatmap from './Heatmap';
import HoldingTime from './HoldingTime';
import PositionScatter from './PositionScatter';
import BiasRadar from './BiasRadar';
import ArchetypeBadge from './ArchetypeBadge';
import Counterfactual from './Counterfactual';
import CoachPanel from './CoachPanel';

interface Props {
  result: AnalysisResult;
}

function formatValue(val: number, type: 'number' | 'dollar' | 'pct' | 'ratio' | 'rate'): string {
  switch (type) {
    case 'dollar': return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    case 'pct': return `${val.toFixed(1)}%`;
    case 'ratio': return val.toFixed(2);
    case 'rate': return val.toFixed(1);
    default: return val.toLocaleString();
  }
}

const TABS = [
  { key: 'overview' as const, label: 'Overview', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )},
  { key: 'simulator' as const, label: 'What-If Simulator', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  )},
  { key: 'coach' as const, label: 'AI Coach', icon: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  )},
];

export default function Dashboard({ result }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'coach'>('overview');
  const summary = result.feature_summary;

  const stats = [
    { label: 'Trades', value: formatValue(summary.total_trades, 'number'), sentiment: 'neutral' as const },
    { label: 'Win Rate', value: formatValue(summary.win_rate, 'pct'), sentiment: (summary.win_rate >= 50 ? 'positive' : 'negative') as const },
    { label: 'Total PnL', value: formatValue(summary.total_pnl, 'dollar'), sentiment: (summary.total_pnl >= 0 ? 'positive' : 'negative') as const },
    { label: 'Sharpe', value: formatValue(summary.sharpe_ratio, 'ratio'), sentiment: (summary.sharpe_ratio >= 1 ? 'positive' : 'warning') as const },
    { label: 'Max DD', value: formatValue(summary.max_drawdown_pct, 'pct'), sentiment: 'negative' as const },
    { label: 'Trades/hr', value: formatValue(summary.trades_per_hour, 'rate'), sentiment: 'neutral' as const },
  ];

  const sentimentColor = {
    positive: 'text-accent-green',
    negative: 'text-accent-red',
    warning: 'text-accent-yellow',
    neutral: 'text-white',
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card px-4 py-3.5">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`stat-value ${sentimentColor[s.sentiment]}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] -mb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`group flex items-center gap-2 px-4 py-3 text-[13px] font-medium border-b-2 transition-all duration-200 ${
              activeTab === tab.key
                ? 'border-accent-blue text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className={`transition-colors ${activeTab === tab.key ? 'text-accent-blue' : 'text-gray-600 group-hover:text-gray-400'}`}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Bias scores + Archetype */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <BiasRadar
                  overtrading={result.overtrading}
                  lossAversion={result.loss_aversion}
                  revengeTrading={result.revenge_trading}
                  anchoring={result.anchoring}
                />
              </div>
              <ArchetypeBadge archetype={result.archetype} />
            </div>

            {/* Equity curve */}
            <EquityCurve data={result.equity_curve} />

            {/* Heatmap + Holding time */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Heatmap data={result.trade_frequency} />
              <HoldingTime data={result.holding_time_comparison} />
            </div>

            {/* Position scatter */}
            <PositionScatter data={result.position_scatter} />
          </div>
        )}

        {activeTab === 'simulator' && (
          <Counterfactual sessionId={result.session_id} />
        )}

        {activeTab === 'coach' && (
          <CoachPanel sessionId={result.session_id} />
        )}
      </div>
    </div>
  );
}
