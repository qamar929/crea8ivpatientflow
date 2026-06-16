// Crea8iv PatientFlow marketing site
// API base: override at deploy time via window.PF_API_URL if needed.
const PF_API_URL = window.PF_API_URL || (
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api/v1'
    : 'https://crea8ivmedia.com/app/api/v1'
);

// Platform branding — applied live from the super admin's Platform settings.
(function applyPlatformBranding() {
  fetch(PF_API_URL + '/public/platform-branding')
    .then((r) => r.json())
    .then((d) => {
      const b = d && d.branding;
      if (!b) return;
      const root = document.documentElement.style;
      if (b.primaryColor) { root.setProperty('--accent', b.primaryColor); root.setProperty('--accent-soft', b.primaryColor); }
      if (b.secondaryColor) root.setProperty('--accent-deep', b.secondaryColor);

      // Logo mark (text initials or image)
      document.querySelectorAll('.brand-mark').forEach((el) => {
        if (b.logoUrl) { el.innerHTML = '<img src="' + b.logoUrl + '" alt="" style="width:100%;height:100%;object-fit:contain">'; }
        else if (b.logoText) { el.textContent = b.logoText; }
      });
      if (b.brandName) {
        document.title = b.brandName + (b.tagline ? ' — ' + b.tagline : '');
        document.querySelectorAll('[data-pf-brand]').forEach((el) => { el.textContent = b.brandName; });
      }
      // Hero text (home page)
      const heroH1 = document.querySelector('.hero h1');
      if (heroH1 && b.heroTitle) heroH1.textContent = b.heroTitle;
      const heroSub = document.querySelector('.hero .hero-sub') || document.querySelector('.hero h1 + p');
      if (heroSub && b.heroSubtitle) heroSub.textContent = b.heroSubtitle;
      // Contact links
      if (b.supportEmail) document.querySelectorAll('a[href^="mailto:"]').forEach((a) => { a.href = 'mailto:' + b.supportEmail; if (a.dataset.pfContact !== undefined) a.textContent = b.supportEmail; });
      if (b.supportPhone) document.querySelectorAll('a[href^="tel:"]').forEach((a) => { a.href = 'tel:' + b.supportPhone.replace(/\s/g, ''); });
      if (b.whatsapp) document.querySelectorAll('a[href*="wa.me"]').forEach((a) => { a.href = 'https://wa.me/' + b.whatsapp.replace(/[^\d]/g, ''); });
    })
    .catch(() => { /* keep static defaults */ });
})();

// Mobile nav
document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.toggle('open');
  });
});

// Mark active nav link
const here = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach((a) => {
  if (a.getAttribute('href') === here) a.classList.add('active');
});

// Lead forms (register / demo / contact share the same endpoint)
document.querySelectorAll('form[data-lead-form]').forEach((form) => {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = form.querySelector('.form-msg');
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.textContent;

    const data = Object.fromEntries(new FormData(form).entries());
    if (form.dataset.leadForm === 'demo') {
      data.message = '[DEMO REQUEST] ' + (data.message || 'Requested a live demo.');
    } else if (form.dataset.leadForm === 'contact') {
      data.message = '[CONTACT] ' + (data.message || '');
      data.clinicName = data.clinicName || data.contactName;
    }

    msg.className = 'form-msg';
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const res = await fetch(PF_API_URL + '/public/register-clinic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
      msg.textContent = body.message || 'Thanks! Our team will contact you on WhatsApp shortly.';
      msg.className = 'form-msg ok';
      form.reset();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-msg err';
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
});
