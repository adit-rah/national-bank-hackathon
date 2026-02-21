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
    <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
      <h3 className="text-white font-semibold mb-4">Equity Curve & Drawdown</h3>
      <Plot
        data={[
          {
            x: timestamps,
            y: balances,
            type: 'scatter',
            mode: 'lines',
            name: 'Balance',
            line: { color: '#3b82f6', width: 2 },
            yaxis: 'y1',
          },
          {
            x: timestamps,
            y: drawdowns,
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            name: 'Drawdown %',
            line: { color: '#ff4757', width: 1 },
            fillcolor: 'rgba(255,71,87,0.1)',
            yaxis: 'y2',
          },
        ]}
        layout={{
          autosize: true,
          height: 400,
          margin: { l: 60, r: 60, t: 10, b: 40 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: '#9ca3af', size: 11 },
          xaxis: {
            gridcolor: '#1f2937',
            linecolor: '#374151',
          },
          yaxis: {
            title: 'Balance ($)',
            gridcolor: '#1f2937',
            linecolor: '#374151',
            side: 'left',
          },
          yaxis2: {
            title: 'Drawdown %',
            overlaying: 'y',
            side: 'right',
            gridcolor: 'transparent',
            linecolor: '#374151',
          },
          legend: {
            x: 0,
            y: 1.12,
            orientation: 'h',
            font: { color: '#d1d5db' },
          },
          hovermode: 'x unified',
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
