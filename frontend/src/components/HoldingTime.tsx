import Plot from 'react-plotly.js';
import type { HoldingTimeComparison } from '../types';

interface Props {
  data: HoldingTimeComparison;
}

export default function HoldingTime({ data }: Props) {
  const ratio = data.loss_mean / Math.max(data.win_mean, 1);
  const hasSignal = data.loss_mean > data.win_mean;

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="section-title mb-1">Holding Time</p>
          <p className="text-[12px] text-gray-600">Win vs loss holding duration</p>
        </div>
        {hasSignal && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md bg-accent-yellow/10 text-accent-yellow">
            {ratio.toFixed(1)}x longer losses
          </span>
        )}
      </div>

      <Plot
        data={[
          {
            x: ['Mean', 'Median'],
            y: [data.win_mean, data.win_median],
            name: 'Wins',
            type: 'bar',
            marker: {
              color: 'rgba(52,211,153,0.7)',
              line: { color: '#34d399', width: 1 },
            },
          },
          {
            x: ['Mean', 'Median'],
            y: [data.loss_mean, data.loss_median],
            name: 'Losses',
            type: 'bar',
            marker: {
              color: 'rgba(248,113,113,0.7)',
              line: { color: '#f87171', width: 1 },
            },
          },
        ]}
        layout={{
          autosize: true,
          height: 230,
          margin: { l: 45, r: 8, t: 8, b: 36 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#6b7280', size: 10, family: 'Inter' },
          barmode: 'group',
          bargap: 0.3,
          bargroupgap: 0.1,
          yaxis: {
            title: { text: 'Seconds', font: { size: 9, color: '#4b5563' } },
            gridcolor: 'rgba(255,255,255,0.03)',
            tickfont: { size: 9 },
          },
          xaxis: {
            gridcolor: 'transparent',
            tickfont: { size: 10 },
          },
          legend: {
            x: 0, y: 1.15, orientation: 'h',
            font: { color: '#9ca3af', size: 10 },
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
