import Plot from 'react-plotly.js';
import type { HoldingTimeComparison } from '../types';

interface Props {
  data: HoldingTimeComparison;
}

export default function HoldingTime({ data }: Props) {
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Holding Time: Wins vs Losses</h3>
      <Plot
        data={[
          {
            x: ['Mean', 'Median'],
            y: [data.win_mean, data.win_median],
            name: 'Wins',
            type: 'bar',
            marker: { color: '#00d4aa' },
          },
          {
            x: ['Mean', 'Median'],
            y: [data.loss_mean, data.loss_median],
            name: 'Losses',
            type: 'bar',
            marker: { color: '#ff4757' },
          },
        ]}
        layout={{
          autosize: true,
          height: 300,
          margin: { l: 50, r: 20, t: 10, b: 40 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#9ca3af', size: 11 },
          barmode: 'group',
          yaxis: {
            title: 'Seconds',
            gridcolor: '#1f2937',
          },
          xaxis: { gridcolor: '#1f2937' },
          legend: {
            x: 0,
            y: 1.15,
            orientation: 'h',
            font: { color: '#d1d5db' },
          },
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />

      {/* Insight text */}
      {data.loss_mean > data.win_mean && (
        <p className="mt-3 text-sm text-accent-yellow">
          ⚠ Losses are held {((data.loss_mean / Math.max(data.win_mean, 1)) - 1).toFixed(1)}x longer on average — a classic loss aversion signal.
        </p>
      )}
    </div>
  );
}
