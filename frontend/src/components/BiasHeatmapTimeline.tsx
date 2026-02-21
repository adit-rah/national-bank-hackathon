import Plot from 'react-plotly.js';
import type { BiasTimelinePoint } from '../types';

interface Props {
  data: BiasTimelinePoint[];
}

const BIAS_KEYS: (keyof BiasTimelinePoint)[] = [
  'overtrading',
  'loss_aversion',
  'revenge_trading',
  'anchoring',
  'overconfidence',
];

const BIAS_LABELS = [
  'Overtrading',
  'Loss Aversion',
  'Revenge Trading',
  'Anchoring',
  'Overconfidence',
];

const CHART_FONT = { color: '#4a5068', size: 10, family: 'Inter, system-ui, sans-serif' };
const HOVER = { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11, family: 'Inter' } };

export default function BiasHeatmapTimeline({ data }: Props) {
  if (!data.length) return null;

  const timestamps = data.map(d => d.timestamp);

  const z = BIAS_KEYS.map(key =>
    data.map(d => d[key] as number),
  );

  return (
    <div className="card p-5">
      <div className="mb-4">
        <p className="data-label">Bias Heatmap</p>
        <p className="text-[11px] text-[#2a3040] mt-0.5">Severity of each bias across time windows</p>
      </div>
      <Plot
        data={[
          {
            x: timestamps,
            y: BIAS_LABELS,
            z,
            type: 'heatmap',
            colorscale: [
              [0, '#064e3b'],
              [0.3, '#065f46'],
              [0.5, '#92400e'],
              [0.6, '#b45309'],
              [0.8, '#b91c1c'],
              [1.0, '#991b1b'],
            ],
            zmin: 0,
            zmax: 100,
            colorbar: {
              title: { text: 'Score', font: { size: 10, color: '#6b7280' } },
              tickfont: { size: 9, color: '#6b7280' },
              len: 0.9,
              thickness: 12,
              outlinewidth: 0,
            },
            hovertemplate: '%{y}<br>Time: %{x}<br>Score: %{z:.1f}/100<extra></extra>',
            xgap: 1,
            ygap: 2,
          },
        ]}
        layout={{
          autosize: true,
          height: 240,
          margin: { l: 110, r: 60, t: 8, b: 36 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: CHART_FONT,
          xaxis: {
            showgrid: false,
            linecolor: 'transparent',
            tickfont: { size: 9 },
          },
          yaxis: {
            autorange: 'reversed' as const,
            showgrid: false,
            linecolor: 'transparent',
            tickfont: { size: 10 },
          },
          hoverlabel: HOVER,
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
