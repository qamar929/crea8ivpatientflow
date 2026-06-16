import { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, Bot, CheckCircle2, ChevronRight, CircleDollarSign, Clock3,
  FileText, Languages, Library, LockKeyhole, MessageCircle, Play, Plus, RefreshCw, Search,
  Send, Settings2, ShieldCheck, Sparkles, Target, TestTube2, Users, Wifi, Loader2,
} from 'lucide-react';
import { fetchApi } from '../config/api';
import { useSearchParams } from 'react-router-dom';

const tabs = [
  ['connectivity', 'Connectivity', Wifi], ['inbox', 'Patient Inbox', MessageCircle], ['campaigns', 'Campaigns', Target],
  ['journeys', 'Journeys', Bot], ['segments', 'Segments', Users],
  ['templates', 'Templates', FileText], ['media', 'Media Library', Library], ['analytics', 'Analytics', BarChart3],
  ['settings', 'Number Settings', Settings2],
];
const purposes = ['support', 'appointment', 'clinical', 'billing', 'marketing'];
const quickMessages = {
  confirmation: 'Assalam-o-Alaikum. Your appointment is confirmed. Reply if you need any assistance.',
  appointment: 'Assalam-o-Alaikum. This is a friendly reminder about your upcoming appointment. Please reply to confirm or request a reschedule.',
  reminder_2h: 'Assalam-o-Alaikum. Your appointment is in 2 hours. We look forward to seeing you.',
  billing: 'Assalam-o-Alaikum. This is a gentle payment reminder. Please let us know if you need an invoice or billing support.',
  clinical: 'Assalam-o-Alaikum. We hope you are comfortable after your treatment. Please reply if you have any concerns or need aftercare guidance.',
  review: 'Thank you for visiting us. Your feedback matters. May we send you our review link?',
  recommendation: 'Assalam-o-Alaikum. Based on your previous visit, our care team has a personalized treatment recommendation for you. May we share the details?',
};

