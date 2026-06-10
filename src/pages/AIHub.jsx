import { useEffect, useState } from 'react';
import { Activity, Bot, Brain, KeyRound, Loader2, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { fetchApi } from '../config/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const providerLabels = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' };

export default function AIHub() {
  const [overview, setOverview] = useState({ providers: [], metrics: {}, capabilities: [] });
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchApi('/ai/overview');
    setOverview(data);
    setDrafts(Object.fromEntries((data.providers || []).map(p => [p.provider, { ...p, apiKey: '' }])));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setProvider = (provider, patch) => setDrafts(current => ({ ...current, [provider]: { ...current[provider], ...patch } }));
  const save = async (provider) => {
    await fetchApi(`/ai/providers/${provider}`, { method: 'PUT', body: JSON.stringify(drafts[provider]) });
    await load();
  };

  if (loading) return <div className="flex justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading AI hub...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Communication Hub</h1>
        <p className="mt-1 text-sm text-gray-500">Configure ChatGPT, Gemini and Claude for auto replies, lead qualification, treatment FAQs, and message generation.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Enabled Providers', overview.metrics.enabledProviders || 0, Bot],
          ['Ready Providers', overview.metrics.readyProviders || 0, ShieldCheck],
          ['Token Usage', overview.metrics.tokenUsage || 0, Activity],
          ['Failover Ready', overview.metrics.failoverReady ? 'Yes' : 'No', Sparkles],
        ].map(([label, value, Icon]) => <div key={label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900"><Icon className="h-5 w-5 text-teal-700" /><p className="mt-4 text-2xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-gray-500">{label}</p></div>)}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {overview.providers.map(provider => {
          const draft = drafts[provider.provider] || provider;
          return (
            <div key={provider.provider} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div><Brain className="h-6 w-6 text-teal-700" /><h3 className="mt-3 font-black">{providerLabels[provider.provider]}</h3><p className="mt-1 text-xs text-gray-500">Model, API key and health controls</p></div>
                <Badge label={provider.health} variant={provider.health === 'ready' ? 'active' : provider.health === 'disabled' ? 'inactive' : 'pending'} />
              </div>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-xs font-bold dark:border-white/10"><input type="checkbox" checked={!!draft.enabled} onChange={e => setProvider(provider.provider, { enabled: e.target.checked })} /> Enable provider</label>
                <input className="premium-input w-full rounded-lg px-3 py-2 text-sm" placeholder="Model" value={draft.model || ''} onChange={e => setProvider(provider.provider, { model: e.target.value })} />
                <div className="relative"><KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input type="password" className="premium-input w-full rounded-lg py-2 pl-9 pr-3 text-sm" placeholder={provider.hasApiKey ? 'API key saved - enter to replace' : 'API key'} value={draft.apiKey || ''} onChange={e => setProvider(provider.provider, { apiKey: e.target.value })} /></div>
                <input type="number" className="premium-input w-full rounded-lg px-3 py-2 text-sm" placeholder="Monthly token limit" value={draft.monthlyTokenLimit || 0} onChange={e => setProvider(provider.provider, { monthlyTokenLimit: Number(e.target.value) })} />
                <Button className="w-full justify-center" onClick={() => save(provider.provider)}><Save className="h-4 w-4" /> Save {providerLabels[provider.provider]}</Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
        <h3 className="font-black">AI Capabilities</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {overview.capabilities.map(item => <div key={item} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">{item}</div>)}
        </div>
      </div>
    </div>
  );
}
