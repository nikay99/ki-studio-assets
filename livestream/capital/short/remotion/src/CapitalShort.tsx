import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender, staticFile} from 'remotion';

const T = {hint: [2.0, 3.2, 4.4], rev0: 2.5, rev1: 5.5, solve: 6.0, end: 10.0, total: 15.0, intro: 1.2};
const C = {paper: '#173d3a', dot: '#245a55', card: '#f8f4eb', y: '#fed439', p: '#ff7b9c', c: '#61d4f5', l: '#b6f36a', o: '#ff8a3d', sea: '#d9f1fb', red: '#ff3b3b'};
const flagOf = (c: string) => String.fromCodePoint(...[...c].map(x => 0x1F1E6 + x.charCodeAt(0) - 65));
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const R = ((i) => () => (i = (i * 16807) % 2147483647) / 2147483647)(42);
const PARTS = [...Array(140)].map((_, i) => ({a: -Math.PI / 2 + (R() - .5) * 2.6, v: 14 + R() * 18, c: ['#ff5d8d', '#7c5cff', '#2ec4a6', '#ffb627', '#5ab4ff'][i % 5], r: 6 + R() * 7, s: R() * 6}));

const box = (extra: React.CSSProperties = {}): React.CSSProperties => ({border: '6px solid #111', boxShadow: '10px 10px 0 #000', borderRadius: 18, ...extra});

type P = {code: string; country: string; cap: string; trap: string; d: string; capx: number; capy: number};

