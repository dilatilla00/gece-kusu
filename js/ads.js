// Ödüllü reklamlar. Oyun reklam sağlayıcısını bilmez; sadece Ads.enabled() ve Ads.show(yer) kullanır.
//
// Modlar:
//   'off'  : reklam düğmeleri hiç görünmez (ilk App Store sürümü bu modda çıkar)
//   'test' : sahte bir reklam penceresi açılır; düğmeleri ve ödülleri denemek için
//   'on'   : gerçek reklam. iOS uygulamasında yerel tarafa (AdMob) "ads" mesajıyla sorulur.
//
// Mod seçimi: aşağıdaki MODE, ya da adres çubuğunda ?ads=test / ?ads=off (bu cihazda hatırlanır).
window.Ads = (function () {
  const MODE = 'off';

  let mode = MODE;
  try {
    const q = new URLSearchParams(location.search).get('ads');
    if (q) localStorage.setItem('gk_ads', q);
    mode = localStorage.getItem('gk_ads') || MODE;
  } catch (e) { /* depolama yoksa varsayılan */ }

  const bridge = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ads;
  const enabled = () => mode === 'test' || (mode === 'on' && !!bridge);

  // Yerel taraf reklam bitince window.Ads._done(id, true/false) çağırır.
  const pending = {};
  let seq = 0;
  function _done(id, ok) { const f = pending[id]; if (f) { delete pending[id]; f(!!ok); } }

  const NAMES = { rush: 'Soygunu hızlandır', double: 'Ganimeti ikiye katla', heat: 'Takibi düşür', gem: 'Bedava elmas', skip: 'Görev değiştir' };
  function testAd(placement) {
    return new Promise(resolve => {
      const host = document.querySelector('.game') || document.body;
      const el = document.createElement('div');
      el.className = 'adtest';
      el.innerHTML = `<div class="adbox"><div class="adtag">TEST REKLAMI</div><div class="adttl">Burada bir reklam oynayacak</div>
        <div class="adsub">Ödül: ${NAMES[placement] || placement}</div><div class="adcount">3</div><button class="b2 adclose" disabled>Bekle…</button><button class="linkbtn adskip">Vazgeç</button></div>`;
      host.appendChild(el);
      let n = 3;
      const tick = setInterval(() => {
        n--; el.querySelector('.adcount').textContent = n > 0 ? n : '✓';
        if (n <= 0) { clearInterval(tick); const b = el.querySelector('.adclose'); b.disabled = false; b.textContent = 'Ödülü al'; }
      }, 1000);
      const finish = ok => { clearInterval(tick); el.remove(); resolve(ok); };
      el.querySelector('.adclose').addEventListener('click', e => { e.stopPropagation(); finish(true); });
      el.querySelector('.adskip').addEventListener('click', e => { e.stopPropagation(); finish(false); });
    });
  }

  function show(placement) {
    if (!enabled()) return Promise.resolve(false);
    if (mode === 'test') return testAd(placement);
    return new Promise(resolve => {
      const id = ++seq; pending[id] = resolve;
      try { bridge.postMessage({ id, placement }); } catch (e) { _done(id, false); }
    });
  }

  return { enabled, show, _done, get mode() { return mode; } };
})();
