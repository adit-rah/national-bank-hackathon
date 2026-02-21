import Plot from 'react-plotly.js';
import type { TradeFrequency } from '../types';

interface Props {
  data: TradeFrequency;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Heatmap({ data }: Props) {
  // Build 7×24 matrix
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (let i = 0; i < data.days.length; i++) {
    const d = data.days[i];
    const h = data.hours[i];
    if (d >= 0 && d < 7 && h >= 0 && h < 24) {
      matrix[d][h] = data.counts[i];
    }
  }

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Trade Frequency Heatmap</h3>
      <Plot
        data={[
          {
            z: matrix,
            x: Array.from({ length: 24 }, (_, i) => `${i}:00`),
            y: DAY_LABELS,
            type: 'heatmap',
            colorscale: [
              [0, '#111827'],
              [0.25, '#1e3a5f'],
              [0.5, '#2563eb'],
              [0.75, '#60a5fa'],
              [1, '#00d4aa'],
            ],
            hoverongaps: false,
            colorbar: {
              tickfont: { color: '#9ca3af' },
              title: { text: 'Trades', font: { color: '#9ca3af' } },
            },
          },
        ]}
        layout={{
          autosize: true,
          height: 300,
          margin: { l: 50, r: 20, t: 10, b: 40 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#9ca3af', size: 11 },
          xaxis: { title: 'Hour of Day' },
          yaxis: { autorange: 'reversed' as const },
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