export const CapitalShort: React.FC<P> = ({code, country, cap, trap, d, capx, capy}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const COUNTRY = country.toUpperCase(), CAP = cap.toUpperCase();
  // Schrift laden, Umriss vermessen
  const [h] = React.useState(() => delayRender('font+bbox'));
  const [vb, setVb] = React.useState<number[] | null>(null);
  const pathRef = React.useRef<SVGPathElement>(null);
  React.useEffect(() => {
    (async () => {
      const ff = new FontFace('Inter', `url(${staticFile('InterVariable.woff2')})`, {weight: '100 900'}); await ff.load(); (document.fonts as any).add(ff);
      const bb = pathRef.current!.getBBox(), pad = 30; setVb([bb.x - pad, bb.y - pad, bb.width + 2 * pad + 10, bb.height + 2 * pad + 10]);
      continueRender(h);
    })();
  }, []);

  const back = frame / fps > T.total - 0.4;      // Loop: Endkarte blendet in das erste Bild zurück
  const t = back ? 0 : frame / fps;
  const pop = (at: number, damping = 11, stiffness = 170, mass = .7) => spring({frame: Math.round((t - at) * fps), fps, config: {damping, stiffness, mass}});
  const solved = t >= T.solve;
  const intro = !solved && t < T.intro;

  // ---- Bühne: Wackeln, Blitz, Vignette ----
  const shake = (t >= .3 && t < .8 ? 26 * Math.exp(-(t - .3) * 9) : 0) + (t >= T.solve && t < T.solve + .6 ? 30 * Math.exp(-(t - T.solve) * 8) : 0) + (t >= 4 && t < T.solve ? 6 * Math.abs(Math.sin(t * 40)) : 0);
  const flash = t >= .3 && t < .5 ? .55 * (1 - (t - .3) / .2) : t >= T.solve && t < T.solve + .25 ? .8 * (1 - (t - T.solve) / .25) : 0;
  const vig = t >= 3 && t < T.solve ? (t - 3) / 3 * (.6 + .4 * Math.abs(Math.sin(t * Math.PI))) : 0;
  const ph = frame / (T.total * fps);

  // ---- Hook-Text ----
  const h1 = solved ? `It's ${CAP}!` : intro ? (trap ? `EVERYONE SAYS ${trap.toUpperCase()}… 😬` : "BET YOU CAN'T NAME IT 😏") : "What's the capital of";
  const h1fs = Math.min(70, Math.floor(830 / (h1.length * .62)));
  const gl = intro && Math.floor(t * 24) % 3 === 0 ? 9 : intro ? 4 : 0;
  const h2 = solved ? (trap ? `Not ${trap} 🤯` : 'Did you get it? 👇') : `${flagOf(code)} ${COUNTRY}?`;
  const slam = t < .3 ? 1.3 - .3 * (t / .3) ** 2 : 1;
  const hookScale = solved ? .85 + .15 * pop(T.solve) : 1 + .04 * Math.max(0, Math.sin(t * Math.PI * 2 * 128 / 60));
  const introIn = spring({frame: Math.round(t * fps), fps, config: {damping: 9, stiffness: 220, mass: .6}});
  // Sonnenstrahlen: Hook-Einstieg + Auflösung
  const burst = intro ? Math.min(1, t / .15) : solved ? Math.max(0, 1 - (t - T.solve) / 1.4) * .9 : Math.max(0, 1 - (t - T.intro) / .5);
  // Riesen-Flagge: knallt in 0–1,2 s mittig rein und fliegt dann klein in die Ecke der Karte
  const bigFlag = t < T.intro + .5 ? (t < T.intro ? 1 : 1 - clamp((t - T.intro) / .5)) : 0;

  // ---- Countdown ----
  const cnt = Math.max(1, Math.ceil(6 - Math.max(1, t))), ct = t < 1 ? 0 : (t - 1) % 1;
  const ringP = solved ? 1 : clamp((t - 1) / 5);

  // ---- Tipps ----
  const last = CAP.replace(/ /g, '').slice(-1);
  const hints: [string, string, number][] = [['🔤 Starts with', CAP[0], T.hint[0]], ['📍 Location', 'see the dot', T.hint[1]], trap ? ['🤯 Tricky', 'Not ' + trap, T.hint[2]] : ['🔚 Ends with', last, T.hint[2]]];

  // ---- Kacheln ----
  const words = CAP.split(' '), letters = CAP.replace(/ /g, '');
  const nw = Math.max(...words.map(w => w.length)), L = letters.length;
  let sz = Math.min(104, Math.floor((880 - (L - 1) * 10 - (words.length - 1) * 22) / L)); if (sz < 58) sz = Math.min(80, Math.floor((880 - (nw - 1) * 10) / nw));
  const order = [...letters].map((_, i) => i).filter(i => i > 0).sort((a, b) => ((a * 7919) % 13) - ((b * 7919) % 13)).slice(0, Math.floor((L - 1) / 2));
  const nrev = t < T.rev0 ? 0 : Math.min(order.length, Math.floor((t - T.rev0) / ((T.rev1 - T.rev0) / Math.max(1, order.length))) + 1);

  // ---- Karte ----
  const mapPunch = spring({frame: Math.round(t * fps), fps, config: {damping: 12, stiffness: 200, mass: .8}});
  const mapScale = (.7 + .3 * mapPunch) * (1 + .02 * Math.sin(ph * 2 * Math.PI * 5));
  const u = vb ? vb[2] / 788 : 1;
  const dotOn = t >= T.hint[1];
  const rp = ((t - T.hint[1]) % 1);
  const labW = (CAP.length * 42 + 90) * u, labH = 88 * u;
  const lx = vb ? Math.max(vb[0] + 8 * u, Math.min(vb[0] + vb[2] - labW - 8 * u, capx - labW / 2)) : 0;
  const ly = vb ? (capy - vb[1] > vb[3] * .4 ? capy - labH - 30 * u : capy + 30 * u) : 0;

  // ---- Endkarte ----
  const endOp = back ? (T.total - frame / fps) / .4 : t < T.end ? 0 : clamp((t - T.end) / .3);
  const te = frame / fps;
  const cardPop = back ? 1 : .7 + .3 * spring({frame: Math.round((te - T.end) * fps), fps, config: {damping: 10, stiffness: 190, mass: .7}});
  const arrowK = clamp((te - T.end - .3) / .4);
  const wob = arrowK >= 1 ? Math.abs(Math.sin(te * 7)) : 0;
  const ringT = ((te - T.end - .7) % .8) / .8;
  // Position aus Niklas' Handyfoto (12.10. 22:28, Shorts-Feed schneidet das 9:16-Bild seitlich an, Skalierung 0,941): Profilbild-Mitte im Video bei x≈138, y≈1552, Radius ≈49
  const ARROW = 'M380 1085 C520 1200 380 1370 250 1425';

  const cx = (el: number, a: number) => (a);
  void cx;

  return (
    <AbsoluteFill style={{background: C.paper, fontFamily: 'Inter, "Noto Color Emoji", sans-serif', overflow: 'hidden'}}>
      <AbsoluteFill style={{zIndex: 0, transform: shake ? `translate(${shake * Math.sin(t * 90)}px,${shake * Math.cos(t * 73)}px)` : undefined}}>
        {/* Punktegitter wandert */}
        <AbsoluteFill style={{backgroundImage: `radial-gradient(${C.dot} 2.4px,transparent 2.4px)`, backgroundSize: '36px 36px', backgroundPosition: `${ph * 720}px ${ph * 360}px`}} />
        {/* Sonnenstrahlen */}
        <div style={{position: 'absolute', left: -700, top: -300, width: 2480, height: 2480, borderRadius: '50%', opacity: Math.max(0, burst),
          background: 'repeating-conic-gradient(rgba(254,212,57,.14) 0 6deg,rgba(254,212,57,0) 6deg 12deg)',
          WebkitMaskImage: 'radial-gradient(circle,#000 18%,transparent 62%)', transform: `rotate(${t * 40}deg) scale(${1 + .15 * Math.sin(t * 3)})`}} />

        {/* Hook */}
        <div style={{position: 'absolute', top: 385, left: 60, width: 880, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, transform: `scale(${hookScale})`}}>
          <div style={{...box(), fontSize: h1fs, fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, whiteSpace: 'nowrap', background: C.y,
            padding: '10px 26px 14px', transform: `rotate(-2deg) scale(${intro ? .4 + .6 * introIn : 1})`, textShadow: gl ? `${gl}px 0 ${C.red},${-gl}px 0 ${C.c}` : 'none'}}>{h1}</div>
          <div style={{...box(), fontSize: 72, fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, whiteSpace: 'nowrap', background: C.p,
            padding: '8px 24px 12px', transform: `rotate(1.5deg) scale(${solved ? 1 : .6 + .4 * clamp(introIn)})`}}>{h2}</div>
        </div>

        {/* Karte mit Umriss */}
        <div style={{...box({position: 'absolute', top: 605, left: 60, width: 880, height: 470, overflow: 'hidden', background: C.sea,
          backgroundImage: 'radial-gradient(#b4e2f3 2px,transparent 2px)', backgroundSize: '24px 24px', backgroundPosition: `${-ph * 480}px ${ph * 240}px`})}}>
          <svg viewBox={vb ? vb.join(' ') : '0 0 788 410'} style={{position: 'absolute', left: 40, top: 24, width: 788, height: 410, overflow: 'visible', transform: `scale(${slam * mapScale})`}}>
            <path d={d} transform="translate(10 10)" fill="#000" />
            <path ref={pathRef} d={d} fill={solved ? C.l : C.y} stroke="#111" strokeWidth={5} strokeLinejoin="round" />
            {dotOn && !solved || dotOn ? <g>
              <circle cx={capx} cy={capy} r={(20 + 40 * rp) * u} fill="none" stroke={C.red} strokeWidth={6 * u} opacity={1 - rp} />
              <circle cx={capx} cy={capy} r={22 * u * Math.min(1.2, pop(T.hint[1]))} fill={C.red} stroke="#111" strokeWidth={5 * u} />
            </g> : null}
            {solved && vb ? <g transform={`translate(${lx + labW / 2} ${ly + labH / 2}) scale(${pop(T.solve)}) translate(${-labW / 2} ${-labH / 2})`}>
              <rect width={labW} height={labH} rx={12 * u} fill="#fff" stroke="#111" strokeWidth={6 * u} />
              <text x={labW / 2} y={labH * .7} textAnchor="middle" fontWeight={900} fontSize={62 * u} fill="#111">★ {CAP}</text></g> : null}
          </svg>
          {/* kleine Flagge in der Ecke */}
          <div style={{...box({position: 'absolute', left: 24, top: 24, fontSize: 150, lineHeight: 1, background: '#fff', borderRadius: 16, boxShadow: '8px 8px 0 #000', padding: '6px 20px', opacity: t >= T.intro + .3 ? clamp((t - T.intro - .3) / .2) : 0})}}>{flagOf(code)}</div>
        </div>

        {/* Countdown-Kreis mit Ring */}
        <div style={{position: 'absolute', top: 545, left: 800, width: 180, height: 180, transform: `scale(${solved ? 1 : 1 + .18 * (1 - Math.min(1, spring({frame: Math.round(ct * 1.4 * fps / 3), fps, config: {damping: 8, stiffness: 300}})))})`, zIndex: 3}}>
          <div style={{width: 180, height: 180, borderRadius: '50%', background: solved ? '#2ec27e' : C.red, color: '#fff', fontWeight: 900, fontSize: 116, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '7px solid #111', boxShadow: '8px 8px 0 #000'}}>{solved ? '✓' : cnt}</div>
          <svg width={180} height={180} style={{position: 'absolute', inset: 0, transform: 'rotate(-90deg)'}}><circle cx={90} cy={90} r={76} fill="none" stroke="rgba(255,255,255,.85)" strokeWidth={9} strokeLinecap="round" strokeDasharray={2 * Math.PI * 76} strokeDashoffset={2 * Math.PI * 76 * ringP} /></svg>
        </div>

        {/* Tipps */}
        <div style={{position: 'absolute', top: 1100, left: 60, width: 880, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16}}>
          {hints.map(([k, v, at], i) => {
            const o = t >= at, s = o ? .8 + .2 * Math.min(1.15, pop(at)) : 1;
            return <div key={i} style={{height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 16px', background: o ? C.c : '#e7e2d6', border: '5px solid #111', borderRadius: 12, boxShadow: '6px 6px 0 #000', whiteSpace: 'nowrap', overflow: 'hidden', transform: `scale(${s})`}}>
              <div style={{fontSize: 22, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .7}}>{k}</div>
              <div style={{fontSize: o && v.length > 8 ? Math.max(26, Math.floor(40 * 8 / v.length)) : 40, fontWeight: 900}}>{o ? v : '🔒'}</div></div>;
          })}
        </div>

        {/* Buchstaben */}
        <div style={{position: 'absolute', top: 1268, left: 60, width: 880, height: 118, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: '10px 22px'}}>
          {(() => { let k = 0; return words.map((w, wi) => <div key={wi} style={{display: 'flex', gap: 10}}>{[...w].map(ch => {
            const i = k++, ord = order.indexOf(i), on = solved || (i === 0 && t >= T.hint[0]) || (ord >= 0 && ord < nrev);
            const at = solved ? T.solve + i * .05 : i === 0 ? T.hint[0] : T.rev0 + ord * ((T.rev1 - T.rev0) / Math.max(1, order.length));
            return <div key={i} style={{width: sz, height: Math.round(sz * 1.12), fontSize: Math.round(sz * .6), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, background: solved ? C.l : on ? C.y : '#fff', border: '5px solid #111', borderRadius: 12, boxShadow: '5px 5px 0 #000', color: '#111', transform: on ? `scale(${.75 + .25 * Math.min(1.15, pop(at))})` : 'none'}}>{on ? ch : ''}</div>;
          })}</div>); })()}
        </div>

        {/* Zeitbalken + Aufruf */}
        <div style={{position: 'absolute', top: 1400, left: 70, width: 860, height: 30, background: C.card, border: '5px solid #111', borderRadius: 10, boxShadow: '6px 6px 0 #000', overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${solved ? 0 : Math.max(0, 1 - (t - 1) / 5) * 100}%`, background: C.p}} /></div>
        <div style={{position: 'absolute', top: 1446, left: 60, width: 880, textAlign: 'center', fontSize: 40, fontWeight: 900, color: '#fff'}}>💬 <span style={{background: C.y, color: '#111', padding: '2px 14px', border: '4px solid #111', borderRadius: 8}}>comment</span> your answer!</div>

        {/* Riesen-Flagge im Hook */}
        {bigFlag > 0 ? <div style={{position: 'absolute', left: 0, right: 0, top: 700, textAlign: 'center', fontSize: 280, lineHeight: 1, opacity: Math.min(1, bigFlag * 1.4),
          transform: `scale(${t < T.intro ? .3 + .7 * introIn : 1 + (1 - bigFlag) * -.6}) rotate(${t < T.intro ? -8 + 8 * introIn : 0}deg)`, filter: 'drop-shadow(14px 14px 0 #000)'}}>{flagOf(code)}</div> : null}

        {/* Konfetti */}
        {t >= T.solve && t < T.solve + 3 ? <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {PARTS.map((p, i) => { const dd = t - T.solve, f = dd * 30, x = 540 + Math.cos(p.a) * p.v * f * .97, y = 840 + Math.sin(p.a) * p.v * f + .19 * f * f;
            return <rect key={i} x={-p.r} y={-p.r / 2} width={p.r * 2} height={p.r} fill={p.c} opacity={Math.max(0, 1 - dd / 3)} transform={`translate(${x} ${y}) rotate(${(p.s + f * .15) * 57.3})`} />; })}
        </svg> : null}

        <AbsoluteFill style={{background: '#fff', opacity: flash}} />
        <AbsoluteFill style={{boxShadow: 'inset 0 0 220px 60px rgba(255,40,40,.75)', opacity: vig}} />
      </AbsoluteFill>

      {/* Endkarte mit Pfeil aufs Profilbild (Niklas 12.10.: dick, pulsierender Ring) */}
      <AbsoluteFill style={{zIndex: 5, background: 'rgba(15,30,42,.82)', opacity: endOp, alignItems: 'center', paddingTop: 400, justifyContent: 'flex-start'}}>
        <div style={{...box({width: 880, padding: '50px 40px 56px', background: C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, textAlign: 'center'}),
          transform: `scale(${cardPop * (1 + .03 * Math.sin(ph * 2 * Math.PI * 12))})`}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, background: C.red, color: '#fff', fontWeight: 900, fontSize: 52, padding: '8px 26px', border: '6px solid #111', borderRadius: 12, boxShadow: '8px 8px 0 #000', transform: 'rotate(-3deg)'}}>
            <i style={{width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '4px solid #111', display: 'inline-block'}} />LIVE 24/7</div>
          <div style={{fontSize: 82, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-.03em', color: '#111'}}>Guess capitals live with the chat</div>
          <div style={{fontSize: 50, fontWeight: 900, background: C.y, padding: '8px 24px', border: '5px solid #111', borderRadius: 12, boxShadow: '6px 6px 0 #000', color: '#111', whiteSpace: 'nowrap'}}>TAP MY PROFILE PIC ↙ LIVE</div>
          <div style={{fontSize: 36, fontWeight: 800, color: '#333'}}>Guess the Capital · Country · Word</div>
        </div>
        <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, width: 1080, height: 1920, pointerEvents: 'none', transform: arrowK >= 1 ? `translate(${-16 * wob}px,${12 * wob}px)` : undefined}}>
          <path d={ARROW} fill="none" stroke="#000" strokeWidth={62} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arrowK} />
          <path d={ARROW} fill="none" stroke={C.red} strokeWidth={38} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - arrowK} />
          {arrowK >= 1 ? <g><path fill="#000" stroke="#000" strokeWidth={26} strokeLinejoin="round" d="M170 1494 L212 1372 L296 1470 Z" /><path fill={C.red} stroke={C.red} strokeWidth={8} strokeLinejoin="round" d="M180 1484 L218 1388 L284 1460 Z" /></g> : null}
          {arrowK >= 1 && te > T.end + .7 ? <circle cx={138} cy={1552} r={58 + 70 * ringT} fill="none" stroke={C.red} strokeWidth={12} opacity={1 - ringT} /> : null}
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
