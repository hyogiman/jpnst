/* 코스 구성기: 챕터 데이터(js/data/ch*.js)를 180일 일정으로 펼칩니다.
 * - 챕터 = 30일 (6챕터 = 180일 ≒ 6개월)
 * - 매주 6일 학습 + 7일째 보스전 (7·14·21·28일)
 * - 29일째 청해 특훈, 30일째 승급 시험
 */
(function (g) {
  var JP = (g.JP = g.JP || {});
  JP.chapters = JP.chapters || [];
  JP.addChapter = function (ch) { JP.chapters.push(ch); };

  var DAYS_PER_CHAPTER = 30;
  var LESSONS_PER_WEEK = 6;

  /* ---------- 로마자 변환 (워프로 방식: 가나와 1:1 대응) ---------- */
  var RO = {
    'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
    'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
    'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
    'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
    'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
    'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
    'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
    'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
    'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
    'わ': 'wa', 'を': 'wo', 'ん': 'n',
    'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
    'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
    'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
    'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
    'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
    'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o', 'ゔ': 'vu'
  };
  var SMALL_Y = { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' };
  var SMALL_V = { 'ぁ': 'a', 'ぃ': 'i', 'ぅ': 'u', 'ぇ': 'e', 'ぉ': 'o' };

  function toHira(s) {
    return String(s).replace(/[ァ-ヶ]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }

  function romaji(kana) {
    var s = toHira(kana);
    var out = '';
    for (var i = 0; i < s.length; i++) {
      var c = s[i], n = s[i + 1];
      if (c === 'っ') {
        var next = romaji(s.slice(i + 1, i + 3)).charAt(0);
        if (next === 'c') out += 't';
        else if (/[a-z]/.test(next) && !/[aiueon]/.test(next)) out += next;
        continue;
      }
      if (c === 'ー') { var m = out.match(/[aiueo](?!.*[aiueo])/); out += m ? m[0] : '-'; continue; }
      if (n && SMALL_Y[n] && RO[c]) {
        var base = RO[c];
        if (/^(shi|chi|ji)$/.test(base)) out += base.slice(0, -1) + SMALL_Y[n];
        else out += base.slice(0, -1) + 'y' + SMALL_Y[n];
        i++; continue;
      }
      if (n && SMALL_V[n] && RO[c]) {
        var b = RO[c];
        var special = { 'ふ': 'f', 'ゔ': 'v', 'う': 'w', 'て': 't', 'で': 'd', 'し': 'sh', 'じ': 'j', 'ち': 'ch', 'と': 't', 'ど': 'd' };
        if (special[c]) { out += special[c] + SMALL_V[n]; i++; continue; }
        out += b; continue;
      }
      if (c === 'ん') {
        out += (n && /[あいうえおやゆよ]/.test(n)) ? "n'" : 'n';
        continue;
      }
      if (RO[c]) out += RO[c];
      else if (/[\s〜~]/.test(c)) out += c === ' ' ? ' ' : '~';
      else if (/[。、！？!?…]/.test(c)) { /* 문장부호는 생략 */ }
      else out += c;
    }
    return out;
  }

  /* ---------- 예문 마크업 파서 ----------
   * 토큰은 공백으로 구분, 한자{읽기} = 후리가나, [정답|오답|오답] = 빈칸 문제
   */
  var KANJI_RUN = /([㐀-鿿豈-﫿々〆ヶ]+)\{([^}]+)\}/g;
  var PUNCT = /^[。、！？!?…‥・「」『』（）()〜~ー]+$/;

  function stripRuby(s) { return s.replace(KANJI_RUN, '$1'); }
  function toReading(s) { return s.replace(KANJI_RUN, '$2'); }
  function rubyHtml(s) {
    return escapeHtml(s).replace(/([㐀-鿿豈-﫿々〆ヶ]+)\{([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseSentence(markup, ko) {
    var raw = String(markup).trim().split(/\s+/);
    var tokens = [];
    var cloze = null;
    raw.forEach(function (t) {
      var attach = t.charAt(0) === '+' && t.length > 1;
      if (attach) t = t.slice(1);
      var m = t.match(/^\[(.+)\]$/);
      var tok = { src: t, cloze: false, attach: attach };
      if (m) {
        var opts = m[1].split('|');
        tok.src = opts[0];
        tok.cloze = true;
        cloze = { index: tokens.length, answer: opts[0], opts: opts.slice(1) };
      }
      if (PUNCT.test(tok.src) && tokens.length) {
        tokens[tokens.length - 1].punct = (tokens[tokens.length - 1].punct || '') + tok.src;
        return;
      }
      tokens.push(tok);
    });
    tokens.forEach(function (t) {
      t.full = t.src + (t.punct || '');
      t.plain = stripRuby(t.src);
      t.kana = toReading(t.src);
    });
    var srcAll = tokens.map(function (t) { return t.full; }).join('');
    // 배열 문제용 토큰: '+'로 붙인 토큰은 앞 토큰과 합침
    var orderTokens = [];
    tokens.forEach(function (t) {
      if (t.attach && orderTokens.length) orderTokens[orderTokens.length - 1] += t.full;
      else orderTokens.push(t.full);
    });
    return {
      orderTokens: orderTokens,
      markup: markup,
      tokens: tokens,
      html: rubyHtml(srcAll),
      plain: stripRuby(srcAll),
      kana: toReading(srcAll),
      ko: ko || '',
      cloze: cloze
    };
  }

  function clozeHtml(sent) {
    return sent.tokens.map(function (t, i) {
      if (sent.cloze && i === sent.cloze.index) return '<span class="blank">＿＿</span>' + escapeHtml(t.punct || '');
      return rubyHtml(t.full);
    }).join('');
  }

  /* ---------- 코스 빌드 ---------- */
  function lessonDayToChapterDay(li) {
    return Math.floor(li / LESSONS_PER_WEEK) * 7 + (li % LESSONS_PER_WEEK) + 1;
  }

  function build() {
    var chapters = JP.chapters.slice().sort(function (a, b) { return a.n - b.n; });
    var days = [];
    var items = {};
    var all = { kana: [], vocab: [], gram: [], line: [], dlg: [] };

    chapters.forEach(function (ch) {
      var base = (ch.n - 1) * DAYS_PER_CHAPTER;
      ch.dayList = [];
      ch.lessons.forEach(function (L, li) {
        var cd = lessonDayToChapterDay(li);
        var day = base + cd;
        var d = {
          day: day, ch: ch.n, cd: cd, week: Math.floor(li / LESSONS_PER_WEEK) + 1,
          type: 'lesson', title: L.t, sub: L.sub || '', tip: L.tip || '', note: L.note || null,
          kana: [], vocab: [], gram: [], line: null, dlg: null, pairs: L.pairs || [], confuse: L.confuse || null
        };
        (L.kana ? L.kana.trim().split(/\s+/) : []).forEach(function (c) {
          var k = JP.kana.byChar[c];
          if (!k) throw new Error('Unknown kana ' + c + ' on day ' + day);
          if (!k.day) { k.day = day; k.ch = ch.n; }
          d.kana.push(k);
          items[k.id] = k;
          all.kana.push(k);
        });
        (L.v || []).forEach(function (v, i) {
          var it = {
            type: 'vocab', id: 'v' + ch.n + '_' + cd + '_' + i, r: v[0], w: v[1] || '', m: v[2], h: v[3] || '',
            ro: v[4] || '', day: day, ch: ch.n
          };
          d.vocab.push(it); items[it.id] = it; all.vocab.push(it);
        });
        (L.g || []).forEach(function (gp, i) {
          var it = {
            type: 'gram', id: 'g' + ch.n + '_' + cd + '_' + i, t: gp.t, m: gp.m || '', d: gp.d || '',
            o: gp.o || [], day: day, ch: ch.n,
            x: (gp.x || []).map(function (x) { return parseSentence(x[0], x[1]); })
          };
          d.gram.push(it); items[it.id] = it; all.gram.push(it);
        });
        if (L.line) {
          var ln = { type: 'line', id: 'l' + ch.n + '_' + cd, s: parseSentence(L.line[0], L.line[1]), n: L.line[2] || '', day: day, ch: ch.n };
          d.line = ln; items[ln.id] = ln; all.line.push(ln);
        }
        if (L.dlg) {
          d.dlg = {
            type: 'dlg', id: 'd' + ch.n + '_' + cd, day: day, ch: ch.n,
            lines: L.dlg.lines.map(function (l) { return { who: l[0], s: parseSentence(l[1], l[2]) }; }),
            q: { q: L.dlg.q[0], a: L.dlg.q[1], w: L.dlg.q[2] }
          };
          all.dlg.push(d.dlg);
        }
        days[day] = d;
        ch.dayList.push(day);
      });

      // 보스전 (주차 복습)
      for (var w = 1; w <= 4; w++) {
        var bd = base + w * 7;
        var from = base + (w - 1) * 7 + 1;
        var boss = ch.bosses && ch.bosses[w - 1] || { name: '보스', jp: 'ボス' };
        days[bd] = {
          day: bd, ch: ch.n, cd: w * 7, week: w, type: 'boss',
          title: boss.jp + ' 격파', sub: w + '주차 보스전 — ' + boss.name, boss: boss,
          range: [from, bd - 1]
        };
      }
      days[base + 29] = {
        day: base + 29, ch: ch.n, cd: 29, week: 5, type: 'listen',
        title: '청해 특훈', sub: '챕터 전체 듣기 — 속도를 올려 가며', range: [base + 1, base + 28]
      };
      days[base + 30] = {
        day: base + 30, ch: ch.n, cd: 30, week: 5, type: 'exam',
        title: '승급 시험', sub: ch.rankFrom + '급 → ' + ch.rankTo + '급', range: [base + 1, base + 29]
      };
    });

    JP.days = days;
    JP.items = items;
    JP.all = all;
    JP.totalDays = chapters.length * DAYS_PER_CHAPTER;
    JP.sortedChapters = chapters;
    return JP;
  }

  function chapterOf(day) { return JP.sortedChapters[Math.ceil(day / DAYS_PER_CHAPTER) - 1]; }

  /* 특정 기간(day 범위)에 등장한 학습 항목 */
  function itemsInRange(from, to, types) {
    var out = [];
    for (var d = from; d <= to; d++) {
      var D = JP.days[d];
      if (!D || D.type !== 'lesson') continue;
      if (!types || types.indexOf('kana') >= 0) out = out.concat(D.kana);
      if (!types || types.indexOf('vocab') >= 0) out = out.concat(D.vocab);
      if (!types || types.indexOf('gram') >= 0) out = out.concat(D.gram.filter(function (g) { return g.x.length; }));
      if ((!types || types.indexOf('line') >= 0) && D.line) out.push(D.line);
    }
    return out;
  }

  function dialogsInRange(from, to) {
    var out = [];
    for (var d = from; d <= to; d++) { var D = JP.days[d]; if (D && D.dlg) out.push(D.dlg); }
    return out;
  }

  JP.course = {
    dialogsInRange: dialogsInRange,
    build: build,
    romaji: romaji,
    toHira: toHira,
    parseSentence: parseSentence,
    rubyHtml: rubyHtml,
    clozeHtml: clozeHtml,
    stripRuby: stripRuby,
    toReading: toReading,
    escapeHtml: escapeHtml,
    chapterOf: chapterOf,
    itemsInRange: itemsInRange,
    DAYS_PER_CHAPTER: DAYS_PER_CHAPTER
  };
})(typeof window !== 'undefined' ? window : globalThis);
