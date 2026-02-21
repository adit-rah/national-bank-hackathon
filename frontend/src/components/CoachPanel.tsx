import { useState } from 'react';
import { getCoaching } from '../api/client';
import type { CoachResult } from '../types';

interface Props { sessionId: string; }

export default function CoachPanel({ sessionId }: Props) {
  const [result, setResult] = useState<CoachResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('');

  const generate = async () => {
    setLoading(true); setError('');
    try {
      setResult(await getCoaching(sessionId, provider || undefined));
    } catch (e: any) { setError(e?.response?.data?.detail || 'Failed to generate coaching'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-5">
        <p className="data-label mb-1">AI Trading Coach</p>
        <p className="text-[12px] text-[#3a4258] mb-5">
          Generate personalized coaching grounded in your actual metrics — not generic advice.
        </p>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="bg-white/[0.02] border border-white/[0.05] text-[#8a90a0] rounded-lg px-3 py-2 text-[12px] focus:outline-none focus:border-blue-500/30 transition-colors appearance-none cursor-pointer"
          >
            <option value="">Default Provider</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="gemini">Google Gemini</option>
          </select>

          <button onClick={generate} disabled={loading} className="btn-primary"
            style={!loading ? { background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' } : {}}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Generating…
              </span>
            ) : result ? 'Regenerate' : 'Generate Coaching'}
          </button>
        </div>
        {error && <p className="mt-2.5 text-[11px] text-red-400">{error}</p>}
      </div>

      {/* Output */}
      {result && (
        <div className="space-y-3">
          {/* Provider tag */}
          <div className="flex items-center">
            <span className={`badge ${
              result.provider === 'fallback'
                ? 'bg-amber-400/8 text-amber-400 border border-amber-400/10'
                : 'bg-white/[0.03] text-[#5a6174] border border-white/[0.04]'
            }`}>
              {result.provider === 'fallback'
                ? 'Template-based (no API key)'
                : `${{ openai: 'GPT-4o', anthropic: 'Claude', gemini: 'Gemini 2.0' }[result.provider] || result.provider}`}
            </span>
          </div>

          {/* Feedback */}
          <Section icon={<SparkleIcon />} color="#7c3aed" title="Psychological Analysis">
            <div className="text-[12px] text-[#8a90a0] leading-[1.75] whitespace-pre-line">{result.feedback}</div>
          </Section>

          {/* Plan */}
          {result.discipline_plan.length > 0 && (
            <Section icon={<ListIcon />} color="#3b82f6" title="Discipline Plan">
              <ol className="space-y-2.5">
                {result.discipline_plan.map((step, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="flex-shrink-0 w-[18px] h-[18px] rounded bg-blue-500/8 text-blue-400 flex items-center justify-center text-[9px] font-bold mt-px">{i + 1}</span>
                    <span className="text-[12px] text-[#8a90a0] leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}

          {/* Checklist + Prompts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {result.daily_checklist.length > 0 && (
              <Section icon={<CheckIcon />} color="#34d399" title="Daily Checklist">
                <ul className="space-y-2">
                  {result.daily_checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="flex-shrink-0 w-3.5 h-3.5 rounded border border-white/[0.06] mt-0.5" />
                      <span className="text-[12px] text-[#8a90a0] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {result.journaling_prompts.length > 0 && (
              <Section icon={<PenIcon />} color="#fbbf24" title="Journaling Prompts">
                <ul className="space-y-2.5">
                  {result.journaling_prompts.map((p, i) => (
                    <li key={i} className="text-[12px] text-[#8a90a0] leading-relaxed italic pl-3 border-l border-violet-500/20">{p}</li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────── */

function Section({ icon, color, title, children }: { icon: React.ReactNode; color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3.5">
        <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: `${color}0a` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <h4 className="text-[12px] font-semibold text-[#c9cdd5]">{title}</h4>
      </div>
      {children}
    </div>
  );
}

const SparkleIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>;
const ListIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;
const CheckIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PenIcon = () => <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>;
