import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Upload from './components/Upload';
import Dashboard from './components/Dashboard';
import type { AnalysisResult } from './types';

function App() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Header */}
      <header className="border-b border-dark-600 bg-dark-800/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue to-accent-purple flex items-center justify-center text-xl">
              🧠
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Bias Detector</h1>
              <p className="text-xs text-gray-400">Trading Psychology Analytics</p>
            </div>
          </div>
          {analysisResult && (
            <button
              onClick={() => setAnalysisResult(null)}
              className="text-sm text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-dark-600"
            >
              ← New Analysis
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
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
