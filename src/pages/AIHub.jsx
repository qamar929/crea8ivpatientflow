import { useEffect, useState } from 'react';
import { Activity, Bot, Brain, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { fetchApi } from '../config/api';
import Badge from '../components/ui/Badge';

const providerLabels = { chatgpt: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' };

export default function AIHub() {
  const [overview, setOverview] = useState({ providers: [], metrics: {}, capabilities: [] });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchApi('/ai/overview');
    setOverview(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="flex justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading AI hub...</div>;
  const features = overview.features || {};
  const tokenLimit = Number(features.monthlyAiTokenLimit || 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">AI Communication Hub</h1>
        <p className="mt-1 text-sm text-gray-500">Platform-managed AI for auto replies, lead qualification, treatment FAQs, and message generation.</p>
      </div>

      <div className={`rounded-xl border p-4 text-sm ${features.aiEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        <b>{features.aiEnabled ? 'AI package enabled' : 'AI package disabled'}</b>
        <p className="mt-1 text-xs">
          {features.aiEnabled
            ? `Monthly token limit: ${tokenLimit > 0 ? tokenLimit.toLocaleString() : 'Unlimited'} · Auto replies: ${features.aiAutoReplyEnabled ? 'enabled' : 'off'} · Human approval: ${features.aiHumanApprovalRequired ? 'required' : 'not required'}`
            : 'Ask the platform superadmin to enable AI for this clinic package.'}
        </p>
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
          return (
            <div key={provider.provider} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div><Brain className="h-6 w-6 text-teal-700" /><h3 className="mt-3 font-black">{providerLabels[provider.provider]}</h3><p className="mt-1 text-xs text-gray-500">Managed by platform superadmin</p></div>
                <Badge label={provider.health} variant={provider.health === 'ready' ? 'active' : provider.health === 'disabled' ? 'inactive' : 'pending'} />
              </div>
              <div className="mt-4 space-y-2 rounded-xl bg-gray-50 p-3 text-xs dark:bg-white/5">
                <p className="flex justify-between gap-3"><span className="text-gray-500">Model</span><b>{provider.model || 'Not set'}</b></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">Provider enabled</span><b>{provider.enabled ? 'Yes' : 'No'}</b></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">API key</span><b>{provider.hasApiKey ? 'Stored securely' : 'Missing'}</b></p>
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
