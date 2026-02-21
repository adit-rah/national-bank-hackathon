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
        setProgress(`Uploading ${file.name}...`);
        setError('');

        const uploadRes = await uploadFile(file);
        setProgress(`Uploaded ${uploadRes.trade_count} trades. Running analysis...`);
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
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">Analyze Your Trading Biases</h2>
        <p className="text-gray-400 max-w-lg mx-auto">
          Upload your trade history to uncover overtrading, loss aversion, and revenge trading
          patterns with statistical precision.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          w-full max-w-2xl border-2 border-dashed rounded-2xl p-16
          flex flex-col items-center justify-center cursor-pointer
          transition-all duration-200
          ${isDragActive ? 'border-accent-blue bg-accent-blue/5 scale-[1.02]' : 'border-dark-500 hover:border-accent-blue/50 bg-dark-800/50'}
          ${(status === 'uploading' || status === 'analyzing') ? 'opacity-60 cursor-wait' : ''}
        `}
      >
        <input {...getInputProps()} />

        {status === 'idle' && (
          <>
            <div className="w-16 h-16 rounded-full bg-dark-600 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-white font-medium text-lg mb-2">
              {isDragActive ? 'Drop your file here' : 'Drag & drop your trade file'}
            </p>
            <p className="text-gray-500 text-sm">CSV or Excel — up to 200k trades</p>
          </>
        )}

        {(status === 'uploading' || status === 'analyzing') && (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-dark-500 border-t-accent-blue rounded-full animate-spin mb-6" />
            <p className="text-accent-blue font-medium">{progress}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-accent-red/10 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-accent-red font-medium mb-2">Error</p>
            <p className="text-gray-400 text-sm text-center max-w-md">{error}</p>
            <button
              onClick={(e) => { e.stopPropagation(); setStatus('idle'); setError(''); }}
              className="mt-4 text-sm text-accent-blue hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Expected format hint */}
      <div className="mt-10 w-full max-w-2xl">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-3">Expected columns</p>
        <div className="flex flex-wrap gap-2">
          {['timestamp', 'asset', 'side', 'quantity', 'entry_price', 'exit_price', 'profit_loss', 'balance'].map(
            (col) => (
              <span key={col} className="px-3 py-1 bg-dark-700 rounded-full text-xs text-gray-300 font-mono">
                {col}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
