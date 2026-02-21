import Plot from 'react-plotly.js';
import type { PositionScatterPoint } from '../types';

interface Props {
  data: PositionScatterPoint[];
}

export default function PositionScatter({ data }: Props) {
  const wins = data.filter((d) => d.is_win);
  const losses = data.filter((d) => !d.is_win);

  return (
    <div className="card p-6">
      <p className="section-title mb-1">Position Size vs Outcome</p>
      <p className="text-[12px] text-gray-600 mb-4">Larger positions correlated with larger losses indicate risk management issues</p>
      <Plot
        data={[
          {
            x: wins.map((d) => d.position_size),
            y: wins.map((d) => d.pnl),
            mode: 'markers',
            type: 'scatter',
            name: 'Win',
            marker: { color: 'rgba(52,211,153,0.5)', size: 4, line: { width: 0 } },
            text: wins.map((d) => d.asset),
            hovertemplate: '<b>%{text}</b><br>Size: %{x:.1f}%<br>PnL: $%{y:,.2f}<extra></extra>',
          },
          {
            x: losses.map((d) => d.position_size),
            y: losses.map((d) => d.pnl),
            mode: 'markers',
            type: 'scatter',
            name: 'Loss',
            marker: { color: 'rgba(248,113,113,0.5)', size: 4, line: { width: 0 } },
            text: losses.map((d) => d.asset),
            hovertemplate: '<b>%{text}</b><br>Size: %{x:.1f}%<br>PnL: $%{y:,.2f}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true,
          height: 360,
          margin: { l: 55, r: 16, t: 8, b: 44 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#6b7280', size: 10, family: 'Inter' },
          xaxis: {
            title: { text: 'Position Size (% of Balance)', font: { size: 10, color: '#4b5563' } },
            gridcolor: 'rgba(255,255,255,0.03)',
            zeroline: true,
            zerolinecolor: 'rgba(255,255,255,0.06)',
            tickfont: { size: 9 },
          },
          yaxis: {
            title: { text: 'Profit / Loss', font: { size: 10, color: '#4b5563' } },
            gridcolor: 'rgba(255,255,255,0.03)',
            zeroline: true,
            zerolinecolor: 'rgba(255,255,255,0.08)',
            tickfont: { size: 9 },
            tickprefix: '$',
          },
          legend: {
            x: 0, y: 1.1, orientation: 'h',
            font: { color: '#9ca3af', size: 10 },
          },
          hovermode: 'closest',
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