function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function Card({ children, className = '' }) { return <div className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 ${className}`}>{children}</div>; }
function Pill({ children, tone = 'emerald' }) { const colors = { emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', blue: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', slate: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300' }; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${colors[tone]}`}>{children}</span>; }
function Button({ children, className = '', ...props }) { return <button className={`inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50 ${className}`} {...props}>{children}</button>; }
function Input(props) { return <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-500 dark:border-white/10 dark:bg-slate-950 dark:text-white" {...props} />; }
function Select(props) { return <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none dark:border-white/10 dark:bg-slate-950 dark:text-white" {...props} />; }

export default function WhatsAppCenter() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('client') ? 'inbox' : 'connectivity');
  const [dashboard, setDashboard] = useState({ metrics: {}, settings: {} });
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [profile, setProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState({});
  const [templates, setTemplates] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [segments, setSegments] = useState([]);
  const [health, setHealth] = useState({ connection: {} });
  const [diagnostics, setDiagnostics] = useState({ webhooks: [], queue: [] });
  const [media, setMedia] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [composer, setComposer] = useState({ body: '', messageType: 'text', mediaUrl: '', purpose: 'support' });
  const [campaign, setCampaign] = useState({ name: '', segment: 'all', templateId: '', mediaType: 'text', mediaUrl: '', offerCode: '', status: 'draft' });
  const [template, setTemplate] = useState({ name: '', category: 'UTILITY', purpose: 'appointment', body: '' });
  const [journey, setJourney] = useState({ name: '', triggerType: 'appointment_booked', triggerValue: 'immediate', templateId: '', purpose: 'appointment', isActive: true });
  const [settings, setSettings] = useState({ phoneNumberId: '', businessAccountId: '', accessToken: '', webhookVerifyToken: '', apiVersion: 'v23.0', simulationMode: true });
  const [testPhone, setTestPhone] = useState('');
  const features = dashboard.features || {};

  const refresh = async () => {
    const [dash, people, tmpls, flows, promos, groups, healthData, diag, library, branchList] = await Promise.all([
      fetchApi('/whatsapp/dashboard'), fetchApi('/whatsapp/contacts'), fetchApi('/whatsapp/templates'),
      fetchApi('/whatsapp/automations'), fetchApi('/whatsapp/campaigns'), fetchApi('/whatsapp/segments'),
      fetchApi('/whatsapp/health'), fetchApi('/whatsapp/diagnostics'), fetchApi('/whatsapp/media'), fetchApi('/whatsapp/branches'),
    ]);
    setDashboard(dash); setContacts(people); setTemplates(tmpls); setAutomations(flows); setCampaigns(promos); setSegments(groups);
    setHealth(healthData); setDiagnostics(diag); setMedia(library); setBranches(branchList);
    setSettings(s => ({ ...s, ...dash.settings, accessToken: '' }));
    const requested = searchParams.get('client');
    if (!selected && people[0]) setSelected(people.find(p => p.id === requested) || people[0]);
  };
  useEffect(() => { refresh().catch(e => setNotice(e.message)); }, []);
  useEffect(() => {
    if (!selected) return;
    Promise.all([fetchApi(`/whatsapp/contacts/${selected.id}`), fetchApi(`/whatsapp/conversations/${selected.id}`)])
      .then(([p, result]) => { setProfile(p); setConversation(result.conversation); setMessages(result.messages); }).catch(e => setNotice(e.message));
  }, [selected?.id]);
  const visibleContacts = useMemo(() => contacts.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())), [contacts, search]);

  const sendMessage = async () => {
    if (!selected || (!composer.body && !composer.mediaUrl)) return;
    await fetchApi(`/whatsapp/conversations/${selected.id}/messages`, { method: 'POST', body: JSON.stringify(composer) });
    setComposer({ ...composer, body: '', mediaUrl: '' });
    const data = await fetchApi(`/whatsapp/conversations/${selected.id}`); setConversation(data.conversation); setMessages(data.messages); setNotice('Message queued successfully.');
  };
  const [suggesting, setSuggesting] = useState(false);
  const suggestReply = async () => {
    if (!selected) return;
    setSuggesting(true); setNotice('');
    try {
      const res = await fetchApi(`/whatsapp/conversations/${selected.id}/ai-suggest`, { method: 'POST', body: '{}' });
      setComposer(c => ({ ...c, body: res.suggestion || '' }));
      setNotice('AI drafted a reply — review and edit before sending.');
    } catch (e) {
      setNotice(e.message);
    } finally { setSuggesting(false); }
  };
  const toggleAutomation = async flow => {
    await fetchApi(`/whatsapp/automations/${flow.id}/toggle`, { method: 'PUT', body: JSON.stringify({ isActive: !Number(flow.isActive) }) });
    setAutomations(await fetchApi('/whatsapp/automations'));
  };
  const createCampaign = async () => {
    if (!campaign.name || !campaign.templateId) return setNotice('Campaign name and approved template are required.');
    await fetchApi('/whatsapp/campaigns', { method: 'POST', body: JSON.stringify(campaign) });
    setCampaigns(await fetchApi('/whatsapp/campaigns')); setNotice('Campaign draft created.');
  };
  const launchCampaign = async id => {
    const result = await fetchApi(`/whatsapp/campaigns/${id}/launch`, { method: 'POST', body: '{}' });
    setCampaigns(await fetchApi('/whatsapp/campaigns')); setNotice(`${result.sentCount} patient messages queued.`);
  };
  const createTemplate = async () => {
    if (!template.name || !template.body) return;
    await fetchApi('/whatsapp/templates', { method: 'POST', body: JSON.stringify(template) });
    setTemplates(await fetchApi('/whatsapp/templates')); setTemplate({ name: '', category: 'UTILITY', purpose: 'appointment', body: '' }); setNotice('Template draft added.');
  };
  const createJourney = async () => {
    if (!journey.name || !journey.templateId) return setNotice('Journey name and template are required.');
    await fetchApi('/whatsapp/automations', { method: 'POST', body: JSON.stringify(journey) });
    setAutomations(await fetchApi('/whatsapp/automations')); setJourney({ ...journey, name: '', templateId: '' }); setNotice('Patient journey created.');
  };
  const runJourneyCycle = async () => {
    const result = await fetchApi('/whatsapp/automations/run', { method: 'POST', body: '{}' });
    setNotice(`${result.sentCount} automated patient messages queued.`);
  };
  const saveSettings = async () => {
    const result = await fetchApi('/whatsapp/settings', { method: 'PUT', body: JSON.stringify(settings) });
    setSettings(s => ({ ...s, accessToken: '', hasAccessToken: result.hasAccessToken })); setNotice(result.message || 'WhatsApp number settings saved.');
  };
  const testMessage = async () => {
    try { const result = await fetchApi('/whatsapp/test-message', { method: 'POST', body: JSON.stringify({ phone: testPhone }) }); setNotice(result.message); await refresh(); }
    catch (e) { setNotice(e.message); }
  };
  const syncTemplates = async () => {
    try { const result = await fetchApi('/whatsapp/templates/sync', { method: 'POST', body: '{}' }); setNotice(result.message); await refresh(); }
    catch (e) { setNotice(e.message); }
  };
  const retryQueue = async () => {
    const result = await fetchApi('/whatsapp/queue/retry', { method: 'POST', body: '{}' }); setNotice(result.message); await refresh();
  };
  const saveConversation = async values => {
    await fetchApi(`/whatsapp/conversations/${selected.id}`, { method: 'PUT', body: JSON.stringify(values) }); setNotice('Conversation preferences saved.'); const data = await fetchApi(`/whatsapp/conversations/${selected.id}`); setConversation(data.conversation); setMessages(data.messages);
  };
  const saveConsent = async marketingOptIn => {
    await fetchApi(`/whatsapp/contacts/${selected.id}/consent`, { method: 'PUT', body: JSON.stringify({ marketingOptIn }) }); setNotice(marketingOptIn ? 'Marketing consent recorded.' : 'Patient opted out of marketing.'); setProfile(await fetchApi(`/whatsapp/contacts/${selected.id}`));
  };
  const saveBranch = async (id, values) => {
    await fetchApi(`/whatsapp/branches/${id}`, { method: 'PUT', body: JSON.stringify(values) }); setNotice('Branch WhatsApp routing updated.'); setBranches(await fetchApi('/whatsapp/branches'));
  };

  return (
    <div className="space-y-5 pb-10 text-slate-800 dark:text-slate-100">
      <section className="overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#052e2b,#0f766e_60%,#115e59)] p-6 text-white shadow-xl">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-200"><Sparkles className="h-4 w-4" /> Patient Engagement Suite</div>
            <h2 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">WhatsApp Communication Center</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/80">A calm daily workspace for patient support, clinical follow-ups, retention journeys and approved healthcare campaigns.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="emerald">Official Cloud API</Pill>
            <Pill tone={dashboard.settings?.simulationMode ? 'amber' : 'blue'}>{dashboard.settings?.simulationMode ? 'Simulation mode' : 'Live messaging'}</Pill>
            <Pill tone="slate">Multi-branch ready</Pill>
          </div>
        </div>
      </section>

      {notice && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"><span>{notice}</span><button onClick={() => setNotice('')}>Close</button></div>}
      {!features.whatsappEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          WhatsApp is not enabled for this clinic package yet. Ask the platform superadmin to enable connectivity, marketing and automation limits.
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition ${tab === id ? 'bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-500 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300'}`}><Icon className="h-4 w-4" />{label}</button>)}
      </div>

      {tab === 'connectivity' && <Connectivity features={features} settings={settings} setSettings={setSettings} saveSettings={saveSettings} health={health} diagnostics={diagnostics} testPhone={testPhone} setTestPhone={setTestPhone} testMessage={testMessage} retryQueue={retryQueue} syncTemplates={syncTemplates} />}
      {tab === 'inbox' && <Inbox features={features} contacts={visibleContacts} selected={selected} setSelected={setSelected} search={search} setSearch={setSearch} profile={profile} conversation={conversation} messages={messages} composer={composer} setComposer={setComposer} sendMessage={sendMessage} suggestReply={suggestReply} suggesting={suggesting} saveConversation={saveConversation} saveConsent={saveConsent} />}
      {tab === 'campaigns' && <Campaigns features={features} campaigns={campaigns} campaign={campaign} setCampaign={setCampaign} segments={segments} templates={templates} createCampaign={createCampaign} launchCampaign={launchCampaign} />}
      {tab === 'journeys' && <Journeys features={features} automations={automations} toggleAutomation={toggleAutomation} templates={templates} journey={journey} setJourney={setJourney} createJourney={createJourney} runJourneyCycle={runJourneyCycle} />}
      {tab === 'segments' && <Segments segments={segments} />}
      {tab === 'templates' && <Templates features={features} templates={templates} template={template} setTemplate={setTemplate} createTemplate={createTemplate} syncTemplates={syncTemplates} />}
      {tab === 'media' && <MediaLibrary media={media} />}
      {tab === 'analytics' && <Analytics metrics={dashboard.metrics || {}} campaigns={campaigns} />}
      {tab === 'settings' && <ApiSettings features={features} settings={settings} setSettings={setSettings} saveSettings={saveSettings} branches={branches} saveBranch={saveBranch} />}
    </div>
  );
}

function Connectivity({ features, settings, setSettings, saveSettings, health, diagnostics, testPhone, setTestPhone, testMessage, retryQueue, syncTemplates }) {
  const steps = [
    ['Connect Meta Account', settings.hasAccessToken], ['Add Phone Number ID', settings.phoneNumberId],
    ['Verify Webhook', health.lastWebhookAt], ['Send Test Message', false], ['Go Live', !Number(settings.simulationMode)],
  ];
  return <div className="space-y-4">
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card className="p-5"><p className="text-xs font-black uppercase tracking-widest text-emerald-600">Guided setup wizard</p><h3 className="mt-2 text-xl font-black">Connect clinic WhatsApp number</h3><p className="mt-2 text-xs leading-5 text-slate-500">API app, access token and webhook secrets are platform-managed by the superadmin. Clinic teams only maintain their assigned WhatsApp Business number IDs here.</p><div className="mt-5 grid gap-2 md:grid-cols-5">{steps.map(([label, done], i) => <div key={label} className={`rounded-xl border p-3 ${done ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-white/10'}`}><p className="text-[10px] font-black text-slate-400">STEP {i + 1}</p><p className="mt-2 text-xs font-bold">{label}</p><p className={`mt-2 text-[10px] font-bold ${done ? 'text-emerald-600' : 'text-slate-400'}`}>{done ? 'Complete' : 'Pending'}</p></div>)}</div><div className="mt-5 grid gap-3 md:grid-cols-2"><Input placeholder="Phone Number ID" value={settings.phoneNumberId || ''} onChange={e => setSettings({ ...settings, phoneNumberId: e.target.value })} /><Input placeholder="WhatsApp Business Account ID" value={settings.businessAccountId || ''} onChange={e => setSettings({ ...settings, businessAccountId: e.target.value })} /></div><div className="mt-4 flex flex-wrap gap-2"><Button disabled={!features.whatsappEnabled} onClick={saveSettings}><LockKeyhole className="h-4 w-4" /> Save number</Button><Button disabled={!features.whatsappEnabled} onClick={syncTemplates} className="bg-slate-900 hover:bg-slate-800"><RefreshCw className="h-4 w-4" /> Sync Meta templates</Button></div></Card>
      <Card className="p-5"><div className="flex items-center justify-between"><Wifi className="h-6 w-6 text-emerald-600" /><Pill tone={health.connection?.status === 'connected' ? 'emerald' : health.connection?.status === 'simulation' ? 'amber' : 'slate'}>{health.connection?.status || 'checking'}</Pill></div><h3 className="mt-4 font-black">Connection Health</h3><p className="mt-2 text-xs leading-5 text-slate-500">{health.connection?.message}</p><div className="mt-4 space-y-2 text-xs"><p className="flex justify-between"><span className="text-slate-400">Last webhook</span><b>{health.lastWebhookAt || 'Not received yet'}</b></p><p className="flex justify-between"><span className="text-slate-400">Retry queue</span><b>{health.pendingQueue || 0}</b></p><p className="flex justify-between"><span className="text-slate-400">Webhook errors</span><b>{health.failedWebhooks || 0}</b></p></div></Card>
    </div>
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]"><Card className="p-5"><h3 className="font-black">One-click test message</h3><p className="mt-1 text-xs text-slate-500">Send an approved confirmation template to your own WhatsApp number.</p><div className="mt-4 flex gap-2"><Input placeholder="+92 300 0000000" value={testPhone} onChange={e => setTestPhone(e.target.value)} /><Button disabled={!features.whatsappEnabled} onClick={testMessage}><TestTube2 className="h-4 w-4" /> Send test</Button></div></Card><Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-black">Webhook diagnostics</h3><Button disabled={!features.whatsappEnabled} onClick={retryQueue} className="bg-slate-900 hover:bg-slate-800"><RefreshCw className="h-4 w-4" /> Retry queue</Button></div><div className="mt-3 space-y-2 text-xs text-slate-500">{diagnostics.queue?.length ? diagnostics.queue.slice(0, 3).map(item => <p key={item.id} className="rounded-lg bg-amber-50 p-2 text-amber-700"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> {item.lastError}</p>) : <p className="rounded-lg bg-emerald-50 p-2 text-emerald-700">No failed messages waiting for retry.</p>}</div></Card></div>
  </div>;
}

function Inbox({ features, contacts, selected, setSelected, search, setSearch, profile, conversation, messages, composer, setComposer, sendMessage, suggestReply, suggesting, saveConversation, saveConsent }) {
  const freeReply = conversation?.freeReplyUntil && new Date(conversation.freeReplyUntil) > new Date();
  return <div className="grid min-h-[680px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900 lg:grid-cols-[260px_1fr_285px]">
    <aside className="border-b border-slate-200 dark:border-white/10 lg:border-b-0 lg:border-r">
      <div className="p-4"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..." style={{ paddingLeft: 36 }} /></div></div>
      <div className="max-h-[250px] overflow-auto lg:max-h-[610px]">{contacts.map(c => <button key={c.id} onClick={() => setSelected(c)} className={`w-full border-t border-slate-100 p-3 text-left transition dark:border-white/5 ${selected?.id === c.id ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}><div className="flex justify-between gap-2"><span className="text-sm font-bold">{c.name}</span><span className="text-[10px] text-slate-400">{c.appointmentCount} visits</span></div><p className="mt-1 truncate text-xs text-slate-500">{c.lastMessage || c.phone || 'No conversation yet'}</p></button>)}</div>
    </aside>
    <main className="flex min-h-[560px] flex-col">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-white/10"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-black">{selected?.name || 'Select a patient'}</p><p className="text-xs text-slate-500">Patient support and care coordination</p></div><Pill tone={freeReply ? 'emerald' : 'amber'}>{freeReply ? 'Free reply window open' : 'Approved template required'}</Pill></div></div>
      <div className="flex-1 space-y-3 overflow-auto bg-slate-50/70 p-4 dark:bg-slate-950/40">{messages.length ? messages.map(m => <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-3 py-2.5 text-xs leading-5 ${m.direction === 'outbound' ? 'rounded-br-sm bg-emerald-600 text-white' : 'rounded-bl-sm bg-white shadow dark:bg-slate-800'}`}><p>{m.body}</p><span className="mt-1 block text-[9px] opacity-70">{m.purpose} · {m.deliveryStatus}</span></div></div>) : <div className="grid h-full place-items-center text-center text-sm text-slate-400">Start a helpful, privacy-conscious patient conversation.</div>}</div>
      <div className="border-t border-slate-200 p-3 dark:border-white/10">
        <div className="mb-2 flex flex-wrap gap-1.5">{Object.entries(quickMessages).map(([key, text]) => <button key={key} onClick={() => setComposer({ ...composer, body: text, purpose: key === 'recommendation' ? 'clinical' : key })} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold capitalize text-slate-600 dark:bg-white/10 dark:text-slate-300">{key}</button>)}</div>
        <div className="grid gap-2 md:grid-cols-[110px_110px_1fr_auto]"><Select value={composer.purpose} onChange={e => setComposer({ ...composer, purpose: e.target.value })}>{purposes.map(p => <option key={p}>{p}</option>)}</Select><Select value={composer.messageType} onChange={e => setComposer({ ...composer, messageType: e.target.value })}><option>text</option><option>image</option><option>video</option><option value="document">PDF / document</option></Select><Input value={composer.body} onChange={e => setComposer({ ...composer, body: e.target.value })} placeholder="Write a patient-friendly message..." /><div className="flex gap-2"><Button variant="secondary" disabled={!features.whatsappEnabled || suggesting} onClick={suggestReply} title="Draft a reply with AI (you review before sending)">{suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Suggest</Button><Button disabled={!features.whatsappEnabled} onClick={sendMessage}><Send className="h-4 w-4" /> Send</Button></div></div>
        {composer.messageType !== 'text' && <div className="mt-2"><Input value={composer.mediaUrl} onChange={e => setComposer({ ...composer, mediaUrl: e.target.value })} placeholder="Secure media URL for image, video, PDF, invoice, prescription or consent form" /></div>}
      </div>
    </main>
    <aside className="border-t border-slate-200 p-4 dark:border-white/10 lg:border-l lg:border-t-0"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Patient Profile</p><h3 className="mt-3 text-lg font-black">{profile?.client?.name || 'Patient context'}</h3><p className="text-xs text-slate-500">{profile?.client?.phone}</p><div className="mt-4 grid grid-cols-2 gap-2"><Mini label="Lifetime value" value={money(profile?.client?.totalSpent)} /><Mini label="Balance" value={money(profile?.client?.outstandingBalance)} /><Mini label="Loyalty" value={profile?.client?.loyaltyTier || '-'} /><Mini label="Visits" value={profile?.appointments?.length || 0} /></div><ConversationControls conversation={conversation} profile={profile} saveConversation={saveConversation} saveConsent={saveConsent} /><p className="mt-5 text-xs font-black uppercase tracking-widest text-slate-400">Unified Timeline</p><div className="mt-2 space-y-2">{profile?.appointments?.slice(0, 4).map(a => <div key={a.id} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5"><p className="font-bold">{a.serviceName || 'Clinic appointment'}</p><p className="mt-1 text-slate-500">{a.date} · {a.staffName || 'Care team'}</p></div>)}</div></aside>
  </div>;
}
function ConversationControls({ conversation, profile, saveConversation, saveConsent }) { const [form,setForm]=useState({ assignedTo:'Reception',preferredLanguage:'en',internalNote:'' }); useEffect(()=>setForm({ assignedTo:conversation?.assignedTo||'Reception',preferredLanguage:conversation?.preferredLanguage||'en',internalNote:conversation?.internalNote||'' }),[conversation?.id,conversation?.assignedTo,conversation?.preferredLanguage,conversation?.internalNote]); return <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 dark:border-white/10"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Conversation controls</p><Select value={form.assignedTo} onChange={e=>setForm({...form,assignedTo:e.target.value})}><option>Reception</option><option>Doctor</option><option>Treatment Coordinator</option></Select><Select value={form.preferredLanguage} onChange={e=>setForm({...form,preferredLanguage:e.target.value})}><option value="en">English</option><option value="ur">Urdu</option></Select><textarea className="w-full rounded-xl border border-slate-200 p-2 text-xs dark:border-white/10 dark:bg-slate-950" rows="2" placeholder="Internal note" value={form.internalNote} onChange={e=>setForm({...form,internalNote:e.target.value})}/><Button onClick={()=>saveConversation(form)} className="w-full py-2">Save assignment</Button><button onClick={()=>saveConsent(!Number(profile?.client?.whatsappMarketingOptIn))} className={`w-full rounded-xl px-3 py-2 text-xs font-bold ${Number(profile?.client?.whatsappMarketingOptIn)?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{Number(profile?.client?.whatsappMarketingOptIn)?'Marketing consent: opted in':'Marketing consent: opted out'}</button></div>; }
function Mini({ label, value }) { return <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-white/5"><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 text-xs font-black">{value}</p></div>; }

function Campaigns({ features, campaigns, campaign, setCampaign, segments, templates, createCampaign, launchCampaign }) {
  const enabled = !!features.whatsappMarketingEnabled;
  return <div className="grid gap-4 xl:grid-cols-[380px_1fr]"><Card className="p-5"><p className="text-xs font-black uppercase tracking-widest text-emerald-600">One-click campaign builder</p><h3 className="mt-2 text-xl font-black">Audience → Template → Offer → Send</h3>{!enabled && <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-700">Marketing broadcasts are disabled by superadmin.</p>}<div className="mt-4 space-y-3"><Input placeholder="Campaign name" value={campaign.name} onChange={e => setCampaign({ ...campaign, name: e.target.value })} /><Select value={campaign.segment} onChange={e => setCampaign({ ...campaign, segment: e.target.value })}>{segments.map(s => <option key={s.id} value={s.id}>{s.label} ({s.count})</option>)}</Select><Select value={campaign.templateId} onChange={e => setCampaign({ ...campaign, templateId: e.target.value })}><option value="">Select approved template</option>{templates.filter(t => t.status === 'approved').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select><Select value={campaign.mediaType} onChange={e => setCampaign({ ...campaign, mediaType: e.target.value })}><option value="text">Text only</option><option value="image">Image header</option><option value="video">Video header</option><option value="document">PDF / document header</option></Select><Input placeholder="Optional media URL" value={campaign.mediaUrl} onChange={e => setCampaign({ ...campaign, mediaUrl: e.target.value })} /><Input placeholder="Offer or coupon code" value={campaign.offerCode} onChange={e => setCampaign({ ...campaign, offerCode: e.target.value })} /><Button disabled={!enabled} onClick={createCampaign} className="w-full"><Plus className="h-4 w-4" /> Create campaign draft</Button></div></Card><div className="space-y-3">{campaigns.length ? campaigns.map(c => <Card key={c.id} className="flex flex-col justify-between gap-3 p-4 md:flex-row md:items-center"><div><div className="flex items-center gap-2"><h4 className="font-black">{c.name}</h4><Pill tone={c.status === 'sent' ? 'emerald' : 'amber'}>{c.status}</Pill></div><p className="mt-1 text-xs text-slate-500">{c.segment} audience · {c.templateName || 'Template pending'} · {c.offerCode || 'No coupon'}</p></div><div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-500">{c.sentCount} sent</span>{c.status !== 'sent' && <Button disabled={!enabled} onClick={() => launchCampaign(c.id)}><Play className="h-3.5 w-3.5" /> Launch</Button>}</div></Card>) : <Empty text="Create your first retention or treatment education campaign." />}</div></div>;
}
function Journeys({ features, automations, toggleAutomation, templates, journey, setJourney, createJourney, runJourneyCycle }) { const enabled = !!features.whatsappAutomationEnabled; return <div className="space-y-4"><Card className="p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-widest text-emerald-600">Trigger → Approved Template</p><Button disabled={!enabled} onClick={runJourneyCycle} className="bg-slate-900 hover:bg-slate-800"><Play className="h-3.5 w-3.5" /> Run cycle now</Button></div>{!enabled && <p className="mb-3 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-700">Automated journeys are disabled by superadmin.</p>}<div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_100px_1fr_auto]"><Input placeholder="Journey name" value={journey.name} onChange={e => setJourney({ ...journey, name: e.target.value })} /><Select value={journey.triggerType} onChange={e => setJourney({ ...journey, triggerType: e.target.value })}><option value="appointment_booked">Appointment booked</option><option value="appointment_upcoming">Appointment upcoming</option><option value="treatment_completed">Treatment completed</option><option value="birthday">Birthday</option><option value="inactive_days">Inactive patient</option><option value="membership_renewal">Membership renewal</option></Select><Input placeholder="Timing" value={journey.triggerValue} onChange={e => setJourney({ ...journey, triggerValue: e.target.value })} /><Select value={journey.templateId} onChange={e => setJourney({ ...journey, templateId: e.target.value })}><option value="">Select template</option>{templates.filter(t => t.status === 'approved').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</Select><Button disabled={!enabled} onClick={createJourney}><Plus className="h-4 w-4" /> Add journey</Button></div></Card><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{automations.map(flow => <Card key={flow.id} className="p-4"><div className="flex justify-between gap-2"><Pill tone={Number(flow.isActive) ? 'emerald' : 'slate'}>{Number(flow.isActive) ? 'Active' : 'Paused'}</Pill><button disabled={!enabled} onClick={() => toggleAutomation(flow)} className={`h-6 w-11 rounded-full p-1 transition disabled:opacity-50 ${Number(flow.isActive) ? 'bg-emerald-500' : 'bg-slate-200'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${Number(flow.isActive) ? 'translate-x-5' : ''}`} /></button></div><h4 className="mt-4 font-black">{flow.name}</h4><div className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500"><span className="rounded-lg bg-slate-100 p-2 dark:bg-white/10">{flow.triggerType}</span><ChevronRight className="h-4 w-4" /><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-500/10">{flow.templateName || 'Template'}</span></div><p className="mt-3 text-xs text-slate-400">Timing: {flow.triggerValue || 'Immediate'} · {flow.purpose}</p></Card>)}</div></div>; }
function Segments({ segments }) { return <div><div className="mb-4"><h3 className="text-xl font-black">Patient Segmentation</h3><p className="text-sm text-slate-500">Target the right patients with relevant communication and consent-aware marketing.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{segments.map(s => <Card key={s.id} className="p-4"><Target className="h-5 w-5 text-emerald-600" /><p className="mt-5 text-2xl font-black">{s.count}</p><p className="mt-1 text-xs font-bold text-slate-500">{s.label} Patients</p></Card>)}</div></div>; }
function Templates({ features, templates, template, setTemplate, createTemplate, syncTemplates }) { return <div><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-xl font-black">Approved Message Templates</h3><p className="text-xs text-slate-500">Import approved templates directly from Meta WhatsApp Manager.</p></div><Button disabled={!features.whatsappEnabled} onClick={syncTemplates}><RefreshCw className="h-4 w-4" /> Sync from Meta</Button></div><div className="grid gap-4 xl:grid-cols-[360px_1fr]"><Card className="p-5"><h3 className="text-lg font-black">Create Template Draft</h3><p className="mt-1 text-xs leading-5 text-slate-500">Create the local draft, then approve the matching template in Meta before live use.</p>{!features.whatsappEnabled && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-700">Template sync is disabled until WhatsApp is enabled by superadmin.</p>}<div className="mt-4 space-y-3"><Input placeholder="Template name" value={template.name} onChange={e => setTemplate({ ...template, name: e.target.value })} /><Select value={template.category} onChange={e => setTemplate({ ...template, category: e.target.value })}><option>UTILITY</option><option>MARKETING</option></Select><Select value={template.purpose} onChange={e => setTemplate({ ...template, purpose: e.target.value })}>{purposes.map(p => <option key={p}>{p}</option>)}</Select><textarea className="h-28 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none dark:border-white/10 dark:bg-slate-950" placeholder="Template body with {{name}} placeholders" value={template.body} onChange={e => setTemplate({ ...template, body: e.target.value })} /><Button onClick={createTemplate} className="w-full"><Plus className="h-4 w-4" /> Add draft</Button></div></Card><div className="space-y-3">{templates.map(t => <Card key={t.id} className="p-4"><div className="flex flex-wrap items-center gap-2"><h4 className="font-black">{t.name}</h4><Pill tone={String(t.status).toLowerCase() === 'approved' ? 'emerald' : 'amber'}>{t.status}</Pill><Pill tone="blue">{t.category}</Pill></div><p className="mt-3 text-xs leading-5 text-slate-500">{t.body}</p></Card>)}</div></div></div>; }
function MediaLibrary({ media }) { return <div><h3 className="text-xl font-black">Approved Media Library</h3><p className="mt-1 text-sm text-slate-500">Reusable brochures, aftercare PDFs, offers and approved gallery assets.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{media.map(item=><Card key={item.id} className="p-4"><Library className="h-5 w-5 text-emerald-600"/><h4 className="mt-4 font-black">{item.name}</h4><p className="mt-1 text-xs capitalize text-slate-500">{item.category} · {item.mediaType}</p><a className="mt-4 block truncate text-xs font-bold text-emerald-700" href={item.url} target="_blank" rel="noreferrer">{item.url}</a></Card>)}</div></div>; }
function Analytics({ metrics, campaigns }) { const cards = [['Messages sent', metrics.sent, Send], ['Delivery rate', `${metrics.deliveryRate || 0}%`, CheckCircle2], ['Read rate', `${metrics.readRate || 0}%`, Activity], ['Response rate', `${metrics.responseRate || 0}%`, MessageCircle], ['Appointments generated', metrics.conversions || 0, Target], ['Revenue generated', money(metrics.revenue), CircleDollarSign], ['API usage cost', money(metrics.cost), BarChart3], ['Campaigns', campaigns.length, Sparkles]]; return <div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value, Icon]) => <Card key={label} className="p-4"><Icon className="h-5 w-5 text-emerald-600" /><p className="mt-5 text-2xl font-black">{value}</p><p className="mt-1 text-xs font-bold text-slate-500">{label}</p></Card>)}</div><Card className="mt-4 p-5"><h3 className="font-black">Retention intelligence</h3><p className="mt-2 text-sm leading-6 text-slate-500">Delivery, read, response, conversion, treatment booking, revenue and ROI events are structured for campaign attribution. Live webhook status events populate delivery and read performance.</p></Card></div>; }
function ApiSettings({ features, settings, setSettings, saveSettings, branches, saveBranch }) { return <div className="grid gap-4 xl:grid-cols-[1fr_360px]"><Card className="p-5"><div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-emerald-600" /><h3 className="text-lg font-black">Clinic WhatsApp number settings</h3></div><p className="mt-2 text-xs leading-5 text-slate-500">Meta app credentials and webhook secrets are managed by the platform superadmin. Clinic users only maintain the assigned phone number IDs and quiet hours.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><Input placeholder="Phone Number ID" value={settings.phoneNumberId || ''} onChange={e => setSettings({ ...settings, phoneNumberId: e.target.value })} /><Input placeholder="WhatsApp Business Account ID" value={settings.businessAccountId || ''} onChange={e => setSettings({ ...settings, businessAccountId: e.target.value })} /><Input placeholder="Graph API version" value={settings.apiVersion || ''} onChange={e => setSettings({ ...settings, apiVersion: e.target.value })} /><label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold dark:border-white/10"><input type="checkbox" checked={Boolean(Number(settings.simulationMode))} onChange={e => setSettings({ ...settings, simulationMode: e.target.checked })} /> Simulation mode</label><Input type="time" value={settings.quietHoursStart || '21:00'} onChange={e => setSettings({ ...settings, quietHoursStart: e.target.value })} /><Input type="time" value={settings.quietHoursEnd || '09:00'} onChange={e => setSettings({ ...settings, quietHoursEnd: e.target.value })} /></div><Button disabled={!features.whatsappEnabled} onClick={saveSettings} className="mt-4"><LockKeyhole className="h-4 w-4" /> Save number settings</Button><BranchRouting branches={branches} saveBranch={saveBranch} /></Card><Card className="p-5"><ShieldCheck className="h-7 w-7 text-emerald-600" /><h3 className="mt-4 font-black">Healthcare communication controls</h3><div className="mt-4 space-y-3 text-xs leading-5 text-slate-500"><p>Support, appointment, clinical, billing and marketing messages stay classified separately.</p><p>Marketing consent is tracked per patient. Incoming STOP automatically opts the patient out.</p><p>Quiet hours, secure document links and approved templates protect the daily workflow.</p></div></Card></div>; }
function BranchRouting({ branches, saveBranch }) { const [drafts,setDrafts]=useState({}); useEffect(()=>setDrafts(Object.fromEntries(branches.map(b=>[b.id,{whatsappNumber:b.whatsappNumber||'',whatsappPhoneNumberId:b.whatsappPhoneNumberId||''}]))),[branches]); return <div className="mt-5"><p className="text-xs font-black uppercase tracking-widest text-slate-400">Branch phone routing</p>{branches.map(b=><div key={b.id} className="mt-2 rounded-xl bg-slate-50 p-3 text-xs dark:bg-white/5"><b>{b.name}</b><div className="mt-2 grid gap-2 md:grid-cols-[1fr_1fr_auto]"><Input placeholder="Branch WhatsApp number" value={drafts[b.id]?.whatsappNumber||''} onChange={e=>setDrafts({...drafts,[b.id]:{...drafts[b.id],whatsappNumber:e.target.value}})}/><Input placeholder="Branch Phone Number ID" value={drafts[b.id]?.whatsappPhoneNumberId||''} onChange={e=>setDrafts({...drafts,[b.id]:{...drafts[b.id],whatsappPhoneNumberId:e.target.value}})}/><Button onClick={()=>saveBranch(b.id,drafts[b.id])}>Save</Button></div></div>)}</div>; }
function Empty({ text }) { return <Card className="grid min-h-48 place-items-center p-8 text-center text-sm text-slate-400">{text}</Card>; }
