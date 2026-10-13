import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, delayRender, continueRender, staticFile} from 'remotion';

const T = {hint: [2.0, 3.2, 4.4], rev0: 2.5, rev1: 5.5, nv0: .5, nv1: 1.5, solve: 6.0, end: 10.0, total: 15.0, intro: 1.2};
const C = {paper: '#1f3a4d', dot: '#2f5670', card: '#f8f4eb', y: '#fed439', p: '#ff7b9c', c: '#61d4f5', l: '#b6f36a', o: '#ff8a3d', sea: '#d9f1fb', red: '#ff3b3b'};
const flagOf = (c: string) => String.fromCodePoint(...[...c].map(x => 0x1F1E6 + x.charCodeAt(0) - 65));
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const R = ((i) => () => (i = (i * 16807) % 2147483647) / 2147483647)(42);
const PARTS = [...Array(140)].map((_, i) => ({a: -Math.PI / 2 + (R() - .5) * 2.6, v: 14 + R() * 18, c: ['#ff5d8d', '#7c5cff', '#2ec4a6', '#ffb627', '#5ab4ff'][i % 5], r: 6 + R() * 7, s: R() * 6}));

const box = (extra: React.CSSProperties = {}): React.CSSProperties => ({border: '6px solid #111', boxShadow: '10px 10px 0 #000', borderRadius: 18, ...extra});

type P = {code: string; country: string; cap: string; cont: string; nv: boolean; d: string; world: string; dotx: number; doty: number};

