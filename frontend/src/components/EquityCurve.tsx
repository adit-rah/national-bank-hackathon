import Plot from 'react-plotly.js';
import type { EquityCurvePoint, BiasTimelinePoint } from '../types';

interface Props {
  data: EquityCurvePoint[];
  biasTimeline?: BiasTimelinePoint[];
}

const CHART_FONT = { color: '#4a5068', size: 10, family: 'Inter, system-ui, sans-serif' };
const GRID = 'rgba(255,255,255,0.025)';
const HOVER = { bgcolor: '#141c30', bordercolor: 'rgba(255,255,255,0.08)', font: { color: '#c9cdd5', size: 11, family: 'Inter' } };

const BIAS_LABELS: Record<string, string> = {
  overtrading: 'Overtrading',
  loss_aversion: 'Loss Aversion',
  revenge_trading: 'Revenge Trading',
  anchoring: 'Anchoring',
  overconfidence: 'Overconfidence',
  none: 'None',
};

function buildBiasZones(timeline: BiasTimelinePoint[]): Partial<Plotly.Shape>[] {
  return timeline.map(point => {
    const maxScore = Math.max(
      point.overtrading,
      point.loss_aversion,
      point.revenge_trading,
      point.anchoring,
      point.overconfidence,
    );

    let color: string;
    if (maxScore >= 60) {
      color = 'rgba(248,113,113,0.08)';
    } else if (maxScore >= 30) {
      color = 'rgba(251,191,36,0.06)';
    } else {
      color = 'rgba(52,211,153,0.04)';
    }

    return {
      type: 'rect' as const,
      xref: 'x' as const,
      yref: 'paper' as const,
      x0: point.window_start,
      x1: point.window_end,
      y0: 0,
      y1: 1,
      fillcolor: color,
      line: { width: 0 },
      layer: 'below' as const,
    };
  });
}

function buildBiasAnnotations(timeline: BiasTimelinePoint[]): Partial<Plotly.Annotations>[] {
  const highRisk = timeline.filter(p => {
    const max = Math.max(p.overtrading, p.loss_aversion, p.revenge_trading, p.anchoring, p.overconfidence);
    return max >= 60;
  });

  return highRisk.map(p => ({
    x: p.timestamp,
    y: 1.02,
    yref: 'paper' as const,
    text: BIAS_LABELS[p.dominant_bias] || p.dominant_bias,
    showarrow: false,
    font: { size: 8, color: 'rgba(248,113,113,0.6)' },
    yanchor: 'bottom' as const,
  }));
}

export default function EquityCurve({ data, biasTimeline }: Props) {
  const shapes = biasTimeline?.length ? buildBiasZones(biasTimeline) : [];
  const annotations = biasTimeline?.length ? buildBiasAnnotations(biasTimeline) : [];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="data-label">Equity Curve</p>
          <p className="text-[11px] text-[#2a3040] mt-0.5">
            Balance trajectory with drawdown overlay
            {biasTimeline?.length ? ' and bias severity zones' : ''}
          </p>
        </div>
        <div className="flex items-center gap-4 text-[10px]">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-400 rounded-full inline-block" /> Balance</span>
          <span className="flex items-center gap-1.5 text-[#5a6174]"><span className="w-3 h-0.5 bg-red-400/50 rounded-full inline-block" /> Drawdown</span>
          {biasTimeline?.length ? (
            <>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(52,211,153,0.3)' }} /> Disciplined</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(251,191,36,0.3)' }} /> Elevated</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(248,113,113,0.3)' }} /> High Risk</span>
            </>
          ) : null}
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
          shapes,
          annotations,
        }}
        config={{ responsive: true, displayModeBar: false }}
        className="w-full"
      />
    </div>
  );
}
