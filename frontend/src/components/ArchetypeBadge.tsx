import type { Archetype } from '../types';

interface Props {
  archetype: Archetype;
}

const CONFIG: Record<string, { icon: string; accent: string; bg: string }> = {
  'Systematic Disciplined': { icon: '◎', accent: '#34d399', bg: 'rgba(52,211,153,0.04)' },
  'Aggressive Opportunistic': { icon: '⚡', accent: '#fbbf24', bg: 'rgba(251,191,36,0.04)' },
  'Emotionally Reactive': { icon: '◉', accent: '#f87171', bg: 'rgba(248,113,113,0.04)' },
  'Conservative Defensive': { icon: '◈', accent: '#60a5fa', bg: 'rgba(96,165,250,0.04)' },
};

export default function ArchetypeBadge({ archetype }: Props) {
  const c = CONFIG[archetype.label] || { icon: '◇', accent: '#6b7280', bg: 'rgba(255,255,255,0.02)' };
  const d = archetype.details || {};

  const stats = [
    { k: 'Frequency', v: d.trade_frequency, u: '/hr' },
    { k: 'Position Var.', v: d.position_size_variability, u: '%' },
    { k: 'DD Tolerance', v: d.drawdown_tolerance, u: '%' },
  ].filter(s => s.v != null);

  return (
    <div className="card h-full flex flex-col" style={{ background: `linear-gradient(135deg, ${c.bg} 0%, transparent 70%)` }}>
      <div className="p-5 flex-1">
        <p className="data-label mb-4">Trader Archetype</p>

        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-xl" style={{ color: c.accent }}>{c.icon}</span>
          <h3 className="text-[16px] font-semibold text-white tracking-[-0.02em]">{archetype.label}</h3>
        </div>

        <p className="text-[12px] text-[#5a6174] leading-[1.6]">
          {d.description || 'Classification based on trading patterns.'}
        </p>
      </div>

      {stats.length > 0 && (
        <div className="px-5 pb-5 pt-0">
          <div className="divider mb-3" />
          <div className="space-y-2">
            {stats.map(s => (
              <div key={s.k} className="flex justify-between items-center">
                <span className="text-[11px] text-[#3a4258]">{s.k}</span>
                <span className="mono text-[11px] text-[#8a90a0]">
                  {typeof s.v === 'number' ? s.v.toFixed(1) : s.v}{s.u}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
