// Oyun motoru. Döneme bağlı hiçbir isim veya metin içermez; her şeyi window.ERA'dan okur.
(function () {
  const E = window.ERA;
  const KEY = 'gk_save_' + E.id;
  const by = list => Object.fromEntries(list.map(x => [x.id, x]));
  const tierById = by(E.tiers), targetById = by(E.targets), skillById = by(E.skills), toolById = by(E.tools), crewById = by(E.crew || []);
  const M = E.market, itemById = by(M ? M.items : []);
  const MA = E.mastery, masteryById = by(MA ? MA.items : []);
  const SEC = E.security || { penalty: 0, loot: 0, xp: 0, decayDays: 1e9, label: '' };

  const CITIES = E.cities || [{ id: 'main', name: '', lv: 1 }];
  const homeCity = CITIES[0].id, cityById = by(CITIES);
  const cityOf = t => t.city || homeCity;
  const COL = E.collection, colItemById = by(COL ? COL.items : []), colSetById = by(COL ? COL.sets : []);

  let S;

  function fresh() {
    return {
      v: 1, day: 0, lv: 1, xp: 0, money: E.start.money, gems: E.start.gems, fame: 0, heat: 0, sp: 1,
      skills: [], tools: [], crew: {}, mastery: {}, sec: {}, legends: {},
      city: homeCity, cities: [homeCity], heatBy: {}, collection: {}, setsDone: {}, legendOffer: null, buffs: [], market: null, heist: null, scouted: {}, cooldown: {}, streak: 0,
      stats: { robs: 0, ok: 0, fail: 0, caught: 0, loot: 0, scouts: 0 },
      quest: { i: 0, prog: 0 },
      news: [{ day: 0, kind: 'intro', h: E.news.intro.h, b: E.news.intro.b }],
      won: false,
    };
  }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (d && d.v === 1) { S = Object.assign(fresh(), d); return; }
    } catch (e) { /* kayıt okunamazsa yeni oyun */ }
    S = fresh();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* tarayıcı izin vermezse sessizce geç */ } }
  function reset() { S = fresh(); save(); }
  // Tek seferlik şeyleri (örn. karşılama penceresi) hatırla
  function markSeen(key) { S.seen = S.seen || {}; S.seen[key] = true; save(); }

  const LL = E.lateLevel || { from: 1e9, growth: 0 };
  const xpCap = lv => Math.round(60 * Math.pow(lv, 1.65) * (lv > LL.from ? 1 + (lv - LL.from) * LL.growth : 1));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[Math.floor(Math.random() * a.length)];

  function effects() {
    const out = [];
    S.skills.forEach(id => { const s = skillById[id]; if (s) s.effects.forEach(e => out.push({ ...e, src: s.name })); });
    S.tools.forEach(id => { const t = toolById[id]; if (t) t.effects.forEach(e => out.push({ ...e, src: t.name })); });
    Object.entries(S.crew).forEach(([id, lv]) => { const c = crewById[id]; if (c) c.levels[lv - 1].effects.forEach(e => out.push({ ...e, src: c.name })); });
    Object.keys(S.setsDone || {}).forEach(id => { const st = colSetById[id]; if (st) st.effects.forEach(e => out.push({ ...e, src: st.name })); });
    Object.entries(S.mastery || {}).forEach(([id, n]) => {
      const m = masteryById[id]; if (!m || !n) return;
      const e = m.effect, v = e.kind === 'heat' ? Math.pow(e.v, n) : e.v * n;
      out.push({ ...e, v, src: `${m.name} ×${n}` });
    });
    return out;
  }
  const has = id => S.skills.includes(id);
  const tierOpen = tid => { const t = tierById[tid]; return S.lv >= t.lv && (!t.skill || has(t.skill)); };
  const foreign = t => cityOf(t) !== homeCity;
  const needLv = t => foreign(t) ? (t.lv || 1) : Math.max(tierById[t.tier].lv, t.lv || 1);
  const targetOpen = t => foreign(t) ? (S.cities.includes(cityOf(t)) && S.lv >= needLv(t)) : (tierOpen(t.tier) && S.lv >= needLv(t));
  const cooldownLeft = t => Math.max(0, (S.cooldown[t.id] || 0) - S.day);
  const scoutCost = t => Math.max(15, Math.round(t.loot[0] * 0.2 / 5) * 5);

  function requirements(t) {
    const tr = tierById[t.tier], out = [{ text: 'Seviye ' + needLv(t), ok: S.lv >= needLv(t) }];
    if (foreign(t)) { out.push({ text: cityById[cityOf(t)].name + ' yolculuğu', ok: S.cities.includes(cityOf(t)) }); return out; }
    if (tr.skill) out.push({ text: skillById[tr.skill].name, ok: has(tr.skill) });
    return out;
  }

  // Güvenlik: soyulan yer korunaklı hale gelir, zamanla gevşer.
  function security(t) {
    const x = (S.sec || {})[t.id];
    if (!x) return 0;
    return Math.max(0, x.lv - Math.floor((S.day - x.day) / SEC.decayDays));
  }
  const lootRange = t => { const k = 1 + SEC.loot * security(t); return [Math.round(t.loot[0] * k), Math.round(t.loot[1] * k)]; };
  const xpFor = t => Math.round(t.xp * (1 + SEC.xp * security(t)));

  function odds(t) {
    const ef = effects();
    const rows = [{ icon: 'target', text: 'Temel şans', v: t.base, base: true }];
    t.factors.forEach(f => {
      const c = f.tag && ef.find(e => e.kind === 'cancel' && e.tag === f.tag);
      rows.push({ icon: f.icon, text: f.text, v: c ? 0 : f.v, orig: f.v, canceledBy: c ? c.src : null });
    });
    ef.filter(e => e.kind === 'bonus' && (!e.tiers || e.tiers.includes(t.tier)))
      .forEach(e => rows.push({ icon: 'sparkles', text: e.src, v: e.v }));
    if (S.scouted[t.id]) rows.push({ icon: 'eye-search', text: 'Keşif bilgisi', v: 10 + ef.filter(e => e.kind === 'scout').reduce((a, e) => a + e.v, 0) });
    S.buffs.forEach(id => { const it = itemById[id]; if (it && it.kind === 'nextBonus') rows.push({ icon: it.icon, text: it.name, v: it.v }); });
    const sl = security(t);
    if (sl > 0) rows.push({ icon: 'shield-lock', text: `${SEC.label} · ${sl}. seviye`, v: -SEC.penalty * sl });
    if (S.heat > 0) rows.push({ icon: 'urgent', text: heatLabel(), v: -5 * S.heat });
    const p = Math.max(5, Math.min(95, rows.reduce((a, r) => a + r.v, 0)));
    return { rows, p };
  }
  const buffSum = kind => S.buffs.reduce((a, id) => a + (itemById[id] && itemById[id].kind === kind ? (itemById[id].v || 1) : 0), 0);
  const lootMult = () => 1 + effects().filter(e => e.kind === 'loot').reduce((a, e) => a + e.v, 0) + buffSum('lootBoost');
  const heatMult = () => effects().filter(e => e.kind === 'heat').reduce((a, e) => a * e.v, 1);

  function dateOf(day) {
    const d = new Date(E.startDate.y, E.startDate.m, E.startDate.d + day);
    return d.getDate() + ' ' + E.months[d.getMonth()] + ' ' + d.getFullYear();
  }
  const fill = (s, t) => s.replace(/\{name\}/g, t.name).replace(/\{at\}/g, t.at);
  function addNews(kind, t) {
    const n = pick(E.news[kind]);
    S.news.unshift({ day: S.day, kind, h: fill(n[0], t), b: fill(n[1], t) });
    S.news = S.news.slice(0, 15);
    return S.news[0];
  }

  // Görevler
  const quest = () => E.quests[S.quest.i % E.quests.length];
  const questAvailable = q => (!q.tier || tierOpen(q.tier)) && S.lv >= (q.lv || 1);
  const questDone = () => S.quest.prog >= quest().n;
  function nextQuest() {
    for (let k = 1; k <= E.quests.length; k++) {
      const j = (S.quest.i + k) % E.quests.length;
      if (questAvailable(E.quests[j])) { S.quest = { i: j, prog: 0 }; return; }
    }
  }
  function ensureQuest() { if (!questAvailable(quest())) nextQuest(); }
  function bump(type, info) {
    const q = quest();
    if (questDone() || q.type !== type) return;
    if (type === 'rob' && q.tier && q.tier !== info.tier) return;
    if (type === 'streak') S.quest.prog = Math.max(S.quest.prog, info.streak);
    else if (type === 'loot') S.quest.prog += info.amount;
    else S.quest.prog++;
  }
  // Takılan görev değiştirilebilir: gecede bir kez, başka yapılabilir görev varsa.
  const otherQuest = () => E.quests.some((q, j) => j !== S.quest.i % E.quests.length && questAvailable(q));
  const canSkipQuest = () => !questDone() && S.quest.skipDay !== S.day && otherQuest();
  function skipQuest() {
    if (!canSkipQuest()) return false;
    nextQuest(); S.quest.skipDay = S.day; save(); return true;
  }
  function claimQuest() {
    if (!questDone()) return null;
    const r = quest().reward;
    S.money += r.money || 0; S.gems += r.gems || 0;
    nextQuest(); save();
    return r;
  }

  function levelUps() {
    let n = 0;
    while (S.xp >= xpCap(S.lv)) { S.xp -= xpCap(S.lv); S.lv++; S.sp++; S.gems++; n++; }
    if (n) ensureQuest();
    return n;
  }

  // Soygun gerçek zamanlı üç aşamada sürer. Başarı şansı ve karaborsa etkileri başlarken sabitlenir.
  // Aşamalar sırasında olaylar çıkabilir: olay çıkınca sayaç durur, oyuncu seçim yapana kadar bekler.
  const heistTimes = t => t.time || tierById[t.tier].time || [2, 3, 1];
  const eventById = by(E.events || []);
  const HC = E.heist || {};
  function pickPattern() {
    const pats = HC.eventPatterns || [{ phases: [], w: 1 }];
    let r = Math.random() * pats.reduce((a, x) => a + x.w, 0);
    for (const x of pats) { r -= x.w; if (r < 0) return x.phases; }
    return [];
  }
  function scheduleEvents(t, times) {
    const out = [], phases = pickPattern();
    let acc = 0;
    times.forEach((dur, phase) => {
      const pool = (E.events || []).filter(e => e.phase === phase && (!e.tiers || e.tiers.includes(t.tier)));
      if (phases.includes(phase) && pool.length) {
        const e = pool[Math.floor(Math.random() * pool.length)];
        out.push({ id: e.id, at: Math.round(acc + dur * (0.25 + Math.random() * 0.45)), done: false });
      }
      acc += dur;
    });
    return out;
  }
  function startHeist(id) {
    const t = targetById[id];
    if (S.heist || !t || !targetOpen(t) || cooldownLeft(t) > 0 || cityOf(t) !== S.city) return false;
    const times = heistTimes(t).slice();
    S.heist = {
      id, start: Date.now(), times, events: scheduleEvents(t, times), log: [],
      snap: { p: odds(t).p, loot: lootMult(), xp: 1 + buffSum('xpBoost'), safe: buffSum('safeFail') > 0, used: S.buffs.map(b => itemById[b].name) },
    };
    S.buffs = [];
    save(); return true;
  }
  function heistStatus() {
    const h = S.heist;
    if (!h) return null;
    let el = (Date.now() - h.start) / 1000;
    const total = h.times.reduce((a, b) => a + b, 0);
    const ev = (h.events || []).find(e => !e.done && e.at <= el);
    if (ev) el = ev.at;
    let acc = 0, phase = h.times.length;
    for (let i = 0; i < h.times.length; i++) { if (el < acc + h.times[i]) { phase = i; break; } acc += h.times[i]; }
    const dur = h.times[phase] || 1, inPhase = phase < h.times.length ? el - acc : dur;
    return {
      id: h.id, phase, phaseLeft: Math.max(0, Math.ceil(dur - inPhase)), phaseProg: Math.min(1, inPhase / dur),
      totalLeft: Math.max(0, Math.ceil(total - el)), total, done: !ev && el >= total,
      pending: ev ? eventById[ev.id] : null, p: h.snap.p, log: h.log,
    };
  }
  function choiceOpen(c) {
    const r = c.req;
    if (!r) return true;
    if (r.crew) return !!S.crew[r.crew];
    if (r.skill) return has(r.skill);
    if (r.tool) return S.tools.includes(r.tool);
    return true;
  }
  function reqText(c) {
    const r = c.req;
    if (!r) return '';
    if (r.crew) return (crewById[r.crew] || {}).name + ' ekipte olmalı';
    if (r.skill) return (skillById[r.skill] || {}).name + ' yeteneği gerekli';
    if (r.tool) return (toolById[r.tool] || {}).name + ' gerekli';
    return '';
  }
  // Seçeneğin gerçek şansı: hedef büyüdükçe ve takip arttıkça riskler büyür.
  function choicePenalty() {
    const h = S.heist; if (!h) return 0;
    const ti = E.tiers.findIndex(x => x.id === targetById[h.id].tier);
    return Math.max(0, ti) * (HC.choiceTierPenalty || 0) + S.heat * (HC.choiceHeatPenalty || 0);
  }
  const choiceChance = c => c.chance == null ? null : Math.max(5, Math.min(95, c.chance - choicePenalty()));
  function choose(idx) {
    const h = S.heist, st = heistStatus();
    if (!st || !st.pending) return null;
    const ev = st.pending, c = ev.choices[idx];
    if (!c || !choiceOpen(c)) return null;
    const pe = h.events.find(e => !e.done && e.id === ev.id);
    const ok = c.chance == null || Math.random() * 100 < choiceChance(c);
    const fx = (ok ? c.ok : c.fail) || {};
    pe.done = true;
    h.start = Date.now() - pe.at * 1000; // sayaç olayın olduğu yerden devam eder
    const out = { event: ev, choice: c, ok, fx };
    h.log.push({ title: ev.title, choice: c.text, text: fx.text, ok, roll: c.chance != null });
    if (fx.abort) {
      S.heist = null; S.day++;
      const t = targetById[h.id], xp = Math.round(t.xp / 6);
      S.xp += xp;
      out.result = { aborted: true, target: t, xp, log: h.log, levelUps: levelUps(), lv: S.lv, used: h.snap.used };
      save(); return out;
    }
    if (fx.p) h.snap.p = Math.max(5, Math.min(95, h.snap.p + fx.p));
    if (fx.loot) h.snap.loot = Math.max(0.2, h.snap.loot + fx.loot);
    if (fx.heat) S.heat = Math.max(0, Math.min(5, S.heat + fx.heat));
    if (fx.fame) S.fame += fx.fame;
    if (fx.time) {
      let acc = 0, ph = 0;
      for (; ph < h.times.length - 1; ph++) { if (pe.at < acc + h.times[ph]) break; acc += h.times[ph]; }
      const minDur = pe.at - acc + 3, before = h.times[ph];
      h.times[ph] = Math.max(minDur, before + fx.time);
      const d = h.times[ph] - before;
      h.events.forEach(e => { if (!e.done && e.at > pe.at) e.at += d; });
    }
    save(); return out;
  }
  function defaultChoice(ev) {
    const i = ev.choices.findIndex(c => choiceOpen(c) && !(c.ok && c.ok.abort));
    return i < 0 ? 0 : i;
  }
  function finishHeist() {
    const st = heistStatus();
    if (!st || !st.done) return null;
    const h = S.heist; S.heist = null;
    const res = resolve(h.id, h.snap);
    res.log = h.log;
    return res;
  }
  // Hızlandırma bir sonraki olaya ya da işin sonuna atlar.
  function rushTarget() {
    const h = S.heist, st = heistStatus();
    if (!st || st.pending || st.done) return null;
    const el = (Date.now() - h.start) / 1000;
    const next = (h.events || []).find(e => !e.done && e.at > el);
    return { to: next ? next.at : st.total, left: Math.max(1, (next ? next.at : st.total) - el), event: !!next };
  }
  const rushCost = () => { const r = rushTarget(); return r ? Math.max(1, Math.ceil(r.left / 60) * (HC.rushGemsPerMinute || 1)) : 0; };
  function rush() {
    const r = rushTarget(), c = rushCost();
    if (!r || S.gems < c) return false;
    S.gems -= c; S.heist.start = Date.now() - r.to * 1000 - (r.event ? 0 : 1000); save(); return true;
  }
  // Anında soygun (simülasyon ve testler için): olaylarda varsayılan seçimi yapar.
  function rob(id, pickChoice) {
    if (!startHeist(id)) return null;
    for (let g = 0; g < 10; g++) {
      S.heist.start = 0;
      const st = heistStatus();
      if (!st.pending) break;
      const o = choose(pickChoice ? pickChoice(st.pending) : defaultChoice(st.pending));
      if (o && o.result) return o.result;
    }
    S.heist.start = 0;
    return finishHeist();
  }

  function resolve(id, snap) {
    const t = targetById[id], p = snap.p;
    const ok = Math.random() * 100 < p;
    S.day++; S.stats.robs++;
    const res = { ok, target: t, p, used: snap.used };
    const xpMult = snap.xp, safe = snap.safe;
    if (ok) {
      const sl = security(t), lr = lootRange(t);
      const gross = Math.round(rand(lr[0], lr[1]) * snap.loot);
      const cut = Math.round(gross * crewCut()), loot = gross - cut;
      res.cut = cut;
      S.money += loot; S.stats.ok++; S.stats.loot += loot;
      res.xp = Math.round(xpFor(t) * xpMult);
      S.xp += res.xp; S.fame += t.fame; S.streak++;
      S.cooldown[t.id] = S.day + (t.cd || 2);
      delete S.scouted[t.id];
      Object.assign(res, { loot, fame: t.fame });
      if (S.heat > 0 && Math.random() < 0.3) { S.heat--; res.heatDown = true; }
      bump('rob', { tier: t.tier }); bump('streak', { streak: S.streak }); bump('loot', { amount: loot });
      if (COL) { const f = COL.items.find(i => i.target === t.id && !S.collection[i.id]); if (f) { S.collection[f.id] = true; res.found = f; res.sets = checkSets(); } }
      S.sec[t.id] = { lv: Math.min(SEC.max || 99, sl + 1), day: S.day }; if (sl < (SEC.max || 99)) res.secUp = sl + 1;
      if (t.legend && !S.legends[t.id]) {
        S.legends[t.id] = true; res.legend = true;
        if (t.legendNews) { S.news.unshift({ day: S.day, kind: 'legend', h: t.legendNews[0], b: t.legendNews[1] }); S.news = S.news.slice(0, 15); res.news = S.news[0]; }
        else res.news = addNews('legend', t);
      }
      else res.news = addNews(sl > 0 && E.news.repeat && Math.random() < 0.5 ? 'repeat' : 'success', t);
    } else {
      res.xp = Math.round(t.xp / 4 * xpMult); S.xp += res.xp;
      S.stats.fail++; S.streak = 0;
      if (safe) { res.safe = true; res.news = addNews('fail', t); }
      else if (Math.random() < 0.5 * heatMult()) {
        if (S.heat >= 5) {
          res.caught = true; res.lost = Math.round(S.money * 0.3);
          S.money -= res.lost; S.heat = 2; S.day += 3; S.stats.caught++;
          res.news = addNews('caught', t);
        } else { S.heat++; res.heatUp = true; res.news = addNews('heat', t); }
      } else res.news = addNews('fail', t);
    }
    res.levelUps = levelUps(); res.lv = S.lv;
    save();
    return res;
  }

  function scout(id) {
    const t = targetById[id], c = scoutCost(t);
    if (!t || S.scouted[id] || S.money < c) return false;
    S.money -= c; S.scouted[id] = true; S.stats.scouts++; bump('scout');
    save(); return true;
  }
  function rest() {
    if (S.heist) return false;
    S.day++;
    const down = S.heat > 0 && Math.random() < 0.5;
    if (down) S.heat--;
    save(); return down;
  }
  function bribe() {
    if (S.heat <= 0 || S.gems < E.bribeCost) return false;
    S.gems -= E.bribeCost; S.heat--; save(); return true;
  }
  function skillState(s) {
    if (has(s.id)) return 'owned';
    if (s.req && !has(s.req)) return 'blocked';
    if (S.lv < s.lv) return 'locked';
    return S.sp > 0 ? 'ready' : 'nopoint';
  }
  function learn(id) {
    const s = skillById[id];
    if (!s || skillState(s) !== 'ready') return false;
    S.skills.push(id); S.sp--; ensureQuest(); save(); return true;
  }
  function buy(id) {
    const t = toolById[id];
    if (!t || S.tools.includes(id) || S.money < t.price) return false;
    S.money -= t.price; S.tools.push(id); save(); return true;
  }

  // Ekip
  const crewSlots = () => (E.crewSlots || []).filter(l => S.lv >= l).length;
  const crewCount = () => Object.keys(S.crew).length;
  const crewCut = () => Object.keys(S.crew).reduce((a, id) => a + (crewById[id] ? crewById[id].cut : 0), 0);
  const trainCost = c => S.crew[c.id] && S.crew[c.id] < 3 ? c.train[S.crew[c.id] - 1] : null;
  function crewState(c) {
    if (S.crew[c.id]) return 'hired';
    if (S.lv < c.lv) return 'locked';
    if (crewCount() >= crewSlots()) return 'full';
    return S.money >= c.hire ? 'ready' : 'poor';
  }
  function hire(id) {
    const c = crewById[id];
    if (!c || crewState(c) !== 'ready') return false;
    S.money -= c.hire; S.crew[id] = 1; bump('hire'); save(); return true;
  }
  function train(id) {
    const c = crewById[id], cost = c && trainCost(c);
    if (!cost || S.money < cost) return false;
    S.money -= cost; S.crew[id]++; bump('train'); save(); return true;
  }
  function dismiss(id) {
    if (!S.crew[id]) return false;
    delete S.crew[id]; save(); return true;
  }

  // Karaborsa
  const immediate = it => ['heatDown', 'heatClear', 'cdReset'].includes(it.kind);
  function market() {
    if (!M) return null;
    if (!S.market || S.market.day !== S.day) {
      const pool = M.items.filter(i => S.lv >= (i.lv || 1)).map(i => [Math.random(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]).slice(0, M.stockSize);
      const cash = pool.map((it, i) => i).filter(i => !pool[i].gems), deal = cash.length ? cash[Math.floor(Math.random() * cash.length)] : -1;
      const scale = 1 + (M.priceGrowth || 0.12) * (S.lv - 1);
      S.market = {
        day: S.day, rumor: M.rumors[Math.floor(Math.random() * M.rumors.length)],
        stock: pool.map((it, i) => {
          if (it.gems) return { id: it.id, gems: it.gems, sold: false };
          const full = Math.round(it.price * scale * (0.8 + Math.random() * 0.45) / 5) * 5;
          return { id: it.id, price: i === deal ? Math.round(full * 0.6 / 5) * 5 : full, full, deal: i === deal, sold: false };
        }),
      };
      save();
    }
    return S.market;
  }
  function marketState(i) {
    const e = market().stock[i], it = itemById[e.id];
    if (e.sold) return 'sold';
    if (!immediate(it) && S.buffs.includes(it.id)) return 'active';
    if (it.kind === 'cdReset' && !Object.values(S.cooldown).some(d => d > S.day)) return 'useless';
    if ((it.kind === 'heatDown' || it.kind === 'heatClear') && S.heat === 0) return 'useless';
    return (e.gems ? S.gems >= e.gems : S.money >= e.price) ? 'ready' : 'poor';
  }
  function buyMarket(i) {
    if (marketState(i) !== 'ready') return null;
    const e = S.market.stock[i], it = itemById[e.id];
    if (e.gems) S.gems -= e.gems; else S.money -= e.price;
    if (it.kind === 'heatDown') S.heat = Math.max(0, S.heat - it.v);
    else if (it.kind === 'heatClear') S.heat = 0;
    else if (it.kind === 'cdReset') S.cooldown = {};
    else S.buffs.push(it.id);
    e.sold = true; bump('market'); save();
    return it;
  }
  const gemRates = () => M ? { sell: M.gemSell * S.lv, buy: M.gemBuy * S.lv } : null;
  function sellGem() { if (S.gems < 1) return false; S.gems--; S.money += gemRates().sell; save(); return true; }
  function buyGem() { const c = gemRates().buy; if (S.money < c) return false; S.money -= c; S.gems++; save(); return true; }
  const activeBuffs = () => S.buffs.map(id => itemById[id]).filter(Boolean);

  // Şehirler
  const heatLabel = () => (cityById[S.city] || {}).heat || E.labels.heat;
  function cityState(c) {
    if (c.id === S.city) return 'here';
    if (S.cities.includes(c.id)) return 'open';
    if (S.lv < (c.lv || 1)) return 'locked';
    return S.money >= (c.cost || 0) ? 'buy' : 'poor';
  }
  function travel(id) {
    const c = cityById[id];
    if (!c || S.heist) return false;
    const st = cityState(c);
    if (st === 'here' || st === 'locked' || st === 'poor') return false;
    if (st === 'buy') { S.money -= c.cost || 0; S.cities.push(id); }
    S.heatBy[S.city] = S.heat; S.city = id; S.heat = S.heatBy[id] || 0;
    save(); return true;
  }

  // Efsane koleksiyonu
  function checkSets() {
    const done = [];
    (COL ? COL.sets : []).forEach(st => {
      if (S.setsDone[st.id]) return;
      if (COL.items.filter(i => i.set === st.id).every(i => S.collection[i.id])) { S.setsDone[st.id] = true; S.fame += st.fame || 0; done.push(st); }
    });
    return done;
  }
  function legendOffer() {
    if (!COL) return null;
    if (!S.legendOffer || S.legendOffer.day !== S.day) {
      const pool = COL.items.filter(i => i.price && !S.collection[i.id] && S.lv >= (i.lv || 1));
      const id = pool.length && Math.random() < (COL.offerChance || 0.4) ? pool[Math.floor(Math.random() * pool.length)].id : null;
      S.legendOffer = { day: S.day, id, sold: false };
      save();
    }
    const o = S.legendOffer;
    return o.id && !o.sold && !S.collection[o.id] ? colItemById[o.id] : null;
  }
  function buyLegend() {
    const it = legendOffer();
    if (!it || S.money < it.price) return null;
    S.money -= it.price; S.collection[it.id] = true; S.legendOffer.sold = true;
    const sets = checkSets(); save();
    return { it, sets };
  }

  // Ustalık
  function masteryState(m) {
    const n = (S.mastery || {})[m.id] || 0;
    if (S.lv < MA.lv) return 'locked';
    if (m.max && n >= m.max) return 'maxed';
    return S.sp > 0 ? 'ready' : 'nopoint';
  }
  function learnMastery(id) {
    const m = masteryById[id];
    if (!m || masteryState(m) !== 'ready') return false;
    S.mastery[id] = (S.mastery[id] || 0) + 1; S.sp--; save(); return true;
  }

  load(); ensureQuest();

  window.Game = {
    get s() { return S; }, E,
    cities: CITIES, cityById, cityOf, cityState, travel, heatLabel, legendOffer, buyLegend, colItemById, colSetById,
    security, lootRange, xpFor, masteryById, masteryState, learnMastery,
    tierById, targetById, skillById, toolById, crewById, itemById,
    market, marketState, buyMarket, gemRates, sellGem, buyGem, activeBuffs, immediate,
    crewSlots, crewCount, crewCut, crewState, trainCost, hire, train, dismiss,
    xpCap, tierOpen, targetOpen, cooldownLeft, scoutCost, requirements, odds, dateOf,
    quest, questDone, claimQuest, skillState, canSkipQuest, skipQuest,
    pickPattern, rob, startHeist, heistStatus, finishHeist, rushCost, rush, heistTimes, choose, choiceChance, choicePenalty, choiceOpen, reqText, rushTarget,
    scout, rest, bribe, learn, buy, reset, markSeen,
  };
})();
