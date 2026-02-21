import { useState } from 'react';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';
import type { AnalysisResult } from './types';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  return (
    <div className="min-h-screen bg-[#07090f]">
      {/* ─── Top bar ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0c0f18]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-[1360px] mx-auto px-6 flex items-center justify-between h-[52px]">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[14px] font-semibold text-white tracking-[-0.02em]">Bias Detector</span>
                <span className="text-[10px] text-[#3a4258] font-medium">v1.0</span>
              </div>
            </div>

            {/* Nav divider */}
            {analysisResult && (
              <>
                <div className="h-4 w-px bg-white/[0.06]" />
                <span className="text-[11px] text-[#5a6174] font-medium uppercase tracking-wider">
                  Analysis — {analysisResult.trade_count.toLocaleString()} trades
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {analysisResult && (
              <button
                onClick={() => setAnalysisResult(null)}
                className="btn-secondary flex items-center gap-1.5 text-[12px] py-1.5 px-3"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                New Analysis
              </button>
            )}
            <div className="flex items-center gap-1.5 text-[10px] text-[#2a3040] font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
              <span className="text-[#3a4258]">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Content ──────────────────────────────────────── */}
      <main className="max-w-[1360px] mx-auto px-6 py-6">
        {analysisResult ? (
          <Dashboard result={analysisResult} />
        ) : (
          <Upload onAnalysisComplete={setAnalysisResult} />
        )}
      </main>
    </div>
  );
}

export default App;
