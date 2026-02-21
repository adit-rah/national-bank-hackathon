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
    <div className="space-y-6">
      {/* Generate button */}
      <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-2">AI Trading Coach</h3>
        <p className="text-gray-400 text-sm mb-6">
          Get personalized psychological feedback and a discipline plan grounded in your actual trading metrics.
        </p>

        <div className="flex items-center gap-4">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="bg-dark-700 border border-dark-500 text-gray-300 rounded-lg px-4 py-2.5 text-sm"
          >
            <option value="">Default Provider</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="gemini">Google Gemini (Free Tier)</option>
          </select>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-accent-purple hover:bg-accent-purple/80 disabled:bg-dark-600 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </span>
            ) : result ? 'Regenerate' : 'Generate Coaching'}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-accent-red">{error}</p>}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-6">
          {/* Provider badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-3 py-1 rounded-full ${
              result.provider === 'fallback'
                ? 'bg-accent-yellow/10 text-accent-yellow'
                : 'bg-dark-600 text-gray-400'
            }`}>
              {result.provider === 'fallback'
                ? 'Template-based (no API key configured)'
                : `Powered by ${{ openai: 'GPT-4o', anthropic: 'Claude', gemini: 'Gemini 2.0 Flash' }[result.provider] || result.provider}`}
            </span>
          </div>

          {/* Feedback */}
          <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">🧠</span> Psychological Analysis
            </h4>
            <div className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
              {result.feedback}
            </div>
          </div>

          {/* Discipline Plan */}
          {result.discipline_plan.length > 0 && (
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-lg">📋</span> Discipline Plan
              </h4>
              <ol className="space-y-2">
                {result.discipline_plan.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-accent-blue/20 text-accent-blue flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    <span className="text-gray-300">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Daily Checklist */}
          {result.daily_checklist.length > 0 && (
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-lg">✅</span> Daily Checklist
              </h4>
              <ul className="space-y-2">
                {result.daily_checklist.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="flex-shrink-0 w-5 h-5 rounded border border-dark-500 mt-0.5" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Journaling Prompts */}
          {result.journaling_prompts.length > 0 && (
            <div className="bg-dark-800 border border-dark-600 rounded-xl p-6">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="text-lg">📝</span> Journaling Prompts
              </h4>
              <ul className="space-y-3">
                {result.journaling_prompts.map((prompt, i) => (
                  <li key={i} className="text-sm text-gray-300 italic border-l-2 border-accent-purple pl-4">
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
