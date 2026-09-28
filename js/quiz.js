/* 문제 생성기
 * 문제 유형
 *  - choice : 4지선다 (글자 읽기, 듣고 고르기, 뜻 고르기, 빈칸 채우기, 문장 듣기)
 *  - order  : 단어 배열로 문장 만들기
 *  - match  : 짝 맞추기 (연습 전용)
 *  - pair   : 비슷한 소리 구별 (2지선다)
 */
(function (g) {
  var JP = g.JP, U = JP.U, C = JP.course;
  var seq = 0;
  var PARTICLES = ['は', 'が', 'を', 'に', 'で', 'へ', 'と', 'も', 'の', 'から', 'まで', 'より', 'や', 'か'];

  function romajiOn(item) {
    var mode = JP.store.state.settings.romaji;
    if (mode === 'always') return true;
    if (mode === 'never') return false;
    return (item.ch || 1) === 1;
  }
  JP.romajiOn = romajiOn;

  function vocabLabel(v) { return v.w && v.w !== v.r ? v.w : ''; }

  /* ---------- 오답 보기 풀 ---------- */
  function nearFirst(pool, item) {
    // 오답 보기는 가까운 날짜(이미 배운 쪽 우선) → 같은 챕터 → 나머지 순서로
    var d = item.day || 1;
    var isNear = function (x) { return x.day && x.day <= d + 2 && x.day >= d - 12; };
    var near = pool.filter(isNear);
    var same = pool.filter(function (x) { return x.ch === item.ch && !isNear(x); });
    var other = pool.filter(function (x) { return x.ch !== item.ch && !isNear(x); });
    return U.shuffle(near).concat(U.shuffle(same), U.shuffle(other));
  }
  function distinct(list, n, keyFn, exclude) {
    var seen = {}; var out = [];
    (exclude || []).forEach(function (e) { seen[e] = 1; });
    for (var i = 0; i < list.length && out.length < n; i++) {
      var k = keyFn(list[i]);
      if (!k || seen[k]) continue;
      seen[k] = 1; out.push(list[i]);
    }
    return out;
  }
  function kanaDistractors(k, n, key) {
    key = key || function (x) { return x.ro; };
    var sameScript = JP.kana.list.filter(function (x) { return x.script === k.script && x.id !== k.id; });
    var conf = [];
    JP.kana.confusable.forEach(function (grp) {
      if (grp.indexOf(k.c) >= 0) grp.split('').forEach(function (c) { var it = JP.kana.byChar[c]; if (it && it.id !== k.id && it.script === k.script) conf.push(it); });
    });
    var sameGroup = sameScript.filter(function (x) { return x.group === k.group; });
    var learned = sameGroup.filter(function (x) { return x.day && x.day <= (k.day || 999); });
    var pool = U.shuffle(conf).concat(U.shuffle(learned), U.shuffle(sameGroup), U.shuffle(sameScript));
    return distinct(pool, n, key, [key(k)]);
  }
  function vocabPool() { return JP.all.vocab; }
  function sentencePool() {
    var out = [];
    JP.all.gram.forEach(function (gp) { gp.x.forEach(function (s) { out.push({ ch: gp.ch, day: gp.day, s: s }); }); });
    JP.all.line.forEach(function (l) { out.push({ ch: l.ch, day: l.day, s: l.s }); });
    JP.all.dlg.forEach(function (dl) { dl.lines.forEach(function (ln) { out.push({ ch: dl.ch, day: dl.day, s: ln.s }); }); });
    return out;
  }
  var _sentPool = null;
  function sentPool() { return _sentPool || (_sentPool = sentencePool()); }

  function mkChoice(base, correctLabel, wrongLabels) {
    var opts = [{ label: correctLabel, value: 'A' }].concat(wrongLabels.map(function (l, i) { return { label: l, value: 'W' + i }; }));
    base.kind = 'choice';
    base.options = U.shuffle(opts);
    base.answer = 'A';
    base.id = 'q' + (++seq);
    return base;
  }

  /* ---------- 가나 ---------- */
  function kanaRead(k) {
    var wr = kanaDistractors(k, 3);
    return mkChoice({
      item: k, section: 'kana', listening: false, type: 'kanaRead',
      prompt: { big: k.c, cls: 'jp-big', q: '이 글자의 소리는?' },
      reveal: { big: k.c, sub: k.ro, audio: k.c }
    }, k.ro, wr.map(function (x) { return x.ro; }));
  }
  function kanaListen(k) {
    var wr = kanaDistractors(k, 3);
    return mkChoice({
      item: k, section: 'listen', listening: true, type: 'kanaListen',
      prompt: { audio: k.c, q: '들리는 글자를 고르세요' },
      optCls: 'jp-opt',
      reveal: { big: k.c, sub: k.ro, audio: k.c }
    }, k.c, wr.map(function (x) { return x.c; }));
  }
  function kanaFromRomaji(k) {
    var wr = kanaDistractors(k, 3);
    return mkChoice({
      item: k, section: 'kana', listening: false, type: 'kanaRomaji',
      prompt: { big: k.ro, cls: 'ro-big', q: '이 소리를 나타내는 글자는?' },
      optCls: 'jp-opt',
      reveal: { big: k.c, sub: k.ro, audio: k.c }
    }, k.c, wr.map(function (x) { return x.c; }));
  }

  /* ---------- 어휘 ---------- */
  function vocabReveal(v) {
    return { big: v.r, sub: [vocabLabel(v), romajiOn(v) ? (v.ro || C.romaji(v.r)) : ''].filter(Boolean).join(' · '), ko: v.m, audio: v.r, hint: v.h };
  }
  // 같은 소리(동음이의어)의 단어는 오답 보기에서 제외: 듣기 문제에서 정답이 둘이 되지 않도록
  function vocabOthers(v) { var r = C.toHira(v.r); return nearFirst(vocabPool(), v).filter(function (x) { return C.toHira(x.r) !== r; }); }
  function vocabMeaning(v) {
    var wr = distinct(vocabOthers(v), 3, function (x) { return x.m; }, [v.m]);
    return mkChoice({
      item: v, section: 'vocab', listening: false, type: 'vocabMeaning',
      prompt: { big: v.r, cls: 'jp-word', small: vocabLabel(v), ro: romajiOn(v) ? (v.ro || C.romaji(v.r)) : '', q: '뜻을 고르세요', audioBtn: v.r },
      reveal: vocabReveal(v)
    }, v.m, wr.map(function (x) { return x.m; }));
  }
  function vocabListen(v) {
    var wr = distinct(vocabOthers(v), 3, function (x) { return x.m; }, [v.m]);
    return mkChoice({
      item: v, section: 'listen', listening: true, type: 'vocabListen',
      prompt: { audio: v.r, q: '듣고 뜻을 고르세요' },
      reveal: vocabReveal(v)
    }, v.m, wr.map(function (x) { return x.m; }));
  }
  function vocabReverse(v) {
    var wr = distinct(vocabOthers(v), 3, function (x) { return x.r; }, [v.r]);
    // 뜻이 같은 단어가 오답으로 섞이지 않도록
    wr = wr.filter(function (x) { return x.m !== v.m; });
    while (wr.length < 3) {
      var extra = U.pick(vocabPool());
      if (extra.r !== v.r && extra.m !== v.m && wr.every(function (w) { return w.r !== extra.r; })) wr.push(extra);
    }
    return mkChoice({
      item: v, section: 'vocab', listening: false, type: 'vocabReverse',
      prompt: { big: v.m, cls: 'ko-big', q: '일본어로 고르세요' },
      optCls: 'jp-opt',
      reveal: vocabReveal(v)
    }, v.r, wr.map(function (x) { return x.r; }));
  }

  /* ---------- 문장 ---------- */
  function sentReveal(s) { return { html: s.html, kana: s.kana, ko: s.ko, audio: s.plain }; }
  function translationDistractors(s, item) {
    var pool = nearFirst(sentPool(), item || { ch: 1 });
    return distinct(pool.map(function (p) { return p.s; }), 3, function (x) { return x.ko; }, [s.ko]).map(function (x) { return x.ko; });
  }
  function sentListen(s, item, section) {
    var wr = translationDistractors(s, item);
    return mkChoice({
      item: item, section: section || 'listen', listening: true, type: 'sentListen', sent: s,
      prompt: { audio: s.plain, q: '듣고 뜻을 고르세요' },
      optCls: 'ko-opt',
      reveal: sentReveal(s)
    }, s.ko, wr);
  }
  function cloze(s, gp) {
    var ans = s.cloze.answer;
    var wr = s.cloze.opts.length ? s.cloze.opts.slice() : [];
    if (wr.length < 3) wr = wr.concat(U.shuffle((gp.o || []).filter(function (o) { return o !== ans && wr.indexOf(o) < 0; })));
    if (wr.length < 3) wr = wr.concat(U.shuffle(PARTICLES.filter(function (o) { return o !== ans && wr.indexOf(o) < 0; })));
    wr = wr.slice(0, 3);
    return mkChoice({
      item: gp, section: 'gram', listening: false, type: 'cloze', sent: s,
      prompt: { html: C.clozeHtml(s), ko: s.ko, q: '빈칸에 알맞은 말은?' },
      optCls: 'jp-opt',
      optHtml: true,
      reveal: sentReveal(s)
    }, C.rubyHtml(ans), wr.map(function (w) { return C.rubyHtml(w); }));
  }
  function order(s, gp) {
    var toks = s.orderTokens;
    return {
      id: 'q' + (++seq), kind: 'order', item: gp, section: 'gram', listening: false, type: 'order', sent: s,
      prompt: { ko: s.ko, q: '뜻에 맞게 순서대로 고르세요', audioBtn: s.plain },
      tokens: U.shuffle(toks.map(function (t, i) { return { i: i, html: C.rubyHtml(t), text: t }; })),
      answerSeq: toks,
      reveal: sentReveal(s)
    };
  }
  function canOrder(s) { return s.orderTokens.length >= 3 && s.orderTokens.length <= 9; }

  function gramQ(gp, prefer) {
    var s = U.pick(gp.x);
    if (prefer === 'listen') return sentListen(s, gp, 'listen');
    var clozes = gp.x.filter(function (x) { return x.cloze; });
    if (prefer !== 'noCloze' && clozes.length && (prefer === 'cloze' || Math.random() < 0.55)) return cloze(U.pick(clozes), gp);
    var orderable = gp.x.filter(canOrder);
    if (orderable.length && Math.random() < 0.6) return order(U.pick(orderable), gp);
    return sentListen(s, gp, 'listen');
  }
  function lineQ(l) { return sentListen(l.s, l, 'listen'); }

  /* ---------- 장면 대화 청해 ---------- */
  function dlgQ(dl) {
    return mkChoice({
      item: dl, section: 'listen', listening: true, type: 'dialog', dlg: dl,
      prompt: { dialog: dl.lines, q: dl.q.q },
      optCls: 'ko-opt',
      reveal: { dialog: dl.lines }
    }, dl.q.a, dl.q.w.slice(0, 3));
  }

  /* ---------- 소리 구별 ---------- */
  function pairQ(p, day) {
    var pickA = Math.random() < 0.5;
    var target = pickA ? p[0] : p[1];
    var opts = U.shuffle([{ label: p[0], value: pickA ? 'A' : 'W0' }, { label: p[1], value: pickA ? 'W0' : 'A' }]);
    return {
      id: 'q' + (++seq), kind: 'choice', type: 'pair', item: { id: 'pair', ch: JP.days[day].ch, type: 'pair' },
      section: 'listen', listening: true,
      prompt: { audio: target, q: '어느 쪽으로 들리나요?' },
      optCls: 'jp-opt',
      options: opts, answer: 'A',
      reveal: { big: target, sub: (pickA ? p[2] : p[3]), note: p[0] + ' = ' + p[2] + ' / ' + p[1] + ' = ' + p[3], audio: target }
    };
  }

  /* ---------- 짝 맞추기 ---------- */
  function matchQ(items) {
    var seenR = {};
    items = items.filter(function (it) {
      var r = it.type === 'kana' ? it.ro : it.m;
      if (seenR[r]) return false; seenR[r] = 1; return true;
    });
    var pairs = items.slice(0, 5).map(function (it) {
      if (it.type === 'kana') return { id: it.id, l: it.c, r: it.ro, audio: it.c };
      return { id: it.id, l: it.r, r: it.m, audio: it.r };
    });
    return { id: 'q' + (++seq), kind: 'match', type: 'match', section: 'vocab', pairs: pairs, left: U.shuffle(pairs), right: U.shuffle(pairs), item: items[0] };
  }

  /* ---------- 항목 → 임의 유형 ---------- */
  function qFor(item, bias) {
    if (item.type === 'kana') {
      if (bias === 'listen') return kanaListen(item);
      return U.pick([kanaRead, kanaListen, kanaFromRomaji])(item);
    }
    if (item.type === 'vocab') {
      if (bias === 'listen') return vocabListen(item);
      return U.pick([vocabMeaning, vocabListen, vocabReverse])(item);
    }
    if (item.type === 'gram') return gramQ(item, bias);
    if (item.type === 'line') return lineQ(item);
    return null;
  }

  /* ---------- 오늘의 항목 ---------- */
  function dayItems(D) {
    return {
      kana: D.kana || [],
      vocab: D.vocab || [],
      gram: (D.gram || []).filter(function (x) { return x.x.length; }),
      line: D.line
    };
  }
  function confuseKana(D) {
    var out = [];
    (D.confuse || []).forEach(function (grp) { grp.split('').forEach(function (c) { if (JP.kana.byChar[c]) out.push(JP.kana.byChar[c]); }); });
    return U.uniq(out);
  }
  function earlierItems(day, n) {
    var st = JP.store.state;
    var weak = JP.srs.weakest(20).map(function (id) { return JP.items[id]; })
      .filter(function (it) { return it && it.day < day && it.type !== 'line'; });
    var pool = weak.length >= n ? weak : weak.concat(C.itemsInRange(Math.max(1, day - 20), day - 1).filter(function (it) { return it.type !== 'line'; }));
    return U.sample(U.uniq(pool), n);
  }

  /* ---------- 학습 단계: 연습 ---------- */
  function practice(day) {
    var D = JP.days[day], I = dayItems(D), qs = [];
    if (I.kana.length) {
      I.kana.forEach(function (k) { qs.push(kanaRead(k)); });
      for (var i = 0; i < I.kana.length; i += 5) {
        var chunk = I.kana.slice(i, i + 5);
        if (chunk.length >= 3) qs.push(matchQ(U.shuffle(chunk)));
      }
      U.sample(I.kana, Math.min(6, I.kana.length)).forEach(function (k) { qs.push(U.pick([kanaListen, kanaFromRomaji])(k)); });
    }
    confuseKana(D).forEach(function (k) { qs.push(kanaRead(k)); });
    if (I.vocab.length) {
      I.vocab.forEach(function (v) { qs.push(vocabMeaning(v)); });
      qs.push(matchQ(U.sample(I.vocab, 5)));
      U.sample(I.vocab, Math.ceil(I.vocab.length / 2)).forEach(function (v) { qs.push(vocabListen(v)); });
    }
    I.gram.forEach(function (gp) {
      gp.x.forEach(function (s, idx) {
        if (s.cloze) qs.push(cloze(s, gp));
        else if (canOrder(s) && idx % 2 === 0) qs.push(order(s, gp));
        else qs.push(sentListen(s, gp, 'listen'));
      });
    });
    (D.pairs || []).forEach(function (p) { qs.push(pairQ(p, day)); });
    if (D.dlg) {
      U.sample(D.dlg.lines, 2).forEach(function (ln) { qs.push(sentListen(ln.s, D.dlg, 'listen')); });
      qs.push(dlgQ(D.dlg));
    }
    // 너무 길지 않게: 26문항 상한 (짝 맞추기·빈칸은 유지)
    if (qs.length > 26) {
      var keep = qs.filter(function (q) { return q.kind !== 'choice' || q.type === 'cloze' || q.type === 'pair' || q.type === 'dialog'; });
      var rest = U.shuffle(qs.filter(function (q) { return keep.indexOf(q) < 0; })).slice(0, Math.max(0, 26 - keep.length));
      qs = qs.filter(function (q) { return keep.indexOf(q) >= 0 || rest.indexOf(q) >= 0; });
    }
    return qs;
  }

  /* ---------- 오늘의 평가 (10문항) ---------- */
  function test(day) {
    var D = JP.days[day], I = dayItems(D), qs = [];
    var kana = U.shuffle(I.kana), vocab = U.shuffle(I.vocab), gram = U.shuffle(I.gram);
    var ck = confuseKana(D);
    if (kana.length) {
      var kinds = [kanaRead, kanaListen, kanaFromRomaji];
      kana.slice(0, 5).forEach(function (k, i) { qs.push(kinds[i % 3](k)); });
    }
    if (ck.length) U.sample(ck, 3).forEach(function (k) { qs.push(kanaRead(k)); });
    if (vocab.length) {
      var vk = [vocabListen, vocabMeaning, vocabReverse, vocabListen];
      vocab.slice(0, kana.length ? 2 : 4).forEach(function (v, i) { qs.push(vk[i % vk.length](v)); });
    }
    gram.slice(0, 2).forEach(function (gp, i) { qs.push(gramQ(gp, i === 0 ? 'cloze' : 'noCloze')); });
    if (D.dlg) qs.push(dlgQ(D.dlg));
    else if (I.line) qs.push(lineQ(I.line));
    if (D.pairs && D.pairs.length) qs.push(pairQ(U.pick(D.pairs), day));
    earlierItems(day, 2).forEach(function (it) { var q = qFor(it); if (q) { q.review = true; qs.push(q); } });
    // 10문항 맞추기
    var fillers = U.shuffle([].concat(kana.slice(5), vocab.slice(4), gram.slice(2), I.kana, I.vocab));
    var guard = 0;
    while (qs.length < 10 && fillers.length && guard++ < 40) {
      var q = qFor(fillers[guard % fillers.length], Math.random() < 0.4 ? 'listen' : null);
      if (q) qs.push(q);
    }
    qs = ensureListening(qs.slice(0, 10), 3, D);
    return U.shuffle(qs).slice(0, 10);
  }
  // 청해 문항 최소 개수 보장
  function ensureListening(qs, min, D) {
    var n = qs.filter(function (q) { return q.listening; }).length;
    for (var i = 0; i < qs.length && n < min; i++) {
      var q = qs[i];
      if (q.listening || q.review) continue;
      var it = q.item;
      if (it && (it.type === 'vocab' || it.type === 'kana')) { qs[i] = qFor(it, 'listen'); n++; }
    }
    return qs;
  }

  /* ---------- 워밍업 / 복습 ---------- */
  function forItems(ids, n) {
    return ids.slice(0, n).map(function (id) { var q = qFor(JP.items[id]); if (q) q.srsId = id; return q; }).filter(Boolean);
  }

  /* ---------- 보스전 ---------- */
  function boss(day) {
    var D = JP.days[day];
    var items = C.itemsInRange(D.range[0], D.range[1]);
    var byDay = {};
    items.forEach(function (it) { (byDay[it.day] = byDay[it.day] || []).push(it); });
    var picked = [];
    var dayKeys = Object.keys(byDay);
    var r = 0;
    while (picked.length < 20 && r < 10) {
      dayKeys.forEach(function (k) { var arr = byDay[k]; if (arr.length && picked.length < 20) picked.push(arr.splice(Math.floor(Math.random() * arr.length), 1)[0]); });
      r++;
    }
    var qs = U.shuffle(picked).map(function (it, i) { return qFor(it, i % 3 === 0 ? 'listen' : null); }).filter(Boolean);
    return qs.slice(0, 20);
  }

  /* ---------- 청해 특훈 (15문항, 점점 빠르게) ---------- */
  function listen(day) {
    var D = JP.days[day];
    var items = C.itemsInRange(D.range[0], D.range[1], ['vocab', 'gram', 'line']);
    var lines = items.filter(function (i) { return i.type === 'line' || i.type === 'gram'; });
    var vocab = items.filter(function (i) { return i.type === 'vocab'; });
    var pairs = [];
    for (var d = D.range[0]; d <= D.range[1]; d++) if (JP.days[d] && JP.days[d].pairs) JP.days[d].pairs.forEach(function (p) { pairs.push([p, d]); });
    var qs = [];
    U.sample(vocab, 5).forEach(function (v) { qs.push(vocabListen(v)); });
    U.sample(lines, 8).forEach(function (it) { qs.push(it.type === 'line' ? lineQ(it) : gramQ(it, 'listen')); });
    U.sample(pairs, 2).forEach(function (pp) { qs.push(pairQ(pp[0], pp[1])); });
    var dls = C.dialogsInRange(D.range[0], D.range[1]);
    if (dls.length) { qs = U.shuffle(qs).slice(0, 11); U.sample(dls, 4).forEach(function (dl) { qs.push(dlgQ(dl)); }); }
    while (qs.length < 15 && vocab.length) qs.push(vocabListen(U.pick(vocab)));
    qs = U.shuffle(qs).slice(0, 15);
    var rates = [0.9, 0.9, 0.9, 0.9, 0.9, 1, 1, 1, 1, 1, 1.15, 1.15, 1.15, 1.2, 1.25];
    qs.forEach(function (q, i) { q.rate = rates[i]; q.stage = i < 5 ? 1 : i < 10 ? 2 : 3; });
    return qs;
  }

  /* ---------- 승급 시험 (30문항, 영역별 채점) ---------- */
  function exam(day) {
    var D = JP.days[day];
    var items = C.itemsInRange(D.range[0], D.range[1]);
    var kana = items.filter(function (i) { return i.type === 'kana'; });
    var vocab = items.filter(function (i) { return i.type === 'vocab'; });
    var gram = items.filter(function (i) { return i.type === 'gram'; });
    var clozeG = gram.filter(function (gp) { return gp.x.some(function (x) { return x.cloze; }) || gp.x.some(canOrder); });
    var lines = items.filter(function (i) { return i.type === 'line'; });
    var qs = [];
    var nKana = kana.length ? 6 : 0;
    var nGram = clozeG.length ? Math.min(8, clozeG.length * 2) : 0;
    var nVocab = 30 - 8 - nKana - nGram;
    U.sample(kana, nKana).forEach(function (k, i) { qs.push((i % 2 ? kanaFromRomaji : kanaRead)(k)); });
    U.sample(vocab, nVocab).forEach(function (v, i) { qs.push((i % 2 ? vocabReverse : vocabMeaning)(v)); });
    for (var j = 0; j < nGram; j++) {
      var q = gramQ(clozeG[j % clozeG.length], j % 2 ? 'noCloze' : 'cloze');
      if (q.listening) q = gramQ(clozeG[j % clozeG.length], 'cloze');
      q.section = 'gram';
      qs.push(q);
    }
    var lpool = U.shuffle(lines.map(function (l) { return { f: lineQ, it: l }; })
      .concat(U.sample(vocab, 6).map(function (v) { return { f: vocabListen, it: v }; }))
      .concat(U.sample(gram, 4).map(function (gp) { return { f: function (x) { return gramQ(x, 'listen'); }, it: gp }; })));
    var dls = C.dialogsInRange(D.range[0], D.range[1]);
    var nDlg = Math.min(3, dls.length);
    U.sample(dls, nDlg).forEach(function (dl) { qs.push(dlgQ(dl)); });
    lpool.slice(0, 8 - nDlg).forEach(function (p) { var q = p.f(p.it); q.section = 'listen'; qs.push(q); });
    while (qs.length < 30 && vocab.length) qs.push(vocabMeaning(U.pick(vocab)));
    var order = { kana: 0, vocab: 1, gram: 2, listen: 3 };
    return qs.slice(0, 30).sort(function (a, b) { return order[a.section] - order[b.section]; });
  }

  JP.quiz = {
    practice: practice, test: test, boss: boss, listen: listen, exam: exam,
    forItems: forItems, qFor: qFor, dayItems: dayItems, dlgQ: dlgQ,
    _t: { kanaRead: kanaRead, kanaListen: kanaListen, vocabMeaning: vocabMeaning, vocabListen: vocabListen, vocabReverse: vocabReverse, cloze: cloze, order: order, sentListen: sentListen, pairQ: pairQ, matchQ: matchQ }
  };
})(typeof window !== 'undefined' ? window : globalThis);
