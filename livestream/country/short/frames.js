// Nimmt alle Einzelbilder eines Shorts auf: node frames.js "<query>" <outdir> [fps] [dauer]
const { chromium } = require('playwright-core'); const fs = require('fs');
(async () => {
  const [q, out, fps = 30, dur = 15] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto((process.env.BASE||'http://127.0.0.1:8099')+'/country/short/short.html?' + q); await p.waitForFunction(() => window.READY); await p.waitForTimeout(500);
  const n = Math.round(fps * dur);
  for (let i = 0; i < n; i++) { await p.evaluate(t => render(t), i / fps); await p.screenshot({ path: `${out}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 }); }
  await b.close();
})();