export const CountryShort: React.FC<P> = ({code, country, cap, cont, nv, d, world, dotx, doty}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const COUNTRY = country.toUpperCase(), CAP = cap;
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
  const h1 = solved ? `It's ${COUNTRY}!` : intro ? (nv ? 'NO VOWELS. NO MERCY 😬' : "BET YOU CAN'T NAME IT 😏") : 'Guess this country';
  const h1fs = Math.min(76, Math.floor(830 / (h1.length * .62)));
  const gl = intro && Math.floor(t * 24) % 3 === 0 ? 9 : intro ? 4 : 0;
  const h2 = solved ? 'Did you get it? 👇' : intro ? 'WHICH COUNTRY?' : (nv ? 'no vowels 🔴' : 'in 5 sec 🔴');
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
  const hints: [string, string, number][] = [['🌍 Continent', cont, T.hint[0]], ['📍 Location', 'MAP', T.hint[1]], ['🏛️ Capital', CAP, T.hint[2]]];

  // ---- Kacheln ----
  const words = COUNTRY.split(' '), letters = COUNTRY.replace(/ /g, '');
  const nw = Math.max(...words.map(w => w.length)), L = letters.length;
  let sz = Math.min(104, Math.floor((880 - (L - 1) * 10 - (words.length - 1) * 22) / L)); if (sz < 58) sz = Math.min(80, Math.floor((880 - (nw - 1) * 10) / nw));
  const r0 = nv ? T.nv0 : T.rev0, r1 = nv ? T.nv1 : T.rev1;
  const order = nv ? [...letters].map((c, i) => 'AEIOU'.includes(c) ? -1 : i).filter(i => i >= 0)
    : [...letters].map((_, i) => i).sort((a, b) => ((a * 7919) % 13) - ((b * 7919) % 13)).slice(0, Math.floor(L / 2));
  const nrev = t < r0 ? 0 : Math.min(order.length, Math.floor((t - r0) / ((r1 - r0) / Math.max(1, order.length))) + 1);

  // ---- Karte ----
  const mapPunch = spring({frame: Math.round(t * fps), fps, config: {damping: 12, stiffness: 200, mass: .8}});
  const mapScale = (.7 + .3 * mapPunch) * (1 + .02 * Math.sin(ph * 2 * Math.PI * 5));
  const u = vb ? vb[2] / 788 : 1;
  const mp = (t % 1.4) / 1.4;

  // ---- Endkarte ----
  const endOp = back ? (T.total - frame / fps) / .4 : t < T.end ? 0 : clamp((t - T.end) / .3);
  const te = frame / fps;
  const cardPop = back ? 1 : .7 + .3 * spring({frame: Math.round((te - T.end) * fps), fps, config: {damping: 10, stiffness: 190, mass: .7}});
  const arrowK = clamp((te - T.end - .3) / .4);
  const wob = arrowK >= 1 ? Math.abs(Math.sin(te * 7)) : 0;
  const ringT = ((te - T.end - .7) % .8) / .8;
  // Generischer Block-Pfeil (Niklas 13.10.): kurz, breit, pulsierend, zeigt nur grob nach links unten aufs Profilbild
  const ang = 144;                                                        // Grad, 0 = nach rechts
  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  const pulse = arrowK >= 1 ? Math.abs(Math.sin((te - T.end) * 5.5)) : 0;
  const arrowS = (.55 + .45 * ease(arrowK)) * (1 + .14 * pulse);
  const nudge = 26 * pulse;
  const ux = Math.cos(ang * Math.PI / 180), uy = Math.sin(ang * Math.PI / 180);
  const BLOCK = 'M150 0 L20 -112 L20 -58 L-130 -58 L-130 58 L20 58 L20 112 Z';

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
          <div style={{...box(), fontSize: Math.min(72, Math.floor(830 / (h2.length * .62))), fontWeight: 900, color: '#111', textTransform: 'uppercase', letterSpacing: '-.02em', lineHeight: 1, whiteSpace: 'nowrap', background: C.p,
            padding: '8px 24px 12px', transform: `rotate(1.5deg) scale(${solved ? 1 : .6 + .4 * clamp(introIn)})`}}>{h2}</div>
        </div>

        {/* Karte mit Umriss */}
        <div style={{...box({position: 'absolute', top: 605, left: 60, width: 880, height: 470, overflow: 'hidden', background: C.sea,
          backgroundImage: 'radial-gradient(#b4e2f3 2px,transparent 2px)', backgroundSize: '24px 24px', backgroundPosition: `${-ph * 480}px ${ph * 240}px`})}}>
          <svg viewBox={vb ? vb.join(' ') : '0 0 788 410'} style={{position: 'absolute', left: 40, top: 24, width: 788, height: 410, overflow: 'visible', transform: `scale(${slam * mapScale})`}}>
            <path d={d} transform="translate(10 10)" fill="#000" />
            <path ref={pathRef} d={d} fill={solved ? C.l : C.y} stroke="#111" strokeWidth={5} strokeLinejoin="round" />
          </svg>
          {/* kleine Flagge in der Ecke */}
          <div style={{...box({position: 'absolute', left: 24, top: 24, fontSize: 150, lineHeight: 1, background: '#fff', borderRadius: 16, boxShadow: '8px 8px 0 #000', padding: '6px 20px', opacity: solved ? 1 : 0, transform: `rotate(-5deg) scale(${solved ? .3 + .7 * Math.min(1.15, pop(T.solve)) : 0})`})}}>{flagOf(code)}</div>
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
              {o && v === 'MAP' ? <svg viewBox="0 0 360 180" style={{display: 'block', width: '100%', height: 96, background: '#fff', border: '3px solid #111', borderRadius: 6, marginTop: 4}}><path d={world} fill="#c9c2b4" /><circle cx={dotx} cy={doty} r={4 + 16 * mp} fill="none" stroke={C.red} strokeWidth={4} opacity={1 - mp} /><circle cx={dotx} cy={doty} r={9} fill={C.red} stroke="#111" strokeWidth={2.5} /></svg>
                : <div style={{fontSize: o && v.length > 9 ? Math.max(24, Math.floor(40 * 9 / v.length)) : 40, fontWeight: 900, overflow: 'hidden', textOverflow: 'ellipsis'}}>{o ? v : '🔒'}</div>}</div>;
          })}
        </div>

        {/* Buchstaben */}
        <div style={{position: 'absolute', top: 1268, left: 60, width: 880, height: 118, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: '10px 22px'}}>
          {(() => { let k = 0; return words.map((w, wi) => <div key={wi} style={{display: 'flex', gap: 10}}>{[...w].map(ch => {
            const i = k++, ord = order.indexOf(i), on = solved || (ord >= 0 && ord < nrev);
            const at = solved ? T.solve + i * .05 : r0 + ord * ((r1 - r0) / Math.max(1, order.length));
            return <div key={i} style={{width: sz, height: Math.round(sz * 1.12), fontSize: Math.round(sz * .6), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, background: solved ? C.l : on ? C.y : '#fff', border: '5px solid #111', borderRadius: 12, boxShadow: '5px 5px 0 #000', color: '#111', transform: on ? `scale(${.75 + .25 * Math.min(1.15, pop(at))})` : 'none'}}>{on ? ch : ''}</div>;
          })}</div>); })()}
        </div>

        {/* Zeitbalken + Aufruf */}
        <div style={{position: 'absolute', top: 1400, left: 70, width: 860, height: 30, background: C.card, border: '5px solid #111', borderRadius: 10, boxShadow: '6px 6px 0 #000', overflow: 'hidden'}}>
          <div style={{height: '100%', width: `${solved ? 0 : Math.max(0, 1 - (t - 1) / 5) * 100}%`, background: C.p}} /></div>
        <div style={{position: 'absolute', top: 1446, left: 60, width: 880, textAlign: 'center', fontSize: 40, fontWeight: 900, color: '#fff'}}>💬 <span style={{background: C.y, color: '#111', padding: '2px 14px', border: '4px solid #111', borderRadius: 8}}>comment</span> your answer!</div>

        {/* Konfetti */}
        {t >= T.solve && t < T.solve + 3 ? <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {PARTS.map((p, i) => { const dd = t - T.solve, f = dd * 30, x = 540 + Math.cos(p.a) * p.v * f * .97, y = 840 + Math.sin(p.a) * p.v * f + .19 * f * f;
            return <rect key={i} x={-p.r} y={-p.r / 2} width={p.r * 2} height={p.r} fill={p.c} opacity={Math.max(0, 1 - dd / 3)} transform={`translate(${x} ${y}) rotate(${(p.s + f * .15) * 57.3})`} />; })}
        </svg> : null}

        <AbsoluteFill style={{background: '#fff', opacity: flash}} />
        <AbsoluteFill style={{boxShadow: 'inset 0 0 220px 60px rgba(255,40,40,.75)', opacity: vig}} />
      </AbsoluteFill>

      {/* Endkarte mit Pfeil aufs Profilbild (Niklas 12.10.: dick, pulsierender Ring) */}
      <AbsoluteFill style={{zIndex: 5, background: 'rgba(15,30,42,.94)', opacity: endOp, alignItems: 'center', paddingTop: 400, justifyContent: 'flex-start'}}>
        <div style={{...box({width: 880, padding: '50px 40px 56px', background: C.card, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, textAlign: 'center'}),
          transform: `scale(${cardPop * (1 + .03 * Math.sin(ph * 2 * Math.PI * 12))})`}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 14, background: C.red, color: '#fff', fontWeight: 900, fontSize: 52, padding: '8px 26px', border: '6px solid #111', borderRadius: 12, boxShadow: '8px 8px 0 #000', transform: 'rotate(-3deg)'}}>
            <i style={{width: 22, height: 22, borderRadius: '50%', background: '#fff', border: '4px solid #111', display: 'inline-block'}} />LIVE 24/7</div>
          <div style={{fontSize: 82, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-.03em', color: '#111'}}>Play live with the chat</div>
          <div style={{fontSize: 50, fontWeight: 900, background: C.y, padding: '8px 24px', border: '5px solid #111', borderRadius: 12, boxShadow: '6px 6px 0 #000', color: '#111', whiteSpace: 'nowrap'}}>TAP MY PROFILE PIC ↙ LIVE</div>
          <div style={{fontSize: 36, fontWeight: 800, color: '#333'}}>Guess the Country · Word · Capital</div>
        </div>
        <svg viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, width: 1080, height: 1920, pointerEvents: 'none', overflow: 'visible'}}>
          <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff6a5c" /><stop offset="1" stopColor="#e01616" /></linearGradient></defs>
          <g transform={`translate(${330 + ux * nudge} ${1415 + uy * nudge}) rotate(${ang}) scale(${arrowS})`} opacity={clamp(arrowK * 3)}>
            <path d={BLOCK} transform="translate(10 12)" fill="#000" stroke="#000" strokeWidth={34} strokeLinejoin="round" opacity={.5} />
            <path d={BLOCK} fill="#fff" stroke="#fff" strokeWidth={50} strokeLinejoin="round" />
            <path d={BLOCK} fill="#111" stroke="#111" strokeWidth={34} strokeLinejoin="round" />
            <path d={BLOCK} fill="url(#ag)" stroke="url(#ag)" strokeWidth={14} strokeLinejoin="round" />
          </g>
        </svg>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
