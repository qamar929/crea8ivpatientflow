// PatientFlow marketing site
// API base: override at deploy time via window.PF_API_URL if needed.
const PF_API_URL = window.PF_API_URL || (
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api/v1'
    : 'https://crea8ivmedia.com/app/api/v1'
);

/* ---------- Mobile nav ---------- */
document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.nav-links')?.classList.toggle('open');
  });
});
document.querySelectorAll('.nav-links a').forEach((a) => {
  a.addEventListener('click', () => document.querySelector('.nav-links')?.classList.remove('open'));
});

/* ---------- Active nav link ---------- */
const here = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach((a) => {
  if (a.getAttribute('href') === here) a.classList.add('active');
});

/* ---------- Header shadow on scroll ---------- */
const header = document.querySelector('.site-header');
if (header) {
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ---------- Scroll reveal ---------- */
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revealEls.length) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* ---------- Counter animations ---------- */
function animateCount(el) {
  const target = parseFloat(el.dataset.count);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  const dur = 1400;
  const start = performance.now();
  const fmt = (n) => prefix + (decimals ? n.toFixed(decimals) : Math.round(n)).toLocaleString('en-US') + suffix;
  function tick(now) {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(target * eased);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(target);
  }
  requestAnimationFrame(tick);
}
const counters = document.querySelectorAll('[data-count]');
if ('IntersectionObserver' in window && counters.length) {
  const co = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); } });
  }, { threshold: 0.5 });
  counters.forEach((el) => co.observe(el));
} else {
  counters.forEach((el) => { el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || ''); });
}

/* ---------- FAQ accordion ---------- */
document.querySelectorAll('.faq-item').forEach((item) => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  if (!q || !a) return;
  q.setAttribute('aria-expanded', 'false');
  q.addEventListener('click', () => {
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach((other) => {
      if (other !== item) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
        other.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
      }
    });
    item.classList.toggle('open', !open);
    a.style.maxHeight = open ? null : a.scrollHeight + 'px';
    q.setAttribute('aria-expanded', String(!open));
  });
});

/* ---------- Magnetic CTA buttons ---------- */
if (window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${x * 0.18}px, ${y * 0.28}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
  });
}

/* ---------- ROI calculator ---------- */
(function () {
  const patients = document.getElementById('roi-patients');
  if (!patients) return;
  const value = document.getElementById('roi-value');
  const fmtPkr = (n) => 'PKR ' + Math.round(n).toLocaleString('en-US');

  const els = {
    pOut: document.getElementById('roi-patients-out'),
    vOut: document.getElementById('roi-value-out'),
    booked: document.getElementById('roi-booked'),
    revenue: document.getElementById('roi-revenue'),
    big: document.getElementById('roi-big'),
    net: document.getElementById('roi-net'),
  };
  const SUB = 40000;        // AppointmentFlow AI monthly
  const BOOK_RATE = 0.013;  // ~1.3% of database books an appointment (matches the 45/3,500 case study)

  function recalc() {
    const p = parseInt(patients.value, 10);
    const v = parseInt(value.value, 10);
    const booked = Math.round(p * BOOK_RATE);
    const revenue = booked * v;
    const net = revenue - SUB;
    const roi = revenue / SUB;
    if (els.pOut) els.pOut.textContent = p.toLocaleString('en-US');
    if (els.vOut) els.vOut.textContent = fmtPkr(v);
    if (els.booked) els.booked.textContent = booked.toLocaleString('en-US');
    if (els.revenue) els.revenue.textContent = fmtPkr(revenue);
    if (els.big) els.big.textContent = roi.toFixed(1) + '×';
    if (els.net) els.net.textContent = fmtPkr(net);
  }
  patients.addEventListener('input', recalc);
  value.addEventListener('input', recalc);
  recalc();
})();

/* ---------- Lead forms (register / demo / contact share one endpoint) ---------- */
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
