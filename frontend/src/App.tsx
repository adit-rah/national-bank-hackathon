import { useState } from 'react';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';
import type { AnalysisResult } from './types';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  return (
    <div className="min-h-screen bg-dark-950 relative">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-blue/[0.03] rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-purple/[0.03] rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/[0.06] bg-dark-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple/80 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-white tracking-tight">Bias Detector</span>
            <span className="hidden sm:inline text-xs text-gray-600 ml-1">/ Trading Psychology</span>
          </div>

          {analysisResult && (
            <button
              onClick={() => setAnalysisResult(null)}
              className="group flex items-center gap-2 text-[13px] text-gray-500 hover:text-white transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-white/[0.04]"
            >
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New Analysis
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-[1400px] mx-auto px-8 py-8">
        <div className="animate-fade-in">
          {analysisResult ? (
            <Dashboard result={analysisResult} />
          ) : (
            <Upload onAnalysisComplete={setAnalysisResult} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
