// Telefona özgü iki şey: titreşim (Haptic) ve "soygun bitti" bildirimleri (Notify).
// iOS uygulamasında yerel köprüler kullanılır; tarayıcıda titreşim destekleniyorsa navigator.vibrate, bildirim yok.
(function () {
  const G = window.Game, E = G.E;
  const bridge = n => { try { return window.webkit.messageHandlers[n] || null; } catch (e) { return null; } };
  const getPref = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v === '1'; } catch (e) { return d; } };
  const setPref = (k, v) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) { /* yoksay */ } };

  // ---------- Titreşim ----------
  // Ses adına göre titreşim. Soygun sırasındaki ortam sesleri (maymuncuk, adım...) titreştirmez.
  const MAP = {
    tap: 'selection', phase: 'light', unlock: 'medium', door: 'light', coin: 'light', gem: 'light',
    good: 'success', success: 'success', reward: 'success', learn: 'success', levelup: 'success', legend: 'success',
    bad: 'warning', fail: 'warning', whistle: 'warning', alert: 'heavy', caught: 'error', break: 'rigid',
  };
  // Olay sesleri: varsayılan güçlü bir vuruş; bazılarının kendi ritmi var (köpek iki kez havlar).
  const PATTERN = {
    bark: [[0, 'soft'], [750, 'heavy'], [1150, 'heavy']],
    alarmbell: [[0, 'heavy'], [180, 'heavy'], [360, 'heavy']],
    glass: [[0, 'rigid'], [90, 'light']],
    whistle2: [[0, 'warning']],
    witness: [[0, 'warning']],
    guard: [[0, 'medium'], [400, 'medium']],
    keysguard: [[0, 'light'], [250, 'medium']],
    catvase: [[0, 'light'], [500, 'rigid']],
  };
  const eventSfx = new Set((E.events || []).map(e => e.sfx).filter(Boolean));
  const hb = bridge('haptic');
  const canVibrate = !hb && typeof navigator.vibrate === 'function';
  let hOn = getPref('gk_haptic', true);

  function pulse(kind) {
    if (hb) { hb.postMessage(kind); return; }
    if (canVibrate) navigator.vibrate({ selection: 8, light: 12, soft: 15, medium: 25, rigid: 30, heavy: 40, success: [20, 60, 20], warning: [35, 80, 35], error: [60, 60, 60, 60, 60] }[kind] || 15);
  }
  const Haptic = {
    get supported() { return !!hb || canVibrate; },
    get on() { return hOn; },
    set on(v) { hOn = !!v; setPref('gk_haptic', hOn); if (hOn) pulse('medium'); },
    play(kind, delayMs = 0) { if (!hOn || !this.supported) return; delayMs > 0 ? setTimeout(() => pulse(kind), delayMs) : pulse(kind); },
    // audio.js her ses çaldığında çağırır (delay saniye cinsinden)
    sound(name, delay = 0) {
      const d = Math.round(delay * 1000);
      const pat = PATTERN[name] || (MAP[name] ? [[0, MAP[name]]] : eventSfx.has(name) ? [[0, 'heavy']] : null);
      if (pat) pat.forEach(([ms, k]) => this.play(k, d + ms));
    },
  };
  window.Haptic = Haptic;

  // ---------- Bildirimler ----------
  // Soygun bir olayda durur ya da biter. Bir sonraki durma anı için tek bir bildirim planlanır;
  // soygun hızlandırılınca, olay seçilince ya da iş bitince plan kendiliğinden güncellenir.
  const nb = bridge('notify');
  let nOn = getPref('gk_notify', true), status = 'unknown', last = null;

  function plan() {
    const h = G.s.heist;
    if (!h || !h.start) return null;
    const st = G.heistStatus();
    if (!st || st.pending || st.done) return null;
    const t = G.targetById[h.id], el = (Date.now() - h.start) / 1000;
    const ev = (h.events || []).find(e => !e.done && e.at > el);
    if (ev) {
      const e = (E.events || []).find(x => x.id === ev.id) || {};
      return { at: h.start + ev.at * 1000, title: e.title || 'Beklenmedik bir şey oldu', body: `${t.name}: iş durdu, ne yapacağına sen karar ver.` };
    }
    return { at: h.start + st.total * 1000, title: `${t.name} işi bitti`, body: 'Ganimet seni bekliyor. Sonucu görmek için dokun.' };
  }
  function sync() {
    if (!nb) return;
    const p = nOn ? plan() : null;
    const key = p ? Math.round(p.at / 1000) + '|' + p.title : '';
    if (key === last) return;
    last = key;
    nb.postMessage(p ? { op: 'set', id: 'heist', at: p.at, title: p.title, body: p.body } : { op: 'clear', id: 'heist' });
  }

  const Notify = {
    get supported() { return !!nb; },
    get on() { return nOn; },
    set on(v) { nOn = !!v; setPref('gk_notify', nOn); last = null; sync(); },
    get status() { return status; },
    _status(s) { const ch = s !== status; status = s; if (ch && window.UI && UI.refresh) UI.refresh(); },
    sync, plan,
  };
  window.Notify = Notify;
  if (nb) { nb.postMessage({ op: 'status' }); setInterval(sync, 1000); }
})();
