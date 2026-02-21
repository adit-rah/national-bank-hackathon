import type { Archetype } from '../types';

interface Props {
  archetype: Archetype;
}

const ARCHETYPE_ICONS: Record<string, string> = {
  'Systematic Disciplined': '🎯',
  'Aggressive Opportunistic': '⚡',
  'Emotionally Reactive': '🌊',
  'Conservative Defensive': '🛡️',
};

const ARCHETYPE_COLORS: Record<string, string> = {
  'Systematic Disciplined': 'from-accent-green/20 to-accent-blue/20',
  'Aggressive Opportunistic': 'from-accent-yellow/20 to-accent-red/20',
  'Emotionally Reactive': 'from-accent-red/20 to-accent-purple/20',
  'Conservative Defensive': 'from-accent-blue/20 to-accent-green/20',
};

export default function ArchetypeBadge({ archetype }: Props) {
  const icon = ARCHETYPE_ICONS[archetype.label] || '📊';
  const gradient = ARCHETYPE_COLORS[archetype.label] || 'from-dark-600 to-dark-700';
  const details = archetype.details || {};

  return (
    <div className={`bg-gradient-to-br ${gradient} border border-dark-600 rounded-xl p-6 flex flex-col`}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-white font-bold text-lg mb-2">{archetype.label}</h3>
      <p className="text-gray-400 text-sm flex-1">
        {details.description || 'Archetype classification based on trading patterns.'}
      </p>

      {/* Feature details */}
      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
        {details.trade_frequency != null && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Trade Frequency</span>
            <span className="text-gray-300">{details.trade_frequency.toFixed(1)}/hr</span>
          </div>
        )}
        {details.position_size_variability != null && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Position Variability</span>
            <span className="text-gray-300">{details.position_size_variability.toFixed(1)}%</span>
          </div>
        )}
        {details.drawdown_tolerance != null && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Drawdown Tolerance</span>
            <span className="text-gray-300">{details.drawdown_tolerance.toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
