import { useEffect, useState } from 'react';
import { Loader2, Bot, Palette, Save, Check, Globe, KeyRound } from 'lucide-react';
import { fetchApi } from '../../config/api';
import ColorPicker from '../../components/ui/ColorPicker';

const field = 'w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/5 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-gray-900 dark:text-gray-100';
const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1';

const AI_LABELS = { chatgpt: 'ChatGPT (OpenAI)', gemini: 'Google Gemini', claude: 'Anthropic Claude' };

export default function AdminPlatform() {
  const [data, setData] = useState(null);
  const [branding, setBranding] = useState(null);
  const [ai, setAi] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = () => fetchApi('/admin/platform').then((res) => {
    setData(res);
    setBranding(res.branding);
    setAi((res.aiProviders || []).map((p) => ({ ...p, apiKey: '' })));
  }).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const setB = (k, v) => setBranding((b) => ({ ...b, [k]: v }));
  const setProvider = (provider, k, v) => setAi((list) => list.map((p) => p.provider === provider ? { ...p, [k]: v } : p));

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetchApi('/admin/platform', { method: 'PUT', body: JSON.stringify({ branding, aiProviders: ai }) });
      setData(res);
      setBranding(res.branding);
      setAi((res.aiProviders || []).map((p) => ({ ...p, apiKey: '' })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  if (!data || !branding) {
    return <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading platform settings…</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-950 dark:text-white">Platform Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Shared AI for all clinics + the public marketing-site branding.</p>
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save changes'}
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {/* Shared AI */}
      <section className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] p-5">
        <div className="flex items-center gap-2 mb-1"><Bot className="w-4 h-4 text-indigo-500" /><h2 className="text-sm font-black text-gray-900 dark:text-white">Shared AI (all clinics)</h2></div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">One key powers AI features for every clinic. Enter it once here — clinics don't need their own.</p>
        <div className="space-y-3">
          {ai.map((p) => (
            <div key={p.provider} className="rounded-xl border border-gray-100 dark:border-white/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{AI_LABELS[p.provider] || p.provider}</span>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  <input type="checkbox" checked={!!p.enabled} onChange={(e) => setProvider(p.provider, 'enabled', e.target.checked)} />
                  Enabled
                  <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-bold ${p.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : p.status === 'missing_key' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={labelCls}>Model</label>
                  <input className={field} value={p.model || ''} onChange={(e) => setProvider(p.provider, 'model', e.target.value)} placeholder="e.g. gpt-4o-mini" />
                </div>
                <div>
                  <label className={labelCls}><KeyRound className="inline w-3 h-3 mr-1" />API key {p.hasApiKey && <span className="text-emerald-600">• set</span>}</label>
                  <input className={field} type="password" value={p.apiKey} onChange={(e) => setProvider(p.provider, 'apiKey', e.target.value)} placeholder={p.hasApiKey ? 'Leave blank to keep current' : 'Paste API key'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Marketing branding */}
      <section className="rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] p-5">
        <div className="flex items-center gap-2 mb-1"><Palette className="w-4 h-4 text-indigo-500" /><h2 className="text-sm font-black text-gray-900 dark:text-white">Marketing website branding</h2></div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1"><Globe className="w-3 h-3" /> Applied live to the PatientFlow public website.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={labelCls}>Brand name</label><input className={field} value={branding.brandName} onChange={(e) => setB('brandName', e.target.value)} /></div>
          <div><label className={labelCls}>Tagline</label><input className={field} value={branding.tagline} onChange={(e) => setB('tagline', e.target.value)} /></div>
          <div><label className={labelCls}>Logo initials</label><input className={field} value={branding.logoText} onChange={(e) => setB('logoText', e.target.value)} maxLength={4} /></div>
          <div><label className={labelCls}>Logo image URL (optional)</label><input className={field} value={branding.logoUrl} onChange={(e) => setB('logoUrl', e.target.value)} placeholder="https://…" /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Hero title</label><input className={field} value={branding.heroTitle} onChange={(e) => setB('heroTitle', e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={labelCls}>Hero subtitle</label><input className={field} value={branding.heroSubtitle} onChange={(e) => setB('heroSubtitle', e.target.value)} /></div>
          <div><label className={labelCls}>Support email</label><input className={field} value={branding.supportEmail} onChange={(e) => setB('supportEmail', e.target.value)} /></div>
          <div><label className={labelCls}>Support phone</label><input className={field} value={branding.supportPhone} onChange={(e) => setB('supportPhone', e.target.value)} /></div>
          <div><label className={labelCls}>WhatsApp</label><input className={field} value={branding.whatsapp} onChange={(e) => setB('whatsapp', e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <ColorPicker label="Primary color" value={branding.primaryColor} onChange={(v) => setB('primaryColor', v)} />
          <ColorPicker label="Accent color" value={branding.secondaryColor} onChange={(v) => setB('secondaryColor', v)} />
        </div>
      </section>
    </div>
  );
}
