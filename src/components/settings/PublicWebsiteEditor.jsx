import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Megaphone, Plus, Save, Trash2 } from 'lucide-react';
import { fetchApi } from '../../config/api';
import { useClinic } from '../../context/ClinicContext';
import Button from '../ui/Button';

const emptyOffer = { title: '', description: '', badge: 'Limited time', image: '', cta: 'Book now', oldPrice: '', price: '', expiry: '', serviceId: '' };
const emptyFaq = { question: '', answer: '' };

export default function PublicWebsiteEditor() {
  const { term } = useClinic();
  const servicesLabel = term('services', 'Services');
  const doctorsLabel = term('doctors', 'Doctors');
  const galleryLabel = term('gallery', 'Gallery');
  const serviceLabel = term('service', 'service');
  const sectionLabels = { offers: 'Offers', services: servicesLabel, doctors: doctorsLabel, gallery: galleryLabel, testimonials: 'Testimonials', about: 'About', faq: 'FAQs', map: 'Google Map', booking: 'Booking Form' };
  const [config, setConfig] = useState(null);
  const [services, setServices] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    Promise.all([fetchApi('/settings/public-site'), fetchApi('/services')])
      .then(([data, serviceData]) => { setConfig(data.config); setServices(Array.isArray(serviceData) ? serviceData : []); })
      .catch((err) => setMessage(err.message));
  }, []);
  if (!config) return <div className="bg-white rounded-xl border border-gray-100 p-5 text-sm text-gray-500">Loading public website settings...</div>;

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30';
  const set = (key, value) => setConfig((current) => ({ ...current, [key]: value }));
  const setNested = (key, field, value) => set(key, { ...(config[key] || {}), [field]: value });
  const updateItem = (key, index, field, value) => set(key, config[key].map((item, i) => i === index ? { ...item, [field]: value } : item));
  const removeItem = (key, index) => set(key, config[key].filter((_, i) => i !== index));
  const moveItem = (key, index, direction) => {
    const items = [...config[key]];
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    [items[index], items[next]] = [items[next], items[index]];
    set(key, items);
  };
  const sectionOrder = config.sectionOrder || Object.keys(sectionLabels);
  const save = async () => {
    setSaving(true); setMessage('');
    try { await fetchApi('/settings/public-site', { method: 'PUT', body: JSON.stringify({ config }) }); setMessage('Public website updated.'); }
    catch (err) { setMessage(err.message); } finally { setSaving(false); }
  };

  return <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-5 pb-4 border-b border-gray-100">
      <div className="flex gap-3"><div className="p-2 rounded-lg bg-teal-50"><Megaphone className="w-4 h-4 text-teal-700" /></div><div><h3 className="text-sm font-semibold text-gray-900">Public Website & Online Booking</h3><p className="text-xs text-gray-400 mt-0.5">Control premium website content, discovery, and conversion sections.</p></div></div>
      <a href="/public" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">Preview public site <ExternalLink className="w-3.5 h-3.5" /></a>
    </div>

    <p className="text-sm font-bold text-gray-900 mb-3">Hero & Contact</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="text-xs font-semibold text-gray-600">Top announcement<input className={`${input} mt-1`} value={config.announcement || ''} onChange={(e) => set('announcement', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600">Hero eyebrow<input className={`${input} mt-1`} value={config.eyebrow || ''} onChange={(e) => set('eyebrow', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600 md:col-span-2">Hero title<input className={`${input} mt-1`} value={config.heroTitle || ''} onChange={(e) => set('heroTitle', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600 md:col-span-2">Hero subtitle<textarea rows={2} className={`${input} mt-1 resize-none`} value={config.heroSubtitle || ''} onChange={(e) => set('heroSubtitle', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600">Hero image URL<input className={`${input} mt-1`} value={config.heroImage || ''} onChange={(e) => set('heroImage', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600">Opening hours<input className={`${input} mt-1`} value={config.hours || ''} onChange={(e) => set('hours', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600">Google Maps URL<input className={`${input} mt-1`} value={config.googleMapsUrl || ''} onChange={(e) => set('googleMapsUrl', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600">Google Business URL<input className={`${input} mt-1`} value={config.googleBusinessUrl || ''} onChange={(e) => set('googleBusinessUrl', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600">About title<input className={`${input} mt-1`} value={config.aboutTitle || ''} onChange={(e) => set('aboutTitle', e.target.value)} /></label>
      <label className="text-xs font-semibold text-gray-600 md:col-span-2">About text<textarea rows={2} className={`${input} mt-1 resize-none`} value={config.aboutText || ''} onChange={(e) => set('aboutText', e.target.value)} /></label>
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <div><p className="text-sm font-bold text-gray-900 mb-3">Section Visibility & Order</p><div className="space-y-2">{sectionOrder.map((key, index) => <div key={key} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={config.sections?.[key] !== false} onChange={(e) => setNested('sections', key, e.target.checked)} /><span className="flex-1">{sectionLabels[key]}</span><button onClick={() => moveItem('sectionOrder', index, -1)}><ArrowUp className="w-3.5 h-3.5" /></button><button onClick={() => moveItem('sectionOrder', index, 1)}><ArrowDown className="w-3.5 h-3.5" /></button></div>)}</div></div>
      <div><p className="text-sm font-bold text-gray-900 mb-3">Social Links</p><div className="grid gap-2">{['facebook', 'instagram', 'tiktok', 'youtube'].map((key) => <input key={key} className={input} value={config.socials?.[key] || ''} onChange={(e) => setNested('socials', key, e.target.value)} placeholder={`${key[0].toUpperCase() + key.slice(1)} URL`} />)}</div></div>
    </div>

    <div className="mt-6"><p className="text-sm font-bold text-gray-900 mb-3">SEO Controls</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2"><input className={input} value={config.seoTitle || ''} onChange={(e) => set('seoTitle', e.target.value)} placeholder="SEO page title" /><input className={input} value={config.ogImage || ''} onChange={(e) => set('ogImage', e.target.value)} placeholder="Social share image URL" /><textarea rows={2} className={`${input} md:col-span-2 resize-none`} value={config.seoDescription || ''} onChange={(e) => set('seoDescription', e.target.value)} placeholder="Meta description" /></div></div>

    <div className="mt-6"><div className="flex items-center justify-between mb-3"><div><p className="text-sm font-bold text-gray-900">Navigation Editor</p><p className="text-xs text-gray-400">Edit labels, anchors, and display order.</p></div></div><div className="space-y-2">{(config.nav || []).map((item, index) => <div key={index} className="flex gap-2"><input className={input} value={item.label} onChange={(e) => updateItem('nav', index, 'label', e.target.value)} placeholder="Label" /><input className={input} value={item.href} onChange={(e) => updateItem('nav', index, 'href', e.target.value)} placeholder="#services" /><button onClick={() => moveItem('nav', index, -1)} className="p-2 text-gray-500"><ArrowUp className="w-4 h-4" /></button><button onClick={() => moveItem('nav', index, 1)} className="p-2 text-gray-500"><ArrowDown className="w-4 h-4" /></button><button onClick={() => removeItem('nav', index)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button></div>)}</div><Button size="sm" variant="secondary" className="mt-2" onClick={() => set('nav', [...(config.nav || []), { label: '', href: '#' }])}><Plus className="w-3.5 h-3.5" /> Add Nav Item</Button></div>

    <div className="mt-6"><div className="flex items-center justify-between mb-3"><div><p className="text-sm font-bold text-gray-900">Offer Posts</p><p className="text-xs text-gray-400">Promotions with price, expiry date, and linked {serviceLabel}.</p></div><Button size="sm" variant="secondary" disabled={(config.offers || []).length >= 8} onClick={() => set('offers', [...(config.offers || []), emptyOffer])}><Plus className="w-3.5 h-3.5" /> Add Offer</Button></div>
      <div className="space-y-3">{(config.offers || []).map((offer, index) => <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 rounded-xl bg-gray-50 border border-gray-100 p-3"><input className={input} value={offer.title} onChange={(e) => updateItem('offers', index, 'title', e.target.value)} placeholder="Offer title" /><input className={input} value={offer.badge} onChange={(e) => updateItem('offers', index, 'badge', e.target.value)} placeholder="Badge" /><input className={input} value={offer.expiry || ''} onChange={(e) => updateItem('offers', index, 'expiry', e.target.value)} type="date" /><input className={input} value={offer.oldPrice || ''} onChange={(e) => updateItem('offers', index, 'oldPrice', e.target.value)} type="number" placeholder="Old price" /><input className={input} value={offer.price || ''} onChange={(e) => updateItem('offers', index, 'price', e.target.value)} type="number" placeholder="Offer price" /><select className={input} value={offer.serviceId || ''} onChange={(e) => updateItem('offers', index, 'serviceId', e.target.value)}><option value="">Linked {serviceLabel}</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select><input className={`${input} md:col-span-2`} value={offer.description} onChange={(e) => updateItem('offers', index, 'description', e.target.value)} placeholder="Description" /><button onClick={() => removeItem('offers', index)} className="flex items-center justify-center gap-1 rounded-lg text-xs font-bold text-red-500"><Trash2 className="w-4 h-4" /> Remove</button></div>)}</div>
    </div>

    <div className="mt-6"><div className="flex items-center justify-between mb-3"><p className="text-sm font-bold text-gray-900">FAQs</p><Button size="sm" variant="secondary" onClick={() => set('faqs', [...(config.faqs || []), emptyFaq])}><Plus className="w-3.5 h-3.5" /> Add FAQ</Button></div><div className="space-y-2">{(config.faqs || []).map((faq, index) => <div key={index} className="grid gap-2 rounded-xl bg-gray-50 p-3 md:grid-cols-[1fr_1fr_auto]"><input className={input} value={faq.question} onChange={(e) => updateItem('faqs', index, 'question', e.target.value)} placeholder="Question" /><input className={input} value={faq.answer} onChange={(e) => updateItem('faqs', index, 'answer', e.target.value)} placeholder="Answer" /><button onClick={() => removeItem('faqs', index)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button></div>)}</div></div>

    <div className="mt-5 flex items-center gap-3"><Button onClick={save} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Publishing...' : 'Publish Public Website'}</Button>{message && <span className="text-xs text-gray-500">{message}</span>}</div>
  </div>;
}
