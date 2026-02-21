import Plot from 'react-plotly.js';
import type { HoldingTimeComparison } from '../types';

interface Props { data: HoldingTimeComparison; }

export default function HoldingTime({ data }: Props) {
  const ratio = data.loss_mean / Math.max(data.win_mean, 1);
  const hasSignal = data.loss_mean > data.win_mean * 1.05;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="data-label mb-0.5">Holding Duration</p>
          <p className="text-[11px] text-[#2a3040]">Win vs loss comparison</p>
        </div>
        {hasSignal && (
          <span className="badge bg-amber-400/8 text-amber-400 border border-amber-400/10">
            {ratio.toFixed(1)}x longer losses
          </span>
        )}
      </div>
      <Plot
        data={[
          {
            x: ['Mean', 'Median'], y: [data.win_mean, data.win_median],
            name: 'Wins', type: 'bar',
            marker: { color: 'rgba(52,211,153,0.6)', line: { color: '#34d399', width: 1 } },
            hovertemplate: '%{y:.0f}s<extra>Wins</extra>',
          },
          {
            x: ['Mean', 'Median'], y: [data.loss_mean, data.loss_median],
            name: 'Losses', type: 'bar',
            marker: { color: 'rgba(248,113,113,0.6)', line: { color: '#f87171', width: 1 } },
            hovertemplate: '%{y:.0f}s<extra>Losses</extra>',
          },
        ]}
        layout={{
          autosize: true, height: 220,
          margin: { l: 40, r: 4, t: 4, b: 32 },
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { color: '#4a5068', size: 10, family: 'Inter' },
          barmode: 'group', bargap: 0.35, bargroupgap: 0.15,
          yaxis: { gridcolor: 'rgba(255,255,255,0.025)', tickfont: { size: 9 }, ticksuffix: 's' },
          xaxis: { gridcolor: 'transparent', tickfont: { size: 10 } },
          legend: { x: 0, y: 1.15, orientation: 'h', font: { color: '#5a6174', size: 10 } },
          hoverlabel: { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11 } },
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
