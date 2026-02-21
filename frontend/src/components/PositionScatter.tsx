import Plot from 'react-plotly.js';
import type { PositionScatterPoint } from '../types';

interface Props { data: PositionScatterPoint[]; }

export default function PositionScatter({ data }: Props) {
  const wins = data.filter(d => d.is_win);
  const losses = data.filter(d => !d.is_win);

  return (
    <div className="card p-5">
      <p className="data-label mb-0.5">Position Size vs Outcome</p>
      <p className="text-[11px] text-[#2a3040] mb-4">Correlation between position sizing and PnL per trade</p>
      <Plot
        data={[
          {
            x: wins.map(d => d.position_size), y: wins.map(d => d.pnl),
            mode: 'markers', type: 'scatter', name: 'Win',
            marker: { color: 'rgba(52,211,153,0.35)', size: 3.5, line: { width: 0 } },
            text: wins.map(d => d.asset),
            hovertemplate: '<b>%{text}</b><br>Size: %{x:.1f}%<br>PnL: $%{y:,.2f}<extra></extra>',
          },
          {
            x: losses.map(d => d.position_size), y: losses.map(d => d.pnl),
            mode: 'markers', type: 'scatter', name: 'Loss',
            marker: { color: 'rgba(248,113,113,0.35)', size: 3.5, line: { width: 0 } },
            text: losses.map(d => d.asset),
            hovertemplate: '<b>%{text}</b><br>Size: %{x:.1f}%<br>PnL: $%{y:,.2f}<extra></extra>',
          },
        ]}
        layout={{
          autosize: true, height: 340,
          margin: { l: 50, r: 12, t: 4, b: 40 },
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { color: '#4a5068', size: 10, family: 'Inter' },
          xaxis: {
            title: { text: 'Position Size (% of Balance)', font: { size: 10, color: '#3a4258' }, standoff: 8 },
            gridcolor: 'rgba(255,255,255,0.025)',
            zeroline: true, zerolinecolor: 'rgba(255,255,255,0.04)',
            tickfont: { size: 9 },
          },
          yaxis: {
            title: { text: 'Profit / Loss', font: { size: 10, color: '#3a4258' }, standoff: 4 },
            gridcolor: 'rgba(255,255,255,0.025)',
            zeroline: true, zerolinecolor: 'rgba(255,255,255,0.06)',
            tickfont: { size: 9 }, tickprefix: '$',
          },
          legend: { x: 0, y: 1.08, orientation: 'h', font: { color: '#5a6174', size: 10 } },
          hovermode: 'closest',
          hoverlabel: { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11 } },
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
