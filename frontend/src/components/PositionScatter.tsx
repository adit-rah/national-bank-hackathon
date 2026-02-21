import Plot from 'react-plotly.js';
import type { PositionScatterPoint } from '../types';

interface Props {
  data: PositionScatterPoint[];
}

export default function PositionScatter({ data }: Props) {
  const wins = data.filter((d) => d.is_win);
  const losses = data.filter((d) => !d.is_win);

  return (
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Position Size vs Outcome</h3>
      <Plot
        data={[
          {
            x: wins.map((d) => d.position_size),
            y: wins.map((d) => d.pnl),
            mode: 'markers',
            type: 'scatter',
            name: 'Win',
            marker: { color: '#00d4aa', size: 5, opacity: 0.6 },
            text: wins.map((d) => d.asset),
            hovertemplate: '%{text}<br>Size: %{x:.1f}%<br>PnL: $%{y:.2f}<extra></extra>',
          },
          {
            x: losses.map((d) => d.position_size),
            y: losses.map((d) => d.pnl),
            mode: 'markers',
            type: 'scatter',
            name: 'Loss',
            marker: { color: '#ff4757', size: 5, opacity: 0.6 },
            text: losses.map((d) => d.asset),
            hovertemplate: '%{text}<br>Size: %{x:.1f}%<br>PnL: $%{y:.2f}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 400,
          margin: { l: 60, r: 20, t: 10, b: 50 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#9ca3af', size: 11 },
          xaxis: {
            title: 'Position Size (% of Balance)',
            gridcolor: '#1f2937',
            zeroline: true,
            zerolinecolor: '#374151',
          },
          yaxis: {
            title: 'Profit / Loss ($)',
            gridcolor: '#1f2937',
            zeroline: true,
            zerolinecolor: '#374151',
          },
          legend: {
            x: 0,
            y: 1.12,
            orientation: 'h',
            font: { color: '#d1d5db' },
          },
          hovermode: 'closest',
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
