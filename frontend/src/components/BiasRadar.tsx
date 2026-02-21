import Plot from 'react-plotly.js';
import type { BiasScore } from '../types';

interface Props {
  overtrading: BiasScore;
  lossAversion: BiasScore;
  revengeTrading: BiasScore;
}

function bandColor(band: string): string {
  switch (band) {
    case 'disciplined': return '#00d4aa';
    case 'elevated': return '#fbbf24';
    case 'high_risk': return '#ff4757';
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

export default function BiasRadar({ overtrading, lossAversion, revengeTrading }: Props) {
  const biases = [
    { name: 'Overtrading', ...overtrading },
    { name: 'Loss Aversion', ...lossAversion },
    { name: 'Revenge Trading', ...revengeTrading },
  ];

  const categories = biases.map((b) => b.name);
  const values = biases.map((b) => b.score);

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Bias Severity</h3>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        <Plot
          data={[
            {
              type: 'scatterpolar',
              r: [...values, values[0]],
              theta: [...categories, categories[0]],
              fill: 'toself',
              fillcolor: 'rgba(59, 130, 246, 0.15)',
              line: { color: '#3b82f6', width: 2 },
              marker: { size: 8, color: '#3b82f6' },
            },
          ]}
          layout={{
            autosize: true,
            height: 320,
            width: 380,
            margin: { l: 60, r: 60, t: 30, b: 30 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#9ca3af', size: 12 },
            polar: {
              bgcolor: 'transparent',
              radialaxis: {
                visible: true,
                range: [0, 100],
                gridcolor: '#1f2937',
                linecolor: '#374151',
                tickfont: { color: '#6b7280' },
              },
              angularaxis: {
                gridcolor: '#1f2937',
                linecolor: '#374151',
              },
            },
            showlegend: false,
          }}
          config={{ responsive: true, displayModeBar: false }}
        />

        <div className="flex-1 space-y-4">
          {biases.map((b) => (
            <div key={b.name} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-300">{b.name}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full`}
                    style={{ backgroundColor: `${bandColor(b.band)}20`, color: bandColor(b.band) }}>
                    {bandLabel(b.band)}
                  </span>
                </div>
                <div className="h-2 bg-dark-600 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${b.score}%`,
                      backgroundColor: bandColor(b.band),
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{b.score}/100</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
