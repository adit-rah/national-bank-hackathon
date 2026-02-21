import type { Archetype } from '../types';

interface Props {
  archetype: Archetype;
}

const ARCHETYPE_CONFIG: Record<string, { icon: string; gradient: string; accent: string }> = {
  'Systematic Disciplined': { icon: '🎯', gradient: 'from-accent-green/[0.08] to-transparent', accent: '#34d399' },
  'Aggressive Opportunistic': { icon: '⚡', gradient: 'from-accent-yellow/[0.08] to-transparent', accent: '#fbbf24' },
  'Emotionally Reactive': { icon: '🌊', gradient: 'from-accent-red/[0.08] to-transparent', accent: '#f87171' },
  'Conservative Defensive': { icon: '🛡️', gradient: 'from-accent-blue/[0.08] to-transparent', accent: '#60a5fa' },
};

export default function ArchetypeBadge({ archetype }: Props) {
  const config = ARCHETYPE_CONFIG[archetype.label] || { icon: '📊', gradient: 'from-white/[0.04] to-transparent', accent: '#6b7280' };
  const details = archetype.details || {};

  const metrics = [
    { label: 'Trade Frequency', value: details.trade_frequency, unit: '/hr' },
    { label: 'Position Variability', value: details.position_size_variability, unit: '%' },
    { label: 'DD Tolerance', value: details.drawdown_tolerance, unit: '%' },
  ].filter(m => m.value != null);

  return (
    <div className={`card bg-gradient-to-br ${config.gradient} p-6 flex flex-col h-full`}>
      <p className="section-title mb-4">Trader Archetype</p>

      <div className="flex-1">
        <div className="text-3xl mb-3">{config.icon}</div>
        <h3 className="text-white font-semibold text-lg tracking-tight mb-2">{archetype.label}</h3>
        <p className="text-gray-500 text-[13px] leading-relaxed">
          {details.description || 'Classification based on trading patterns.'}
        </p>
      </div>

      {/* Metrics */}
      {metrics.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/[0.06] space-y-2.5">
          {metrics.map((m) => (
            <div key={m.label} className="flex justify-between items-center">
              <span className="text-[12px] text-gray-600">{m.label}</span>
              <span className="text-[12px] text-gray-300 font-mono">
                {typeof m.value === 'number' ? m.value.toFixed(1) : m.value}{m.unit}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
