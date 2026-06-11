/*!
 * Crea8iv PatientFlow — embeddable booking widget
 * Usage (paste into a WordPress "Custom HTML" block):
 *   <div id="pf-booking" data-clinic="portal.thesmilexperts.com"></div>
 *   <script src="https://crea8ivmedia.com/clinic/booking-widget.js" defer></script>
 *
 * Optional data-attrs on the div:
 *   data-clinic   = the clinic's domain the API resolves by (required for correct routing)
 *   data-api      = API base (default https://crea8ivmedia.com/app/api/v1)
 *   data-accent   = override accent colour (else taken from the clinic branding)
 */
(function () {
  'use strict';
  var DEFAULT_API = 'https://crea8ivmedia.com/app/api/v1';

  function injectStyles() {
    if (document.getElementById('pf-booking-styles')) return;
    var css = `
    .pfb{max-width:520px;margin:0 auto;font-family:inherit;color:#1e293b;box-sizing:border-box}
    .pfb *,.pfb *::before,.pfb *::after{box-sizing:border-box}
    .pfb-card{border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 10px 30px rgba(2,6,23,.06)}
    .pfb-head{padding:20px 22px;text-align:center}
    .pfb-head h3{margin:0;font-size:20px;font-weight:800;color:var(--pfb)}
    .pfb-head p{margin:4px 0 0;font-size:13px;color:#64748b}
    .pfb-body{padding:18px 22px 22px}
    .pfb-field{margin-bottom:14px}
    .pfb-label{display:block;font-size:12px;font-weight:700;color:#475569;margin-bottom:6px}
    .pfb-input,.pfb-select{width:100%;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;font-size:14px;background:#fff;color:#1e293b}
    .pfb-input:focus,.pfb-select:focus{outline:none;border-color:var(--pfb);box-shadow:0 0 0 3px color-mix(in srgb,var(--pfb) 20%,transparent)}
    .pfb-cal{border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .pfb-cal-top{display:flex;align-items:center;justify-content:space-between;background:var(--pfb);color:#fff;padding:10px 14px;font-weight:800;font-size:14px}
    .pfb-cal-top button{background:rgba(255,255,255,.18);border:0;color:#fff;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;line-height:1}
    .pfb-cal-top button:disabled{opacity:.35;cursor:not-allowed}
    .pfb-grid{display:grid;grid-template-columns:repeat(7,1fr)}
    .pfb-dow{background:#0f172a;color:#cbd5e1;font-size:10px;font-weight:700;text-align:center;padding:7px 0;letter-spacing:.04em}
    .pfb-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:13px;border-top:1px solid #f1f5f9;border-left:1px solid #f1f5f9;cursor:pointer;color:#334155;background:#fff}
    .pfb-day.mut{color:#cbd5e1;cursor:default;background:#fafafa}
    .pfb-day.sel{background:var(--pfb);color:#fff;font-weight:800;border-radius:0}
    .pfb-day:not(.mut):hover{background:color-mix(in srgb,var(--pfb) 12%,#fff)}
    .pfb-slots{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
    .pfb-slot{padding:8px 12px;border:1px solid #cbd5e1;border-radius:9px;background:#fff;font-size:13px;cursor:pointer;color:#334155}
    .pfb-slot.sel{background:var(--pfb);color:#fff;border-color:var(--pfb);font-weight:700}
    .pfb-slot:hover{border-color:var(--pfb)}
    .pfb-note{font-size:12px;color:#94a3b8;margin:8px 0 0}
    .pfb-btn{width:100%;padding:13px;border:0;border-radius:11px;background:var(--pfb);color:#fff;font-size:15px;font-weight:800;cursor:pointer;margin-top:6px}
    .pfb-btn:disabled{opacity:.5;cursor:not-allowed}
    .pfb-err{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;font-size:13px;padding:9px 12px;border-radius:10px;margin-bottom:12px}
    .pfb-ok{text-align:center;padding:26px 18px}
    .pfb-ok .pfb-tick{width:54px;height:54px;border-radius:50%;background:color-mix(in srgb,var(--pfb) 15%,#fff);color:var(--pfb);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:28px}
    .pfb-ref{display:inline-block;margin-top:8px;font-weight:800;color:var(--pfb);background:color-mix(in srgb,var(--pfb) 10%,#fff);padding:6px 12px;border-radius:8px;font-size:14px}
    .pfb-muted{font-size:12px;color:#94a3b8;text-align:center;margin-top:14px}`;
    var s = document.createElement('style');
    s.id = 'pf-booking-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function initWidget(root) {
    injectStyles();
    var api = (root.getAttribute('data-api') || DEFAULT_API).replace(/\/$/, '');
    var clinic = root.getAttribute('data-clinic') || location.hostname;
    var q = '?domain=' + encodeURIComponent(clinic);

    var state = { site: null, serviceId: '', staffId: '', date: '', startTime: '', month: new Date() };
    root.className = 'pfb';
    root.innerHTML = '<div class="pfb-card"><div class="pfb-body" style="text-align:center;color:#94a3b8;padding:40px">Loading booking…</div></div>';

    fetch(api + '/public/site' + q, { headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (site) {
        if (!site || !site.clinic) throw new Error('Could not load clinic');
        state.site = site;
        document.documentElement.style.setProperty('--pfb', site.clinic.primaryColor || root.getAttribute('data-accent') || '#0f766e');
        render();
      })
      .catch(function (e) {
        root.innerHTML = '<div class="pfb-card"><div class="pfb-body"><div class="pfb-err">Booking is temporarily unavailable. ' + esc(e.message) + '</div></div></div>';
      });

    function accent() { return (state.site.clinic.primaryColor) || '#0f766e'; }

    function loadSlots(container) {
      container.innerHTML = '<p class="pfb-note">Loading times…</p>';
      var svc = state.site.services.find(function (s) { return s.id === state.serviceId; });
      var dur = svc ? svc.duration : 30;
      fetch(api + '/public/availability' + q + '&staffId=' + encodeURIComponent(state.staffId) + '&date=' + state.date + '&duration=' + dur)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          var slots = (d && d.slots) || [];
          if (!slots.length) { container.innerHTML = '<p class="pfb-note">No times available on this day. Try another date.</p>'; return; }
          container.innerHTML = '';
          slots.forEach(function (sl) {
            var b = el('button', { type: 'button', class: 'pfb-slot' + (state.startTime === sl.startTime ? ' sel' : '') }, sl.startTime);
            b.onclick = function () { state.startTime = sl.startTime; render(); };
            container.appendChild(b);
          });
        })
        .catch(function () { container.innerHTML = '<p class="pfb-note">Could not load times.</p>'; });
    }

    function render() {
      var s = state, site = s.site, accentC = accent();
      var card = el('div', { class: 'pfb-card' });
      card.appendChild(el('div', { class: 'pfb-head' }, '<h3>Schedule Your Visit</h3><p>' + esc(site.clinic.name) + '</p>'));
      var body = el('div', { class: 'pfb-body' });

      // Service
      var fSvc = el('div', { class: 'pfb-field' });
      fSvc.appendChild(el('label', { class: 'pfb-label' }, 'Service'));
      var sel = el('select', { class: 'pfb-select' });
      sel.appendChild(el('option', { value: '' }, 'Choose a service…'));
      (site.services || []).forEach(function (sv) {
        var o = el('option', { value: sv.id }, esc(sv.name) + (sv.price ? ' — PKR ' + sv.price : ''));
        if (sv.id === s.serviceId) o.setAttribute('selected', 'selected');
        sel.appendChild(o);
      });
      sel.onchange = function () { s.serviceId = this.value; s.startTime = ''; render(); };
      fSvc.appendChild(sel); body.appendChild(fSvc);

      // Doctor
      var fDoc = el('div', { class: 'pfb-field' });
      fDoc.appendChild(el('label', { class: 'pfb-label' }, 'Doctor'));
      var dsel = el('select', { class: 'pfb-select' });
      dsel.appendChild(el('option', { value: '' }, 'Choose a doctor…'));
      (site.staff || []).forEach(function (st) {
        var o = el('option', { value: st.id }, esc(st.name) + (st.designation ? ' (' + esc(st.designation) + ')' : ''));
        if (st.id === s.staffId) o.setAttribute('selected', 'selected');
        dsel.appendChild(o);
      });
      dsel.onchange = function () { s.staffId = this.value; s.startTime = ''; render(); };
      fDoc.appendChild(dsel); body.appendChild(fDoc);

      if (!site.staff || !site.staff.length) {
        body.appendChild(el('div', { class: 'pfb-err' }, 'No doctors are available for online booking yet. Please call the clinic.'));
      }

      // Calendar (shown once a doctor is chosen)
      if (s.staffId) {
        var fCal = el('div', { class: 'pfb-field' });
        fCal.appendChild(el('label', { class: 'pfb-label' }, 'Pick a date'));
        fCal.appendChild(buildCalendar());
        body.appendChild(fCal);
      }

      // Slots
      if (s.staffId && s.date) {
        var fSlot = el('div', { class: 'pfb-field' });
        fSlot.appendChild(el('label', { class: 'pfb-label' }, 'Available times — ' + s.date));
        var slotWrap = el('div', { class: 'pfb-slots' });
        fSlot.appendChild(slotWrap); body.appendChild(fSlot);
        loadSlots(slotWrap);
      }

      // Contact + submit (once a time is picked)
      if (s.startTime) {
        ['Full name|name|text', 'Phone|phone|tel', 'Email (optional)|email|email'].forEach(function (def) {
          var p = def.split('|'); var f = el('div', { class: 'pfb-field' });
          f.appendChild(el('label', { class: 'pfb-label' }, p[0]));
          f.appendChild(el('input', { class: 'pfb-input', type: p[2], 'data-k': p[1], placeholder: p[0] }));
          body.appendChild(f);
        });
        var errBox = el('div'); body.appendChild(errBox);
        var btn = el('button', { class: 'pfb-btn', type: 'button' }, 'Request Appointment');
        btn.onclick = function () { submit(body, btn, errBox); };
        body.appendChild(btn);
        body.appendChild(el('p', { class: 'pfb-muted' }, 'Powered by Crea8iv PatientFlow'));
      }

      card.appendChild(body);
      root.innerHTML = ''; root.appendChild(card);
    }

    function buildCalendar() {
      var s = state, m = s.month, y = m.getFullYear(), mo = m.getMonth();
      var wrap = el('div', { class: 'pfb-cal' });
      var top = el('div', { class: 'pfb-cal-top' });
      var prev = el('button', { type: 'button' }, '‹');
      var now = new Date(); now.setHours(0, 0, 0, 0);
      var atStart = (y === now.getFullYear() && mo === now.getMonth());
      prev.disabled = atStart;
      prev.onclick = function () { if (!atStart) { s.month = new Date(y, mo - 1, 1); s.date = ''; s.startTime = ''; render(); } };
      var next = el('button', { type: 'button' }, '›');
      next.onclick = function () { s.month = new Date(y, mo + 1, 1); s.date = ''; s.startTime = ''; render(); };
      top.appendChild(prev);
      top.appendChild(el('span', null, m.toLocaleString('en', { month: 'long' }).toUpperCase() + ' ' + y));
      top.appendChild(next);
      wrap.appendChild(top);

      var grid = el('div', { class: 'pfb-grid' });
      ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach(function (d) { grid.appendChild(el('div', { class: 'pfb-dow' }, d)); });
      var first = new Date(y, mo, 1);
      var lead = (first.getDay() + 6) % 7; // Monday-first
      for (var i = 0; i < lead; i++) grid.appendChild(el('div', { class: 'pfb-day mut' }, ''));
      var days = new Date(y, mo + 1, 0).getDate();
      for (var d = 1; d <= days; d++) {
        var dt = new Date(y, mo, d); dt.setHours(0, 0, 0, 0);
        var iso = ymd(dt);
        var past = dt < now;
        var cell = el('div', { class: 'pfb-day' + (past ? ' mut' : '') + (s.date === iso ? ' sel' : '') }, String(d));
        if (!past) (function (isoD) { cell.onclick = function () { s.date = isoD; s.startTime = ''; render(); }; })(iso);
        grid.appendChild(cell);
      }
      wrap.appendChild(grid);
      return wrap;
    }

    function submit(body, btn, errBox) {
      errBox.innerHTML = '';
      var get = function (k) { var i = body.querySelector('[data-k="' + k + '"]'); return i ? i.value.trim() : ''; };
      var name = get('name'), phone = get('phone'), email = get('email');
      if (!name || !phone) { errBox.innerHTML = '<div class="pfb-err">Please enter your name and phone.</div>'; return; }
      btn.disabled = true; btn.textContent = 'Booking…';
      fetch(api + '/public/book' + q, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, phone: phone, email: email, date: state.date, startTime: state.startTime, staffId: state.staffId, serviceIds: [state.serviceId] })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || res.d.message || 'Booking failed');
          var c = el('div', { class: 'pfb-card' });
          c.innerHTML = '<div class="pfb-ok"><div class="pfb-tick">✓</div><h3 style="margin:0 0 6px;color:var(--pfb)">Appointment requested!</h3>' +
            '<p style="color:#64748b;font-size:14px;margin:0">We\'ll confirm by phone shortly.</p>' +
            '<div class="pfb-ref">Ref: ' + esc(res.d.reference || '') + '</div>' +
            '<p class="pfb-muted">Powered by Crea8iv PatientFlow</p></div>';
          root.innerHTML = ''; root.appendChild(c);
        })
        .catch(function (e) { errBox.innerHTML = '<div class="pfb-err">' + esc(e.message) + '</div>'; btn.disabled = false; btn.textContent = 'Request Appointment'; });
    }
  }

  function boot() {
    var nodes = document.querySelectorAll('#pf-booking,[data-pf-booking]');
    nodes.forEach(function (n) { if (!n.__pfb) { n.__pfb = true; initWidget(n); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
