import Plot from 'react-plotly.js';
import type { BiasTimelinePoint } from '../types';

interface Props {
  data: BiasTimelinePoint[];
}

const BIAS_CONFIG: { key: keyof Omit<BiasTimelinePoint, 'timestamp' | 'window_start' | 'window_end' | 'trade_count' | 'dominant_bias'>; label: string; color: string }[] = [
  { key: 'overtrading', label: 'Overtrading', color: '#60a5fa' },
  { key: 'loss_aversion', label: 'Loss Aversion', color: '#fbbf24' },
  { key: 'revenge_trading', label: 'Revenge Trading', color: '#f87171' },
  { key: 'anchoring', label: 'Anchoring', color: '#a78bfa' },
  { key: 'overconfidence', label: 'Overconfidence', color: '#34d399' },
];

const CHART_FONT = { color: '#4a5068', size: 10, family: 'Inter, system-ui, sans-serif' };
const HOVER = { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11, family: 'Inter' } };

export default function BiasEvolution({ data }: Props) {
  if (!data.length) return null;

  const timestamps = data.map(d => d.timestamp);

  const traces: Plotly.Data[] = BIAS_CONFIG.map(({ key, label, color }) => ({
    x: timestamps,
    y: data.map(d => d[key]),
    type: 'scatter' as const,
    mode: 'lines' as const,
    name: label,
    line: { color, width: 2, shape: 'spline' as const },
    hovertemplate: `%{y:.1f}/100<extra>${label}</extra>`,
  }));

  const shapes: Partial<Plotly.Shape>[] = [
    {
      type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 30, y1: 30,
      line: { color: 'rgba(251,191,36,0.25)', width: 1, dash: 'dot' },
    },
    {
      type: 'line', xref: 'paper', x0: 0, x1: 1, y0: 60, y1: 60,
      line: { color: 'rgba(248,113,113,0.25)', width: 1, dash: 'dot' },
    },
  ];

  return (
    <div className="card p-5">
      <div className="mb-4">
        <p className="data-label">Bias Evolution</p>
        <p className="text-[11px] text-[#2a3040] mt-0.5">How each bias score changes throughout the session</p>
      </div>
      <Plot
        data={traces}
        layout={{
          autosize: true,
          height: 360,
          margin: { l: 42, r: 16, t: 8, b: 36 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: CHART_FONT,
          xaxis: {
            gridcolor: 'rgba(255,255,255,0.025)',
            linecolor: 'transparent',
            tickfont: { size: 9 },
            showgrid: false,
          },
          yaxis: {
            range: [0, 100],
            gridcolor: 'rgba(255,255,255,0.025)',
            linecolor: 'transparent',
            tickfont: { size: 9 },
            title: { text: 'Bias Score', font: { size: 10, color: '#4a5068' } },
          },
          shapes,
          hovermode: 'x unified',
          hoverlabel: HOVER,
          legend: {
            orientation: 'h',
            y: -0.15,
            x: 0.5,
            xanchor: 'center',
            font: { size: 10, color: '#6b7280' },
            bgcolor: 'transparent',
          },
          annotations: [
            {
              x: 1.0, xref: 'paper', xanchor: 'right',
              y: 30, yanchor: 'bottom',
              text: 'Elevated',
              showarrow: false,
              font: { size: 8, color: 'rgba(251,191,36,0.5)' },
            },
            {
              x: 1.0, xref: 'paper', xanchor: 'right',
              y: 60, yanchor: 'bottom',
              text: 'High Risk',
              showarrow: false,
              font: { size: 8, color: 'rgba(248,113,113,0.5)' },
            },
          ],
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
