import { useState } from 'react';
import { getCoaching } from '../api/client';
import type { CoachResult } from '../types';

interface Props {
  sessionId: string;
}

export default function CoachPanel({ sessionId }: Props) {
  const [result, setResult] = useState<CoachResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<string>('');

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getCoaching(sessionId, provider || undefined);
      setResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to generate coaching');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Controls */}
      <div className="card p-6">
        <div className="mb-6">
          <p className="section-title mb-1">AI Trading Coach</p>
          <p className="text-[13px] text-gray-500">
            Get personalized coaching grounded in your actual metrics — not generic advice.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="bg-white/[0.03] border border-white/[0.06] text-gray-300 rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:border-accent-blue/30 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Default Provider</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2.5 bg-accent-purple hover:bg-accent-purple/80 disabled:bg-white/[0.04] disabled:text-gray-600 text-white text-[13px] font-medium rounded-xl transition-all duration-200"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : result ? 'Regenerate' : 'Generate Coaching'}
          </button>
        </div>

        {error && <p className="mt-3 text-[12px] text-accent-red">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in-up">
          {/* Provider indicator */}
          <div className="flex items-center">
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-md ${
              result.provider === 'fallback'
                ? 'bg-accent-yellow/10 text-accent-yellow'
                : 'bg-white/[0.04] text-gray-500'
            }`}>
              {result.provider === 'fallback'
                ? 'Template-based (no API key)'
                : `${result.provider === 'openai' ? 'GPT-4o' : result.provider === 'anthropic' ? 'Claude' : result.provider}`}
            </span>
          </div>

          {/* Feedback */}
          <div className="card p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent-purple/10 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-accent-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h4 className="text-[13px] font-semibold text-white">Psychological Analysis</h4>
            </div>
            <div className="text-[13px] text-gray-400 leading-[1.7] whitespace-pre-line">
              {result.feedback}
            </div>
          </div>

          {/* Discipline Plan */}
          {result.discipline_plan.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                </div>
                <h4 className="text-[13px] font-semibold text-white">Discipline Plan</h4>
              </div>
              <ol className="space-y-3">
                {result.discipline_plan.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-md bg-accent-blue/10 text-accent-blue flex items-center justify-center text-[10px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-gray-400 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Daily Checklist + Journaling side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.daily_checklist.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-accent-green/10 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-accent-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-[13px] font-semibold text-white">Daily Checklist</h4>
                </div>
                <ul className="space-y-2.5">
                  {result.daily_checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 w-4 h-4 rounded border border-white/[0.08] mt-0.5" />
                      <span className="text-[13px] text-gray-400 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.journaling_prompts.length > 0 && (
              <div className="card p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-accent-yellow/10 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-accent-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                  <h4 className="text-[13px] font-semibold text-white">Journaling Prompts</h4>
                </div>
                <ul className="space-y-3">
                  {result.journaling_prompts.map((prompt, i) => (
                    <li key={i} className="text-[13px] text-gray-400 leading-relaxed italic pl-4 border-l-2 border-accent-purple/30">
                      {prompt}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
