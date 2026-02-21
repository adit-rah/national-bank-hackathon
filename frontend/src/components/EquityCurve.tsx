import Plot from 'react-plotly.js';
import type { EquityCurvePoint } from '../types';

interface Props { data: EquityCurvePoint[]; }

const CHART_FONT = { color: '#4a5068', size: 10, family: 'Inter, system-ui, sans-serif' };
const GRID = 'rgba(255,255,255,0.025)';
const HOVER = { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11, family: 'Inter' } };

export default function EquityCurve({ data }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="data-label">Equity Curve</p>
          <p className="text-[11px] text-[#2a3040] mt-0.5">Balance trajectory with drawdown overlay</p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" /> Balance</span>
          <span className="flex items-center gap-1.5 text-[#5a6174]"><span className="w-3 h-0.5 bg-red-400/50 rounded-full inline-block" /> Drawdown</span>
        </div>
      </div>
      <Plot
        data={[
          {
            x: data.map(d => d.timestamp),
            y: data.map(d => d.balance),
            type: 'scatter', mode: 'lines', name: 'Balance',
            line: { color: '#3b82f6', width: 1.5 },
            yaxis: 'y1',
            hovertemplate: '$%{y:,.0f}<extra>Balance</extra>',
          },
          {
            x: data.map(d => d.timestamp),
            y: data.map(d => d.drawdown),
            type: 'scatter', mode: 'lines', fill: 'tozeroy', name: 'Drawdown',
            line: { color: 'rgba(248,113,113,0.4)', width: 1 },
            fillcolor: 'rgba(248,113,113,0.04)',
            yaxis: 'y2',
            hovertemplate: '%{y:.1f}%<extra>Drawdown</extra>',
          },
        ]}
        layout={{
          autosize: true, height: 340,
          margin: { l: 52, r: 48, t: 4, b: 32 },
          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
          font: CHART_FONT,
          xaxis: { gridcolor: GRID, linecolor: 'transparent', tickfont: { size: 9 }, showgrid: false },
          yaxis: {
            gridcolor: GRID, linecolor: 'transparent', tickfont: { size: 9 },
            tickprefix: '$', side: 'left',
          },
          yaxis2: {
            overlaying: 'y', side: 'right', gridcolor: 'transparent',
            linecolor: 'transparent', tickfont: { size: 9 }, ticksuffix: '%',
          },
          hovermode: 'x unified',
          hoverlabel: HOVER,
          showlegend: false,
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
