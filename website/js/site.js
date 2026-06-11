// Crea8iv PatientFlow marketing site
// API base: override at deploy time via window.PF_API_URL if needed.
const PF_API_URL = window.PF_API_URL || (
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:4000/api/v1'
    : 'https://crea8ivmedia.com/app/api/v1'
);

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
