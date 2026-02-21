import Plot from 'react-plotly.js';
import type { TradeFrequency } from '../types';

interface Props {
  data: TradeFrequency;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Heatmap({ data }: Props) {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (let i = 0; i < data.days.length; i++) {
    const d = data.days[i];
    const h = data.hours[i];
    if (d >= 0 && d < 7 && h >= 0 && h < 24) {
      matrix[d][h] = data.counts[i];
    }
  }

  return (
    <div className="card p-6">
      <p className="section-title mb-1">Trade Frequency</p>
      <p className="text-[12px] text-gray-600 mb-4">Activity by day of week and hour</p>
      <Plot
        data={[
          {
            z: matrix,
            x: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            y: DAY_LABELS,
            type: 'heatmap',
            colorscale: [
              [0, 'rgba(11,17,32,1)'],
              [0.2, 'rgba(30,58,95,0.8)'],
              [0.5, 'rgba(96,165,250,0.5)'],
              [0.8, 'rgba(96,165,250,0.8)'],
              [1, 'rgba(52,211,153,0.9)'],
            ],
            hoverongaps: false,
            showscale: false,
          },
        ]}
        layout={{
          autosize: true,
          height: 260,
          margin: { l: 40, r: 8, t: 8, b: 36 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#6b7280', size: 9, family: 'Inter' },
          xaxis: {
            tickfont: { size: 8 },
            dtick: 3,
          },
          yaxis: {
            autorange: 'reversed' as const,
            tickfont: { size: 9 },
          },
          hoverlabel: {
            bgcolor: '#1a2540',
            bordercolor: 'rgba(255,255,255,0.1)',
            font: { color: '#e5e7eb', size: 11, family: 'Inter' },
          },
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
