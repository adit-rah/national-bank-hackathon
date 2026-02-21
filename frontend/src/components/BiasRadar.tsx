import Plot from 'react-plotly.js';
import type { BiasScore } from '../types';

interface Props {
  overtrading: BiasScore;
  lossAversion: BiasScore;
  revengeTrading: BiasScore;
  anchoring: BiasScore;
}

function bandColor(band: string): string {
  switch (band) {
    case 'disciplined': return '#34d399';
    case 'elevated': return '#fbbf24';
    case 'high_risk': return '#f87171';
    default: return '#6b7280';
  }
}

function bandLabel(band: string): string {
  switch (band) {
    case 'disciplined': return 'Disciplined';
    case 'elevated': return 'Elevated';
    case 'high_risk': return 'High Risk';
    default: return band;
  }
}

export default function BiasRadar({ overtrading, lossAversion, revengeTrading, anchoring }: Props) {
  const biases = [
    { name: 'Overtrading', ...overtrading },
    { name: 'Loss Aversion', ...lossAversion },
    { name: 'Revenge Trading', ...revengeTrading },
    { name: 'Anchoring', ...anchoring },
  ];

  const categories = biases.map((b) => b.name);
  const values = biases.map((b) => b.score);

  return (
    <div className="card p-6 h-full">
      <p className="section-title mb-6">Bias Severity</p>

      <div className="flex flex-col lg:flex-row items-center gap-8">
        <div className="flex-shrink-0">
          <Plot
            data={[
              {
                type: 'scatterpolar',
                r: [...values, values[0]],
                theta: [...categories, categories[0]],
                fill: 'toself',
                fillcolor: 'rgba(96, 165, 250, 0.08)',
                line: { color: 'rgba(96, 165, 250, 0.6)', width: 2 },
                marker: { size: 6, color: '#60a5fa' },
              },
            ]}
            layout={{
              autosize: false,
              height: 280,
              width: 340,
              margin: { l: 55, r: 55, t: 25, b: 25 },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent',
              font: { color: '#6b7280', size: 11, family: 'Inter' },
              polar: {
                bgcolor: 'transparent',
                radialaxis: {
                  visible: true,
                  range: [0, 100],
                  gridcolor: 'rgba(255,255,255,0.04)',
                  linecolor: 'rgba(255,255,255,0.04)',
                  tickfont: { color: '#4b5563', size: 9 },
                },
                angularaxis: {
                  gridcolor: 'rgba(255,255,255,0.04)',
                  linecolor: 'rgba(255,255,255,0.06)',
                },
              },
              showlegend: false,
            }}
            config={{ responsive: false, displayModeBar: false, staticPlot: true }}
          />
        </div>

        <div className="flex-1 w-full space-y-5">
          {biases.map((b) => (
            <div key={b.name}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[13px] text-gray-300 font-medium">{b.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-500">{b.score}</span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                    style={{
                      backgroundColor: `${bandColor(b.band)}12`,
                      color: bandColor(b.band),
                    }}
                  >
                    {bandLabel(b.band)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${b.score}%`,
                    background: `linear-gradient(90deg, ${bandColor(b.band)}80, ${bandColor(b.band)})`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
