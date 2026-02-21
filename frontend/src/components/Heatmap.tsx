import Plot from 'react-plotly.js';
import type { TradeFrequency } from '../types';

interface Props { data: TradeFrequency; }

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Heatmap({ data }: Props) {
  const matrix: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (let i = 0; i < data.days.length; i++) {
    const d = data.days[i], h = data.hours[i];
    if (d >= 0 && d < 7 && h >= 0 && h < 24) matrix[d][h] = data.counts[i];
  }

  return (
    <div className="card p-5">
      <p className="data-label mb-0.5">Trade Frequency</p>
      <p className="text-[11px] text-[#2a3040] mb-4">Activity heatmap by day and hour</p>
      <Plot
        data={[{
          z: matrix,
          x: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
          y: DAYS,
          type: 'heatmap',
          colorscale: [
            [0, '#0a0d16'],
            [0.25, '#0f1a30'],
            [0.5, '#1a3a6a'],
            [0.75, '#2563eb'],
            [1, '#3b82f6'],
          ],
          hoverongaps: false,
          showscale: false,
          hovertemplate: '%{y} %{x}: <b>%{z}</b> trades<extra></extra>',
        }]}
        layout={{
          autosize: true, height: 240,
          margin: { l: 36, r: 4, t: 4, b: 32 },
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: { color: '#4a5068', size: 9, family: 'Inter' },
          xaxis: { tickfont: { size: 8 }, dtick: 4 },
          yaxis: { autorange: 'reversed' as const, tickfont: { size: 9 } },
          hoverlabel: { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11 } },
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
