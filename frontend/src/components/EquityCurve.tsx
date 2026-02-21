import Plot from 'react-plotly.js';
import type { EquityCurvePoint } from '../types';

interface Props {
  data: EquityCurvePoint[];
}

export default function EquityCurve({ data }: Props) {
  const timestamps = data.map((d) => d.timestamp);
  const balances = data.map((d) => d.balance);
  const drawdowns = data.map((d) => d.drawdown);

  return (
    <div className="card p-6">
      <p className="section-title mb-1">Equity Curve & Drawdown</p>
      <p className="text-[12px] text-gray-600 mb-4">Balance over time with drawdown overlay</p>
      <Plot
        data={[
          {
            x: timestamps,
            y: balances,
            type: 'scatter',
            mode: 'lines',
            name: 'Balance',
            line: { color: '#60a5fa', width: 1.5, shape: 'spline' },
            yaxis: 'y1',
          },
          {
            x: timestamps,
            y: drawdowns,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            name: 'Drawdown %',
            line: { color: '#f87171', width: 1 },
            fillcolor: 'rgba(248,113,113,0.06)',
            yaxis: 'y2',
          },
        ]}
        layout={{
          autosize: true,
          height: 360,
          margin: { l: 55, r: 55, t: 8, b: 36 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#6b7280', size: 10, family: 'Inter' },
          xaxis: {
            gridcolor: 'rgba(255,255,255,0.03)',
            linecolor: 'rgba(255,255,255,0.06)',
            tickfont: { size: 9 },
          },
          yaxis: {
            title: { text: 'Balance', font: { size: 10, color: '#4b5563' } },
            gridcolor: 'rgba(255,255,255,0.03)',
            linecolor: 'rgba(255,255,255,0.06)',
            side: 'left',
            tickfont: { size: 9 },
            tickprefix: '$',
          },
          yaxis2: {
            title: { text: 'Drawdown', font: { size: 10, color: '#4b5563' } },
            overlaying: 'y',
            side: 'right',
            gridcolor: 'transparent',
            linecolor: 'rgba(255,255,255,0.06)',
            tickfont: { size: 9 },
            ticksuffix: '%',
          },
          legend: {
            x: 0, y: 1.1, orientation: 'h',
            font: { color: '#9ca3af', size: 10 },
          },
          hovermode: 'x unified',
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
