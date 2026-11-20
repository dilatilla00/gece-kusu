// Ses: efektler, soygun aşamalarına göre ortam sesleri ve arka plan müziği.
// Hiç ses dosyası yok; her şey tarayıcının ses motoruyla (Web Audio) burada üretilir.
//
//   Sound.unlock()          ilk dokunuşta çağrılır (tarayıcılar sesi ancak dokunuştan sonra açar)
//   Sound.play('coin')      tek seferlik efekt
//   Sound.ambience(faz)     0 sessiz giriş, 1 soygun, 2 kaçış, null sessizlik
//   Sound.sfx / Sound.music açık-kapalı tercihleri (cihazda hatırlanır)
window.Sound = (function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;

  const pref = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch (e) { return d; } };
  const setPref = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) { /* yoksay */ } };
  let sfxOn = pref('gk_sfx', true), musicOn = pref('gk_music', true);

  function init() {
    if (ctx || !AC) return !!ctx;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    // 1 saniyelik beyaz gürültü: tıkırtı, hışırtı, adım gibi seslerin hammaddesi
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (musicOn) startMusic();
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  // ---- Yapı taşları ----
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, dec, sustain = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(sustain, t + a + dec);
  }
  function tone(freq, t, dur, { type = 'sine', vol = 0.3, a = 0.005, out = sfxBus, slide = 0, detune = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    env(g, t, a, vol, dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + a + dur + 0.05);
    return o;
  }
  function noise(t, dur, { type = 'bandpass', f = 2000, q = 1, vol = 0.3, a = 0.002, out = sfxBus, sweep = 0 } = {}) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (sweep) fl.frequency.exponentialRampToValueAtTime(f * sweep, t + dur);
    env(g, t, a, vol, dur);
    s.connect(fl).connect(g).connect(out);
    s.start(t, Math.random() * 0.5); s.stop(t + a + dur + 0.05);
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- Efektler ----
  const FX = {
    tap(t) { tone(1300, t, 0.035, { type: 'triangle', vol: 0.08 }); },
    // Maymuncuk: ince metal tıkırtılar, arada bir pim oturma "tok" sesi
    pick(t) {
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const tt = t + i * rnd(0.07, 0.16);
        noise(tt, 0.012, { f: rnd(3500, 6000), q: 8, vol: 0.22 });
        tone(rnd(2500, 3800), tt, 0.02, { type: 'square', vol: 0.025 });
      }
      if (Math.random() < 0.6) noise(t + n * 0.13 + 0.05, 0.05, { type: 'lowpass', f: 380, q: 2, vol: 0.35 });
    },
    // Anahtar destesi şıngırtısı
    keys(t) {
      for (let i = 0; i < 9; i++) {
        const tt = t + rnd(0, 0.35), f = rnd(2600, 6200);
        tone(f, tt, rnd(0.05, 0.14), { type: 'sine', vol: 0.06 });
        tone(f * 1.51, tt, 0.05, { type: 'sine', vol: 0.025 });
        noise(tt, 0.01, { f: 7000, q: 4, vol: 0.06 });
      }
    },
    // Kilit açılma: iki tık ve tok bir "klak"
    unlock(t) {
      noise(t, 0.015, { f: 4200, q: 6, vol: 0.25 });
      noise(t + 0.09, 0.015, { f: 3800, q: 6, vol: 0.25 });
      noise(t + 0.22, 0.08, { type: 'lowpass', f: 300, q: 3, vol: 0.5 });
      tone(140, t + 0.22, 0.08, { type: 'square', vol: 0.05 });
    },
    // Kapı gıcırtısı
    door(t) {
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(170, t); o.frequency.linearRampToValueAtTime(260, t + 0.5); o.frequency.linearRampToValueAtTime(140, t + 1.1);
      lfo.frequency.value = 23; lg.gain.value = 18; lfo.connect(lg).connect(o.frequency);
      fl.type = 'bandpass'; fl.frequency.value = 1100; fl.Q.value = 6;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      o.connect(fl).connect(g).connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + 1.3); lfo.stop(t + 1.3);
    },
    // Soygun: çekmece kayması, kâğıt hışırtısı, bozuk para
    drawer(t) { noise(t, 0.45, { f: 600, q: 1.5, vol: 0.18, sweep: 2.2 }); noise(t + 0.45, 0.06, { type: 'lowpass', f: 250, vol: 0.3 }); },
    rustle(t) { for (let i = 0; i < 4; i++) noise(t + i * rnd(0.05, 0.12), rnd(0.05, 0.12), { type: 'highpass', f: 3000, vol: 0.09 }); },
    clink(t) { tone(rnd(2200, 3200), t, 0.18, { type: 'triangle', vol: 0.07 }); tone(rnd(3400, 4600), t + 0.05, 0.12, { type: 'triangle', vol: 0.04 }); },
    // Kaçış: koşan adımlar
    steps(t) { for (let i = 0; i < 6; i++) { const tt = t + i * 0.19; noise(tt, 0.06, { type: 'lowpass', f: 220, q: 1, vol: 0.35 }); tone(70, tt, 0.06, { vol: 0.08 }); } },
    // Aşama değişimi: yumuşak iki nota
    phase(t) { tone(523, t, 0.25, { type: 'triangle', vol: 0.09 }); tone(784, t + 0.1, 0.35, { type: 'triangle', vol: 0.08 }); },
    // Olay: gerilim
    alert(t) { tone(196, t, 0.5, { type: 'triangle', vol: 0.18 }); tone(208, t + 0.02, 0.5, { type: 'triangle', vol: 0.12 }); tone(98, t, 0.7, { vol: 0.15 }); },
    good(t) { tone(660, t, 0.12, { type: 'triangle', vol: 0.1 }); tone(990, t + 0.08, 0.2, { type: 'triangle', vol: 0.09 }); },
    bad(t) { tone(330, t, 0.25, { type: 'triangle', vol: 0.1, slide: 0.8 }); },
    // Başarı: altın şıngırtısı ve küçük bir arpej
    success(t) {
      for (let i = 0; i < 8; i++) FX.clink(t + i * rnd(0.04, 0.09));
      [523, 659, 784, 1047].forEach((f, i) => tone(f, t + 0.35 + i * 0.09, 0.4, { type: 'triangle', vol: 0.08 }));
    },
    legend(t) { FX.success(t); [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + 0.9 + i * 0.12, 0.8, { type: 'sine', vol: 0.09 })); },
    // Bekçi düdüğü (titreşimli)
    whistle(t, len = 0.7) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 2350; lfo.frequency.value = 28; lg.gain.value = 120;
      lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.03); g.gain.setValueAtTime(0.14, t + len - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(sfxBus); o.start(t); lfo.start(t); o.stop(t + len + 0.05); lfo.stop(t + len + 0.05);
      noise(t, len, { f: 2400, q: 3, vol: 0.03 });
    },
    fail(t) { tone(392, t, 0.3, { type: 'triangle', vol: 0.1 }); tone(311, t + 0.25, 0.5, { type: 'triangle', vol: 0.1 }); },
    caught(t) { FX.whistle(t, 0.5); FX.whistle(t + 0.6, 0.9); noise(t + 1.7, 0.12, { type: 'lowpass', f: 200, q: 2, vol: 0.6 }); tone(90, t + 1.7, 0.2, { type: 'square', vol: 0.06 }); },
    levelup(t) { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.08, i === 4 ? 0.6 : 0.18, { type: 'triangle', vol: 0.1 })); },
    coin(t) { tone(1568, t, 0.1, { type: 'triangle', vol: 0.09 }); tone(2093, t + 0.07, 0.22, { type: 'triangle', vol: 0.08 }); },
    gem(t) { for (let i = 0; i < 6; i++) tone(1800 + i * 380, t + i * 0.04, 0.25, { type: 'sine', vol: 0.05 }); },
    reward(t) { FX.coin(t); FX.gem(t + 0.12); },
    learn(t) { tone(587, t, 0.2, { type: 'triangle', vol: 0.09 }); tone(880, t + 0.1, 0.35, { type: 'triangle', vol: 0.09 }); },
    // ---- Olay sesleri ----
    // Köpek: hırlama ve iki havlama
    bark(t) {
      const growl = ctx.createOscillator(), gf = ctx.createBiquadFilter(), gg = ctx.createGain(), am = ctx.createOscillator(), ag = ctx.createGain();
      growl.type = 'sawtooth'; growl.frequency.value = 85; am.frequency.value = 27; ag.gain.value = 0.06;
      gf.type = 'lowpass'; gf.frequency.value = 500;
      gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.09, t + 0.15); gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      am.connect(ag).connect(gg.gain); growl.connect(gf).connect(gg).connect(sfxBus);
      growl.start(t); am.start(t); growl.stop(t + 0.75); am.stop(t + 0.75);
      [t + 0.75, t + 1.15].forEach((bt, i) => {
        const o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(i ? 470 : 430, bt); o.frequency.exponentialRampToValueAtTime(230, bt + 0.16);
        f1.type = 'bandpass'; f1.frequency.value = 750; f1.Q.value = 3; f2.type = 'bandpass'; f2.frequency.value = 1600; f2.Q.value = 4;
        g.gain.setValueAtTime(0.0001, bt); g.gain.exponentialRampToValueAtTime(0.5, bt + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, bt + 0.2);
        o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(sfxBus); o.start(bt); o.stop(bt + 0.25);
        noise(bt, 0.12, { f: 1100, q: 1.5, vol: 0.25 });
      });
    },
    // Kilit sıkıştı: takırtı ve metal sürtünmesi
    jam(t) {
      for (let i = 0; i < 7; i++) noise(t + i * rnd(0.04, 0.08), 0.015, { f: rnd(3000, 5000), q: 7, vol: 0.25 });
      noise(t + 0.5, 0.35, { f: 2600, q: 12, vol: 0.12, sweep: 0.7 });
      tone(1900, t + 0.5, 0.35, { type: 'sawtooth', vol: 0.015, slide: 0.85 });
    },
    // Bekçi: ıslıkla bir melodi ve yavaş, ağır adımlar
    guard(t) {
      [1175, 1319, 1175, 988, 1047].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), v = ctx.createOscillator(), vg = ctx.createGain();
        const bt = t + i * 0.22; o.type = 'sine'; o.frequency.value = f; v.frequency.value = 6; vg.gain.value = 12;
        v.connect(vg).connect(o.frequency); env(g, bt, 0.03, 0.07, 0.2); o.connect(g).connect(sfxBus);
        o.start(bt); v.start(bt); o.stop(bt + 0.3); v.stop(bt + 0.3);
      });
      for (let i = 0; i < 4; i++) { const st = t + 1.3 + i * 0.45; noise(st, 0.08, { type: 'lowpass', f: 180, q: 1, vol: 0.4 }); tone(60, st, 0.08, { vol: 0.08 }); }
    },
    // Üst kattan ses: döşeme gıcırtısı ve adımlar
    creakup(t) {
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(140, t + 0.5);
      fl.type = 'bandpass'; fl.frequency.value = 700; fl.Q.value = 8;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.14, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(fl).connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.65);
      for (let i = 0; i < 3; i++) noise(t + 0.9 + i * 0.6, 0.1, { type: 'lowpass', f: 150, q: 1, vol: 0.35 });
    },
    // Gizli kasa: şifre çarkı tıkırtıları ve tok bir kilit
    safe(t) {
      for (let i = 0; i < 14; i++) noise(t + i * 0.045, 0.008, { f: 4500, q: 10, vol: 0.2 });
      for (let i = 0; i < 8; i++) noise(t + 0.75 + i * 0.06, 0.008, { f: 3800, q: 10, vol: 0.2 });
      noise(t + 1.3, 0.09, { type: 'lowpass', f: 260, q: 3, vol: 0.45 });
    },
    // Değerli tablo: parıltı
    sparkle(t) { [1568, 1976, 2349, 2637, 3136].forEach((f, i) => tone(f, t + i * 0.07, 0.5, { type: 'sine', vol: 0.05 })); },
    // Kedi: miyav ve sallanan porselen
    catvase(t) {
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(820, t + 0.25); o.frequency.linearRampToValueAtTime(560, t + 0.65);
      fl.type = 'bandpass'; fl.Q.value = 5; fl.frequency.setValueAtTime(1700, t); fl.frequency.linearRampToValueAtTime(900, t + 0.65);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(fl).connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.75);
      for (let i = 0; i < 5; i++) tone(rnd(2800, 3600), t + 0.9 + i * 0.12, 0.08, { type: 'triangle', vol: 0.05 });
    },
    // Mektuplar: kâğıt hışırtısı ve mühür çıtırtısı
    paper(t) { FX.rustle(t); FX.rustle(t + 0.35); noise(t + 0.8, 0.03, { type: 'highpass', f: 2500, vol: 0.25 }); },
    // Alarm zili
    alarmbell(t) {
      for (let i = 0; i < 26; i++) { const bt = t + i * 0.055; tone(1400, bt, 0.05, { type: 'sine', vol: 0.09 }); tone(4340, bt, 0.03, { type: 'sine', vol: 0.03 }); }
    },
    // Düdük: iki kez
    whistle2(t) { FX.whistle(t, 0.35); FX.whistle(t + 0.5, 0.7); },
    // Kapı kilitli: kol takırtısı
    handle(t) { for (let i = 0; i < 4; i++) { const bt = t + i * 0.18; noise(bt, 0.05, { type: 'lowpass', f: 600, q: 2, vol: 0.35 }); noise(bt + 0.02, 0.02, { f: 3000, q: 5, vol: 0.12 }); } },
    // Tanık: pencere gıcırtısı ve şaşkın bir nefes
    witness(t) {
      FX.door(t);
      noise(t + 1.0, 0.25, { f: 900, q: 2, vol: 0.12, sweep: 1.8 });
      tone(320, t + 1.0, 0.25, { type: 'triangle', vol: 0.05, slide: 1.3 });
    },
    // Alet kırılması: çatırtı
    break(t) { noise(t, 0.08, { type: 'highpass', f: 1500, vol: 0.4 }); noise(t + 0.03, 0.2, { type: 'lowpass', f: 900, vol: 0.3 }); tone(180, t, 0.15, { type: 'square', vol: 0.06, slide: 0.5 }); },
  };

  function play(name, delay = 0) {
    if (api.onplay) api.onplay(name); // testler için
    if (!sfxOn || !ctx || ctx.state !== 'running' || !FX[name]) return;
    try { FX[name](now() + 0.01 + delay); } catch (e) { /* ses hatası oyunu durdurmasın */ }
  }

  // ---- Ortam sesleri: soygun aşamasına göre birkaç saniyede bir ----
  let amb = null, ambTimer = null;
  const AMB = { 0: ['pick', 'pick', 'keys', 'pick', 'unlock'], 1: ['drawer', 'rustle', 'clink', 'rustle'], 2: ['steps'] };
  function ambience(ph) {
    if (ph === amb) return;
    amb = ph; clearTimeout(ambTimer);
    if (ph == null || !AMB[ph]) return;
    const loop = () => {
      if (amb !== ph) return;
      const list = AMB[ph];
      play(list[Math.floor(Math.random() * list.length)]);
      ambTimer = setTimeout(loop, ph === 2 ? rnd(1400, 2200) : rnd(1600, 3200));
    };
    ambTimer = setTimeout(loop, 500);
  }

  // ---- Müzik ----
  // İki parça var: menüde 1920'ler havasında sakin bir caz, soygunda kısık bir gerilim müziği.
  // Her parça kendi ses düğümüne (mOut) çalar; geçişte eskisi kısılır, yenisi açılır.
  const midi = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicTimer = null, nextBar = 0, bar = 0, kind = null, mOut = null, drone = null, inHeist = false;

  // Menü: Dm7 – G7 – Cmaj7 – A7 (ii–V–I–VI), salınımlı (swing) yürüyen bas, fırça davul.
  const BPM = 88, BEAT = 60 / BPM;
  const CHORDS = [
    { bass: [38, 41, 45, 48], notes: [62, 65, 69, 72] },
    { bass: [43, 47, 50, 53], notes: [59, 62, 65, 67] },
    { bass: [36, 40, 43, 47], notes: [60, 64, 67, 71] },
    { bass: [45, 49, 52, 55], notes: [61, 64, 67, 69] },
  ];
  const MEL = [[74, 72, 69, -1], [71, -1, 67, 65], [64, 67, 71, 72], [73, -1, 69, -1]];
  function piano(m, t, dur, vol) {
    const f = midi(m);
    tone(f, t, dur, { type: 'sine', vol, a: 0.01, out: mOut });
    tone(f * 2, t, dur * 0.5, { type: 'sine', vol: vol * 0.25, a: 0.01, out: mOut });
    tone(f * 3, t, dur * 0.25, { type: 'triangle', vol: vol * 0.08, a: 0.005, out: mOut });
  }
  function menuBar(t, i) {
    const c = CHORDS[i % 4];
    for (let b = 0; b < 4; b++) {
      const bt = t + b * BEAT;
      tone(midi(c.bass[b]), bt, BEAT * 0.9, { type: 'triangle', vol: 0.16, a: 0.01, out: mOut });
      if (b === 1 || b === 3) c.notes.forEach(n => piano(n, bt + BEAT * 0.66, BEAT * 1.2, 0.035));
      noise(bt, 0.12, { type: 'highpass', f: 5000, vol: b % 2 ? 0.05 : 0.025, out: mOut });
      noise(bt + BEAT * 0.66, 0.06, { type: 'highpass', f: 7000, vol: 0.02, out: mOut });
    }
    const POS = [0, 1.66, 2, 3.66]; // salınımlı nota yerleri, vuruş cinsinden
    if (i % 2 === 0) MEL[(i / 2) % 4].forEach((m, k) => { if (m > 0) piano(m, t + POS[k] * BEAT, BEAT * 0.9, 0.05); });
  }

  // Soygun: alçak uğultu, kalp atışı gibi bas, minör tonda kesik notalar, ara sıra tiz bir titreme.
  const TBPM = 76, TBEAT = 60 / TBPM;
  const PIZZ = [[50, -1, 53, -1], [52, -1, 49, -1], [50, -1, 53, 55], [56, -1, 55, 52]]; // Re minör, gergin
  function startDrone() {
    const t = now(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = 4;
    lfo.frequency.value = 0.08; lg.gain.value = 140; lfo.connect(lg).connect(lp.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 2.5);
    const oscs = [[73.42, 'sawtooth', 0], [73.42, 'sawtooth', 9], [36.71, 'sine', 0], [110, 'triangle', -6]].map(([f, ty, dt]) => {
      const o = ctx.createOscillator(); o.type = ty; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); return o;
    });
    lp.connect(g).connect(mOut); lfo.start(t);
    drone = { g, oscs: [...oscs, lfo] };
  }
  function stopDrone() {
    if (!drone) return;
    const d = drone, t = now(); drone = null;
    d.g.gain.cancelScheduledValues(t); d.g.gain.setValueAtTime(d.g.gain.value, t); d.g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    d.oscs.forEach(o => o.stop(t + 0.9));
  }
  function heistBar(t, i) {
    for (let b = 0; b < 4; b++) {
      const bt = t + b * TBEAT;
      // kalp atışı: "güm-güm"
      if (b % 2 === 0) { tone(55, bt, 0.16, { vol: 0.3, a: 0.004, out: mOut }); tone(49, bt + 0.24, 0.14, { vol: 0.2, a: 0.004, out: mOut }); }
      // kesik (pizzicato) notalar, vuruş arası
      const m = PIZZ[i % 4][b];
      if (m > 0) tone(midi(m), bt + TBEAT * 0.5, 0.18, { type: 'triangle', vol: 0.07, a: 0.003, out: mOut });
      // çok hafif saat tik-takı
      noise(bt, 0.02, { f: 5200, q: 6, vol: 0.03, out: mOut });
    }
    // her dört ölçüde bir tiz, titreyen uyumsuz ses
    if (i % 4 === 3) [74, 80].forEach(m => {
      const o = ctx.createOscillator(), g = ctx.createGain(), tr = ctx.createOscillator(), tg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = midi(m); tr.frequency.value = 9; tg.gain.value = 0.02;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.025, t + 1.2); g.gain.exponentialRampToValueAtTime(0.0001, t + TBEAT * 4);
      tr.connect(tg).connect(g.gain); o.connect(g).connect(mOut);
      o.start(t); tr.start(t); o.stop(t + TBEAT * 4 + 0.1); tr.stop(t + TBEAT * 4 + 0.1);
    });
  }

  function musicLoop() {
    const len = kind === 'heist' ? TBEAT * 4 : BEAT * 4, sched = kind === 'heist' ? heistBar : menuBar;
    while (nextBar < now() + 1.5) { sched(nextBar, bar++); nextBar += len; }
    musicTimer = setTimeout(musicLoop, 400);
  }
  // Duruma uygun parçayı çal (menü ya da soygun); zaten çalıyorsa dokunma.
  function startMusic() {
    if (!ctx || !musicOn) return;
    const want = inHeist ? 'heist' : 'menu';
    if (kind === want && musicTimer) return;
    stopMusic();
    kind = want;
    mOut = ctx.createGain(); mOut.connect(musicBus);
    const t = now();
    mOut.gain.setValueAtTime(0.0001, t); mOut.gain.exponentialRampToValueAtTime(want === 'heist' ? 0.9 : 0.55, t + (want === 'heist' ? 1.5 : 2));
    musicBus.gain.cancelScheduledValues(t); musicBus.gain.setValueAtTime(1, t);
    nextBar = t + 0.5; bar = 0;
    if (want === 'heist') startDrone();
    musicLoop();
  }
  function stopMusic() {
    if (!ctx) return;
    clearTimeout(musicTimer); musicTimer = null; kind = null;
    stopDrone();
    if (mOut) {
      const old = mOut, t = now(); mOut = null;
      old.gain.cancelScheduledValues(t); old.gain.setValueAtTime(Math.max(0.0001, old.gain.value), t); old.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      setTimeout(() => old.disconnect(), 2500); // önceden sıraya girmiş notalar sessizce bitsin
    }
  }

  const api = {
    unlock, play, ambience, onplay: null,
    get sfx() { return sfxOn; },
    set sfx(v) { sfxOn = !!v; setPref('gk_sfx', sfxOn); if (!sfxOn) ambience(null); },
    get music() { return musicOn; },
    set music(v) { musicOn = !!v; setPref('gk_music', musicOn); if (musicOn) { unlock(); startMusic(); } else stopMusic(); },
    // Soygun sürerken müzik susar, sadece soygun sesleri duyulur; iş bitince müzik geri gelir.
    heist(on) {
      on = !!on; if (on === inHeist) return;
      inHeist = on;
      if (musicOn) startMusic(); // menü müziği ile gerilim müziği arasında geçiş
    },
    has: name => !!FX[name],
    get running() { return !!ctx && ctx.state === 'running'; },
    get playingMusic() { return !!musicTimer; },
    get musicKind() { return musicTimer ? kind : null; },
  };
  return api;
})();
