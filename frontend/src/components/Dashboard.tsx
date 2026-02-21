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

export default function Dashboard({ result }: Props) {
  const [activeTab, setActiveTab] = useState<'overview' | 'counterfactual' | 'coach'>('overview');
  const summary = result.feature_summary;

  const statCards = [
    { label: 'Total Trades', value: summary.total_trades.toLocaleString(), color: 'text-white' },
    { label: 'Win Rate', value: `${summary.win_rate}%`, color: summary.win_rate >= 50 ? 'text-accent-green' : 'text-accent-red' },
    { label: 'Total PnL', value: `$${summary.total_pnl.toLocaleString()}`, color: summary.total_pnl >= 0 ? 'text-accent-green' : 'text-accent-red' },
    { label: 'Sharpe Ratio', value: summary.sharpe_ratio.toFixed(2), color: summary.sharpe_ratio >= 1 ? 'text-accent-green' : 'text-accent-yellow' },
    { label: 'Max Drawdown', value: `${summary.max_drawdown_pct.toFixed(1)}%`, color: 'text-accent-red' },
    { label: 'Trades/Hour', value: summary.trades_per_hour.toFixed(1), color: 'text-gray-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="bg-dark-800 border border-dark-600 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-800 p-1 rounded-lg w-fit">
        {(['overview', 'counterfactual', 'coach'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? 'bg-accent-blue text-white'
                : 'text-gray-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            {tab === 'coach' ? 'AI Coach' : tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Row 1: Bias radar + Archetype */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <BiasRadar
                overtrading={result.overtrading}
                lossAversion={result.loss_aversion}
                revengeTrading={result.revenge_trading}
              />
            </div>
            <ArchetypeBadge archetype={result.archetype} />
          </div>

          {/* Row 2: Equity curve */}
          <EquityCurve data={result.equity_curve} />

          {/* Row 3: Heatmap + Holding time */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Heatmap data={result.trade_frequency} />
            <HoldingTime data={result.holding_time_comparison} />
          </div>

          {/* Row 4: Position scatter */}
          <PositionScatter data={result.position_scatter} />
        </div>
      )}

      {activeTab === 'counterfactual' && (
        <Counterfactual sessionId={result.session_id} />
      )}

      {activeTab === 'coach' && (
        <CoachPanel sessionId={result.session_id} />
      )}
    </div>
  );
}
