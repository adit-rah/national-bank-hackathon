import Plot from 'react-plotly.js';
import type { BiasScore } from '../types';

interface Props {
  overtrading: BiasScore;
  lossAversion: BiasScore;
  revengeTrading: BiasScore;
  anchoring: BiasScore;
}

const BAND_COLORS: Record<string, string> = {
  disciplined: '#34d399',
  elevated: '#fbbf24',
  high_risk: '#f87171',
};

const BAND_LABELS: Record<string, string> = {
  disciplined: 'Low',
  elevated: 'Elevated',
  high_risk: 'High',
};

export default function BiasRadar({ overtrading, lossAversion, revengeTrading, anchoring }: Props) {
  const biases = [
    { name: 'Overtrading', ...overtrading },
    { name: 'Loss Aversion', ...lossAversion },
    { name: 'Revenge Trading', ...revengeTrading },
    { name: 'Anchoring', ...anchoring },
  ];

  const categories = biases.map(b => b.name);
  const values = biases.map(b => b.score);

  return (
    <div className="card p-5 h-full">
      <p className="data-label mb-5">Bias Severity Scores</p>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Radar chart */}
        <div className="flex-shrink-0">
          <Plot
            data={[{
              type: 'scatterpolar',
              r: [...values, values[0]],
              theta: [...categories, categories[0]],
              fill: 'toself',
              fillcolor: 'rgba(59, 130, 246, 0.06)',
              line: { color: 'rgba(59, 130, 246, 0.5)', width: 1.5 },
              marker: { size: 5, color: '#3b82f6' },
              hovertemplate: '%{theta}: %{r:.0f}/100<extra></extra>',
            }]}
            layout={{
              autosize: false,
              height: 320,
              width: 420,
              margin: { l: 100, r: 100, t: 50, b: 50 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#5a6174', size: 10, family: 'Inter' },
              polar: {
                bgcolor: 'transparent',
                radialaxis: {
                  visible: true,
                  range: [0, 100],
                  gridcolor: 'rgba(255,255,255,0.03)',
                  linecolor: 'rgba(255,255,255,0.03)',
                  tickfont: { color: '#2a3040', size: 8 },
                  dtick: 25,
                },
                angularaxis: {
                  gridcolor: 'rgba(255,255,255,0.03)',
                  linecolor: 'rgba(255,255,255,0.04)',
                  tickfont: { size: 10 },
                },
              },
              showlegend: false,
            }}
            config={{ responsive: false, displayModeBar: false, staticPlot: true }}
          />
        </div>

        {/* Score bars */}
        <div className="flex-1 w-full space-y-4 pt-1">
          {biases.map(b => {
            const color = BAND_COLORS[b.band] || '#6b7280';
            return (
              <div key={b.name}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[12px] text-[#8a90a0] font-medium">{b.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[11px] text-[#5a6174]">{b.score}</span>
                    <span className="badge" style={{ backgroundColor: `${color}10`, color }}>{BAND_LABELS[b.band] || b.band}</span>
                  </div>
                </div>
                <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(b.score, 1)}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
