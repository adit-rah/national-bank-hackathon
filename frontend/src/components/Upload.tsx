import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile, runAnalysis } from '../api/client';
import type { AnalysisResult } from '../types';

interface Props {
  onAnalysisComplete: (result: AnalysisResult) => void;
}

export default function Upload({ onAnalysisComplete }: Props) {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'error'>('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      try {
        setStatus('uploading');
        setProgress(`Uploading ${file.name}…`);
        setError('');
        const uploadRes = await uploadFile(file);
        setProgress(`Analyzing ${uploadRes.trade_count.toLocaleString()} trades…`);
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

  const isProcessing = status === 'uploading' || status === 'analyzing';

  return (
    <div className="flex flex-col items-center justify-center min-h-[78vh]">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="data-label mb-3">Trading Psychology Analytics</p>
          <h1 className="text-[28px] font-bold text-white tracking-[-0.03em] leading-tight mb-3">
            Upload your trade history
          </h1>
          <p className="text-[13px] text-[#5a6174] leading-relaxed max-w-sm mx-auto">
            Quantified bias scoring with statistical validation, counterfactual simulation, and AI-powered coaching.
          </p>
        </div>

        {/* Drop zone */}
        <div
          {...getRootProps()}
          className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
            isProcessing
              ? 'border-white/[0.04] bg-[#0c0f18]'
              : isDragActive
              ? 'border-blue-500/40 bg-blue-500/[0.03]'
              : status === 'error'
              ? 'border-red-500/20 bg-red-500/[0.02] cursor-pointer'
              : 'border-white/[0.06] bg-[#0b0e17] hover:border-white/[0.1] hover:bg-[#0d1019] cursor-pointer'
          }`}
        >
          <input {...getInputProps()} />

          <div className="px-10 py-14 flex flex-col items-center">
            {status === 'idle' && (
              <>
                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.04] flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-[#4a5068]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-[14px] text-white font-medium mb-1">
                  {isDragActive ? 'Release to upload' : 'Drop file or click to browse'}
                </p>
                <p className="text-[12px] text-[#3a4258] mb-5">CSV or Excel</p>
                <div className="flex gap-1.5">
                  {['.CSV', '.XLSX'].map(ext => (
                    <span key={ext} className="badge bg-white/[0.03] text-[#4a5068] border border-white/[0.04]">{ext}</span>
                  ))}
                </div>
              </>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center">
                {/* Progress indicator */}
                <div className="relative w-10 h-10 mb-5">
                  <svg className="w-10 h-10 animate-spin" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                    <circle cx="20" cy="20" r="17" fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeDasharray="80 27" />
                  </svg>
                </div>
                <p className="text-[13px] text-white font-medium mb-1">{progress}</p>
                <p className="text-[11px] text-[#3a4258]">
                  {status === 'uploading' ? 'Parsing and validating data…' : 'Running bias detection pipeline…'}
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-red-500/[0.06] border border-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-[13px] text-red-400 font-medium mb-1">Upload failed</p>
                <p className="text-[11px] text-[#5a6174] text-center max-w-xs mb-4">{error}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setStatus('idle'); setError(''); }}
                  className="text-[12px] text-blue-400 font-medium hover:text-blue-300 transition-colors"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Schema hint */}
        <div className="mt-8">
          <p className="data-label mb-2.5">Required columns</p>
          <div className="flex flex-wrap gap-1">
            {['timestamp', 'asset', 'side', 'quantity', 'entry_price', 'exit_price', 'profit_loss', 'balance'].map(col => (
              <code key={col} className="px-2 py-0.5 bg-white/[0.02] border border-white/[0.03] rounded text-[10px] text-[#4a5068] mono">{col}</code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
