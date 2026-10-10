// Bonusrunden-Anzeige für alle drei Quiz-Spiele (fragt /api/state; Server liefert gami: {bonus, nextAt, now}).
// Liegt im sichtbaren Handy-Bereich (nicht unter der YouTube-Leiste oben, nicht unter dem Chat unten).
(function () {
  const stage = document.getElementById('stage') || document.body;
  const st = document.createElement('style');
  st.textContent = `#gbonus{position:absolute;left:50%;top:var(--gbonus-top,1106px);transform:translateX(-50%);z-index:30;white-space:nowrap;
    font:900 26px/1 Inter,system-ui,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:#111;padding:6px 20px;border:4px solid #111;border-radius:12px;
    box-shadow:5px 5px 0 #000;background:#fff;display:none}
    #gbonus.soon{display:block;background:#ffe14d}
    #gbonus.on{display:block;background:#ff4b72;color:#fff;font-size:30px;animation:gb 0.9s ease-in-out infinite}
    #gbonus.count{display:block;opacity:.92}
    @keyframes gb{50%{transform:translateX(-50%) scale(1.06)}}`;
  document.head.appendChild(st);
  const el = document.createElement('div'); el.id = 'gbonus'; stage.appendChild(el);
  let skew = 0, info = null;
  const fmt = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function paint() {
    if (!info) return;
    const left = info.nextAt - (Date.now() + skew);
    if (info.bonus) { el.className = 'on'; el.textContent = '⚡ BONUS ROUND · DOUBLE POINTS ×2'; }
    else if (left < 25000) { el.className = 'soon'; el.textContent = '⚡ Bonus round starts in ' + Math.max(0, Math.ceil(left / 1000)) + 's'; }
    else { el.className = 'count'; el.textContent = '⚡ Bonus round in ' + fmt(left); }
  }
  async function poll() {
    try { const s = await (await fetch('/api/state', { cache: 'no-store' })).json(); if (s.gami) { info = s.gami; skew = s.gami.now - Date.now(); paint(); } } catch {}
  }
  setInterval(poll, 1500); setInterval(paint, 500); poll();
})();
