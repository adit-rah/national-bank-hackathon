import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile, runAnalysis } from '../api/client';
import type { AnalysisResult } from '../types';

interface Props {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'done', label: 'Complete' },
] as const;

export default function Upload({ onAnalysisComplete }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const currentStep = status === 'uploading' ? 0 : status === 'analyzing' ? 1 : -1;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        setStatus('uploading');
        setProgress(`Uploading ${file.name}...`);
        setError('');

        const uploadRes = await uploadFile(file);
        setProgress(`Processing ${uploadRes.trade_count.toLocaleString()} trades...`);
        setStatus('analyzing');

        const analysisRes = await runAnalysis(uploadRes.session_id);
        onAnalysisComplete(analysisRes);
      } catch (err: any) {
        setStatus('error');
        setError(err?.response?.data?.detail || err.message || 'Upload failed');
      }
    },
    [onAnalysisComplete]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
    disabled: status === 'uploading' || status === 'analyzing',
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] animate-fade-in-up">
      {/* Hero text */}
      <div className="text-center mb-12 max-w-xl">
        <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">
          Detect Your Trading Biases
        </h2>
        <p className="text-gray-500 text-base leading-relaxed">
          Upload your trade history for quantified bias scoring, statistical validation,
          and personalized coaching powered by AI.
        </p>
      </div>

      {/* Progress steps (visible during processing) */}
      {(status === 'uploading' || status === 'analyzing') && (
        <div className="flex items-center gap-3 mb-8 animate-fade-in">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  i < currentStep ? 'bg-accent-green/20 text-accent-green' :
                  i === currentStep ? 'bg-accent-blue/20 text-accent-blue animate-pulse-soft' :
                  'bg-white/[0.04] text-gray-600'
                }`}>
                  {i < currentStep ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  i <= currentStep ? 'text-gray-300' : 'text-gray-600'
                }`}>{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px ${i < currentStep ? 'bg-accent-green/30' : 'bg-white/[0.06]'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          w-full max-w-xl rounded-2xl transition-all duration-300
          ${status === 'idle' || status === 'error' ? 'cursor-pointer' : 'cursor-wait'}
          ${isDragActive
            ? 'border-2 border-accent-blue/60 bg-accent-blue/[0.04] scale-[1.01] shadow-[0_0_60px_rgba(96,165,250,0.08)]'
            : 'border border-dashed border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.03]'}
          ${(status === 'uploading' || status === 'analyzing') ? 'border-solid border-white/[0.06] bg-white/[0.02]' : ''}
        `}
      >
        <input {...getInputProps()} />

        <div className="px-12 py-16 flex flex-col items-center">
          {status === 'idle' && (
            <>
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <p className="text-white font-medium text-base mb-1.5">
                {isDragActive ? 'Drop to upload' : 'Drop your trade file here'}
              </p>
              <p className="text-gray-600 text-sm mb-6">or click to browse</p>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-white/[0.04] rounded-md text-[11px] text-gray-500 font-medium">.CSV</span>
                <span className="px-2.5 py-1 bg-white/[0.04] rounded-md text-[11px] text-gray-500 font-medium">.XLSX</span>
              </div>
            </>
          )}

          {(status === 'uploading' || status === 'analyzing') && (
            <div className="flex flex-col items-center">
              <div className="relative w-12 h-12 mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent-blue animate-spin" />
              </div>
              <p className="text-gray-300 text-sm font-medium">{progress}</p>
              <p className="text-gray-600 text-xs mt-1.5">This may take a moment for large datasets</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-accent-red/[0.08] flex items-center justify-center mb-5">
                <svg className="w-6 h-6 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p className="text-accent-red text-sm font-medium mb-1.5">Upload failed</p>
              <p className="text-gray-500 text-xs text-center max-w-sm mb-4">{error}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setStatus('idle'); setError(''); }}
                className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expected columns */}
      <div className="mt-12 w-full max-w-xl">
        <p className="section-title mb-3">Required columns</p>
        <div className="flex flex-wrap gap-1.5">
          {['timestamp', 'asset', 'side', 'quantity', 'entry_price', 'exit_price', 'profit_loss', 'balance'].map(
            (col) => (
              <span key={col} className="px-2.5 py-1 bg-white/[0.03] border border-white/[0.04] rounded-lg text-[11px] text-gray-500 font-mono">
                {col}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
