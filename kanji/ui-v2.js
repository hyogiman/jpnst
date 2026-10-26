/* 2026 mobile information architecture: home / study / review / profile.
   Existing DECK, scheduling, scoring and browser-storage code stays authoritative. */
(function(){
  var uiTab='home', uiPracticing=false, studySection='today', reviewSection='due', reviewLimit=30;
  var nav=document.createElement('nav');
  nav.id='uiBottomNav';nav.className='ui-nav';nav.setAttribute('aria-label','하단 주요 메뉴');
  document.body.appendChild(nav);
  var originalMainCard=mainCard;
  function icon(t){return ({home:'⌂',study:'▤',review:'↻',profile:'♙'})[t]||'•'}
  function heading(title,side){return '<div class="ui-section-title"><h2>'+title+'</h2>'+(side||'')+'</div>'}
  function action(label,attr,primary){return '<button class="'+(primary?'ui-primary':'ui-secondary')+'" '+attr+'>'+label+'</button>'}
  function formatNum(n){return Number(n).toLocaleString('ko-KR')}
  function setMode(mode){state.settings.mode=mode==='card'?'card':'quiz';save();activeId=null;resetTrail();resetCardUI();sessionDone.clear();render()}
  function changeTab(t){
    uiTab=t;uiPracticing=false;activeId=null;resetTrail();resetCardUI();
    if(t==='study'){view=studySection}
    if(t==='review'){view=reviewSection}
    filterText='';filterCat='';page=1;reviewLimit=30;
    window.scrollTo(0,0);render();
  }
  function beginPractice(from,id){
    if(from==='today'||from==='planner'||from==='all'){uiTab='study';studySection=from}
    if(from==='due'||from==='wrong'){uiTab='review';reviewSection=from}
    view=from;uiPracticing=true;sessionDone.clear();activeId=id||null;
    resetTrail();resetCardUI();if(activeId)addTrail();
    window.scrollTo(0,0);render();
  }
  function changeSection(s){studySection=s;view=s;activeId=null;resetTrail();resetCardUI();sessionDone.clear();filterText='';filterCat='';page=1;window.scrollTo(0,0);render()}
  function setReview(s){reviewSection=s;view=s;activeId=null;resetTrail();resetCardUI();sessionDone.clear();reviewLimit=30;window.scrollTo(0,0);render()}
  function dailyProgress(plan,day){return plan.newIds.filter(function(id){var p=state.progress[id];return !!p&&(p.firstDay===day||state.dayHistory[day]?.results?.[id]!==undefined)}).length}
  function tiles(cards){return '<div class="ui-words">'+cards.map(function(c){return '<button class="ui-word-tile" data-open="'+esc(c.id)+'"><span class="jp">'+esc(plain(c.src))+'</span><span class="reading">'+esc(c.read)+'</span><span class="ko">'+esc(c.ko)+'</span></button>'}).join('')+'</div>'}
  function row(c,day){var p=prog(c),status=day?planStatus(c,day):(p?'학습 기록':'새 단어');
    return '<button class="ui-word-row" data-open="'+esc(c.id)+'"><span class="glyph">'+esc(plain(c.src))+'</span><span class="details"><strong>'+esc(c.read)+'</strong><small>'+esc(c.ko)+' · '+esc(c.cat)+'</small></span><span class="word-status">'+esc(status)+'</span><span class="arrow">›</span></button>';
  }
  function controls(){return '<div class="ui-filter-row"><select id="uiCategory" aria-label="분야 선택"><option value="">전체 분야</option>'+cats.map(function(x){return '<option value="'+esc(x)+'" '+(filterCat===x?'selected':'')+'>'+esc(x)+'</option>'}).join('')+'</select><input id="uiSearch" type="search" autocomplete="off" aria-label="단어 검색" placeholder="한자 · 읽기 · 뜻 검색" value="'+esc(filterText)+'"></div>'}
  function home(){
    var day=todayKey(),plan=getPlan(day,true),done=dailyProgress(plan,day);
    var upcoming=plan.newIds.map(byId).filter(Boolean);
    return '<div class="ui-home">'+
      '<section class="ui-card soft ui-hero">'+
        '<div class="ui-eyebrow">✦ '+shortDate(day)+' · 오늘의 학습</div>'+
        '<h2>'+(done>=plan.newIds.length?'오늘도 학습을 이어가 볼까요?':'오늘의 한자를 읽어보세요')+'</h2>'+
        '<p>짧은 퀴즈로 한 단어씩 익혀보세요.</p>'+
        '<div class="ui-mini-facts"><span class="ui-fact">새 단어 <strong>'+plan.newIds.length+'개</strong></span><span class="ui-fact">예정된 복습 <strong>'+plan.reviewIds.length+'개</strong></span><span class="ui-fact">새 단어 학습 <strong>'+done+'/'+plan.newIds.length+'</strong></span></div>'+
        action('오늘의 학습 시작 →','data-start="today"',true)+
      '</section>'+
      '<section class="ui-section">'+heading('오늘 배울 단어','<button class="ui-text-button" data-tab="study">전체 보기 ›</button>')+
        (upcoming.length?tiles(upcoming.slice(0,4)):'<div class="ui-card">오늘 배정된 새 단어가 없습니다.</div>')+'</section>'+
      '<section class="ui-section">'+heading('빠른 시작')+
        '<div class="ui-action-grid"><button class="ui-action" data-mode-start="quiz"><strong>▤ 실전 4지선다</strong><span>읽는 법을 골라 정확하게 익혀요</span></button>'+
        '<button class="ui-action" data-mode-start="card"><strong>◫ 암기 카드</strong><span>스스로 떠올리고 난이도를 평가해요</span></button></div></section>'+
      '<p class="ui-quiet">학습 현황과 백업·복원은 하단의 ‘내 정보’에서 관리할 수 있습니다. 기록은 현재 브라우저에 저장됩니다.</p>'+
    '</div>';
  }
  function study(){
    var today=todayKey(),day=studySection==='planner'?selectedDay:today;
    var plan=studySection==='planner'?selectedPlan():getPlan(today,true);
    var done=dailyProgress(plan,day),total=plan.newIds.length;
    var out='<div class="ui-study"><div class="ui-seg">'+
      ['today','planner','all'].map(function(s,i){return '<button class="'+(studySection===s?'active':'')+'" data-section="'+s+'">'+['오늘 학습','날짜별 예복습','전체 카드'][i]+'</button>'}).join('')+'</div>';
    if(studySection==='all'){
      out+=heading('전체 카드','<span class="smallmeta">'+formatNum(DECK.length)+'개</span>')+
        '<p class="ui-quiet">단어를 누르면 해당 카드부터 연습할 수 있습니다.</p>'+controls()+listHtml();
    } else {
      if(studySection==='planner'){
        out+='<div class="ui-card"><div class="ui-progress-head"><strong>'+shortDate(day)+' 학습 카드</strong><small>선택한 날짜</small></div>'+
          '<div class="ui-filter-row"><button class="ui-secondary" data-day-delta="-1" aria-label="전날">← 전날</button><input id="uiDate" type="date" value="'+day+'" min="'+shiftDate(today,-365)+'" max="'+shiftDate(today,14)+'" aria-label="학습 날짜"><button class="ui-secondary" data-day-delta="1" '+(day>=shiftDate(today,14)?'disabled':'')+'>다음날 →</button></div></div>';
      }
      out+='<div class="ui-card soft"><div class="ui-progress-head"><strong>'+(studySection==='planner'?'선택한 날의 학습':'오늘의 학습 세트')+'</strong><small>'+done+' / '+total+'개 학습</small></div>'+
        '<div class="ui-meter"><div style="width:'+(total?Math.round(done/total*100):0)+'%"></div></div>'+
        '<div class="ui-inline-stats"><span class="ui-stat-chip">새 단어 <b>'+plan.newIds.length+'</b></span><span class="ui-stat-chip">복습 예정 <b>'+plan.reviewIds.length+'</b></span></div>'+
        action(studySection==='planner'?'선택한 날짜 퀴즈 시작 →':'학습 이어하기 →','data-start="'+studySection+'"',true)+'</div>'+
        '<section class="ui-section">'+heading('새로 공부할 단어')+
          (plan.newIds.length?plan.newIds.map(byId).filter(Boolean).map(function(c){return row(c,day)}).join(''):'<div class="ui-card">새 단어가 없습니다.</div>')+'</section>'+
        '<section class="ui-section">'+heading('이날 복습할 단어')+
          (plan.reviewIds.length?plan.reviewIds.map(byId).filter(Boolean).map(function(c){return row(c,day)}).join(''):'<div class="ui-card">배정된 복습 카드가 없습니다.</div>')+'</section>';
    }
    return out+'</div>';
  }
  function review(){
    var pool=reviewSection==='due'?dueCards():DECK.filter(function(c){return prog(c)?.wrong>0}).sort(function(a,b){return prog(b).wrong-prog(a).wrong});
    return '<div class="ui-review"><div class="ui-seg"><button class="'+(reviewSection==='due'?'active':'')+'" data-review="due">복습 대기 '+dueCards().length+'</button><button class="'+(reviewSection==='wrong'?'active':'')+'" data-review="wrong">오답 노트</button></div>'+
      '<section class="ui-card soft"><div class="ui-eyebrow">'+(reviewSection==='due'?'복습할 시간이 되었어요':'틀린 단어를 다시 익혀요')+'</div>'+
        '<h2 style="font-size:24px;margin:12px 0">'+formatNum(pool.length)+'개 단어</h2>'+
        '<p class="ui-quiet" style="margin:0 0 17px">'+(reviewSection==='due'?'예정된 시각이 지난 카드입니다.':'이전에 한 번이라도 틀린 카드입니다.')+'</p>'+
        action('이 목록으로 퀴즈 시작 →','data-start="'+reviewSection+'"'+(!pool.length?' disabled':''),true)+'</section>'+
      '<section class="ui-section">'+heading('복습 목록')+
        (pool.length?pool.slice(0,reviewLimit).map(function(c){return row(c)}).join(''):'<div class="ui-card">지금 표시할 카드가 없습니다. 학습 후 다시 확인해 보세요.</div>')+
        (pool.length>reviewLimit?'<button class="ui-secondary" style="width:100%;margin-top:8px" id="uiMore">더 보기</button>':'')+'</section></div>';
  }
  function profile(){
    var studied=Object.keys(state.progress).length,masteredCount=Object.values(state.progress).filter(mastered).length;
    var last=state.settings.lastExportAt?new Date(state.settings.lastExportAt).toLocaleDateString('ko-KR'):'아직 없음';
    var metrics=[['총 카드',DECK.length],['학습한 단어',studied],['익숙해진 단어',masteredCount],['복습 대기',dueCards().length]];
    return '<div class="ui-profile">'+
      '<section class="ui-card soft"><div class="ui-profile-lead">✦ '+streak()+'일 연속 학습</div><div class="ui-quiet" style="margin:0">한 번에 많이보다, 꾸준한 한 장씩.</div></section>'+
      '<section class="ui-section">'+heading('학습 현황')+'<div class="ui-metrics">'+metrics.map(function(x){return '<div class="ui-metric"><span>'+x[0]+'</span><strong>'+formatNum(x[1])+'</strong></div>'}).join('')+'</div></section>'+
      '<section class="ui-section">'+heading('학습 설정')+
      '<div class="ui-card"><div class="ui-setting-row"><label for="goalSel">하루 새 단어 목표</label><select id="goalSel">'+[5,10,15,20,30].map(function(n){return '<option value="'+n+'" '+(n===state.settings.goal?'selected':'')+'>'+n+'개</option>'}).join('')+'</select></div>'+
      '<div class="ui-setting-row"><label for="uiRuby">암기 카드 후리가나 표시</label><input id="uiRuby" type="checkbox" '+(state.settings.ruby?'checked':'')+'></div>'+
      '<div class="ui-setting-row"><label for="autoBackupCheck">7일마다 JSON 자동 백업 시도</label><input id="autoBackupCheck" type="checkbox" '+(state.settings.autoDownload?'checked':'')+'></div></div></section>'+
      '<section class="ui-section">'+heading('기록 백업 · 복원')+
      '<div class="ui-card"><p class="ui-quiet" style="margin:0">학습 기록은 현재 브라우저에만 저장됩니다. GitHub Pages만으로 기기 간 동기화되지는 않습니다.</p>'+
        '<p class="ui-quiet">마지막 다운로드 시도: '+last+' · 로컬 스냅샷 최대 4개</p>'+
        '<div class="ui-tools"><button id="exportBtn">↓ JSON 백업</button><button id="importBtn">↑ JSON 복원</button><button id="snapshotBtn">↶ 스냅샷 복원</button><button id="resetBtn" class="danger">학습기록 초기화</button></div>'+
        '<div class="note-ok" id="statusMsg" role="status">'+esc(notice)+'</div></div></section></div>';
  }
  function quizHeading(c){
    var num=trailIndex+1;
    return '<button class="ui-back" id="uiExitQuiz">← '+(uiTab==='study'?'학습 목록':'복습 목록')+'</button>'+
      '<div class="ui-practice-top"><strong>'+(state.settings.mode==='quiz'?'실전 4지선다':'암기 카드')+'</strong><small>'+num+'번째 카드 · '+esc(c.cat)+'</small></div>';
  }
  function finished(){
    return '<section class="ui-card" style="text-align:center;padding:45px 19px"><div style="font-size:45px">✓</div><h2>현재 학습을 마쳤어요</h2><p style="color:#6a7c95;font-size:14px">목록에서 다른 단어를 선택하거나 다음 학습을 시작할 수 있습니다.</p>'+
      action('학습 목록으로 돌아가기','id="uiExitQuiz"',true)+'</section>';
  }
  function practice(){
    var c=ensureActive();
    if(!c)return '<div class="ui-quiz">'+finished()+'</div>';
    return '<div class="ui-quiz">'+quizHeading(c)+(state.settings.mode==='quiz'?quizCard(c,candidates().length):originalMainCard(c,candidates().length))+'</div>';
  }
  /* Reading options stay hidden until answered; post-answer choices are compact one-line comparisons. */
  quizCard=function(c,queueLen){
    var options=quizChoices(c),done=selectedOption!==null,correct=done&&options[selectedOption].read===c.read;
    if(!done){
      return '<section class="quiz-panel"><div class="quiz-main"><div class="quiz-prompt">이 한자의 읽는 법을 고르세요</div>'+
        '<div class="japanese-area"><div class="main-jp">'+(hint?ruby(c.src):esc(plain(c.src)))+'</div></div>'+
        '<button type="button" id="quizHintBtn" class="quiz-hint">'+(hint?'힌트 사용 중 · 빠른 복습으로 기록':'✧ 후리가나 힌트 보기')+'</button></div>'+
        '<div class="quiz-options" aria-label="읽는 법 4지선다">'+options.map(function(o,i){return '<button class="quiz-option" data-choice="'+i+'"><em>'+(i+1)+'</em><span>'+esc(o.read)+'</span></button>'}).join('')+'</div>'+
        '<div class="quiz-footer">'+action('← 이전 문제','id="prevQuizBtn" '+(trailIndex<=0?'disabled':''),false)+action('선택해서 정답 확인','disabled',false)+'</div></section>';
    }
    return '<section class="quiz-panel">'+
      '<div class="ui-answer '+(correct?'':'bad')+'" role="status"><div class="verdict">'+(correct?(hintUsed?'✓ 맞혔어요 · 힌트 사용':'✓ 정답이에요!'):'↻ 다시 익혀볼까요?')+'</div>'+
      '<div class="word-kanji">'+ruby(c.src)+'</div><div class="word-reading">'+esc(c.read)+'</div><div class="word-ko">'+esc(c.ko)+'</div>'+
      '<button class="speak" type="button" id="speakBtn">🔊 정답 발음 듣기</button></div>'+
      '<h3 class="ui-explain-heading">선택지 다시 보기</h3>'+
      options.map(function(o,i){var isCorrect=o.read===c.read,isPicked=i===selectedOption;
        return '<div class="ui-explain-item '+(isCorrect?'correct':(isPicked?'picked':''))+'"><span class="number">'+(i+1)+'</span>'+
          '<span class="writing">'+esc(plain(o.src))+'</span><span class="gloss"><strong>'+esc(o.read)+'</strong><small>'+esc(o.ko)+'</small></span>'+
          '<span class="flag">'+(isCorrect?'✓ 정답':(isPicked?'선택':'다른 단어'))+'</span></div>';
      }).join('')+
      '<p class="ui-quiet">'+(correct&&!hintUsed?'정답으로 기록되어 복습 간격이 늘어났습니다.':'짧은 간격으로 다시 복습하도록 기록되었습니다.')+'</p>'+
      '<div class="nav-quiz"><button id="prevQuizBtn" class="navbtn" '+(trailIndex<=0?'disabled':'')+'>← 이전</button><button id="nextQuizBtn" class="navbtn forward">다음 문제 →</button></div>'+
      '<p class="mini-note">이전 문제로 돌아가도 학습 기록을 중복 저장하지 않습니다.</p></section>';
  };
  /* App shell: no statistics and no full study workspace on the first page. */
  render=function(){
    updateStats();
    var titles={home:['읽히는 한자','일본어 한자 읽기 연습'],study:['오늘 학습','한 장씩 익히는 일본어 한자'],review:['복습','기억을 오래 남기는 연습'],profile:['내 정보','나의 학습 기록과 설정']};
    var t=titles[uiTab],header=document.querySelector('.masthead');
    if(uiTab==='home'){header.innerHTML='<div class="brand"><div class="brandmark" aria-hidden="true">漢</div><div><h1>'+t[0]+'</h1><p>'+t[1]+'</p></div></div>';}
    else{header.innerHTML='<div><h1 class="screen-name">'+t[0]+'</h1><p class="screen-subtitle">'+t[1]+'</p></div>';}
    nav.innerHTML=[['home','홈'],['study','학습'],['review','복습'],['profile','내 정보']].map(function(a){
      return '<button type="button" data-tab="'+a[0]+'" class="'+(uiTab===a[0]?'active':'')+'" aria-current="'+(uiTab===a[0]?'page':'false')+'"><span aria-hidden="true">'+icon(a[0])+'</span>'+a[1]+'</button>';
    }).join('');
    var body=uiPracticing?practice():(uiTab==='home'?home():uiTab==='study'?study():uiTab==='review'?review():profile());
    $('main').innerHTML=body;bindButtons();
  };
  bindButtons=function(){
    nav.querySelectorAll('[data-tab]').forEach(function(b){b.onclick=function(){changeTab(b.dataset.tab)}});
    document.querySelectorAll('#main [data-tab]').forEach(function(b){b.onclick=function(){changeTab(b.dataset.tab)}});
    document.querySelectorAll('#main [data-start]').forEach(function(b){b.onclick=function(){beginPractice(b.dataset.start)}});
    document.querySelectorAll('#main [data-mode-start]').forEach(function(b){b.onclick=function(){state.settings.mode=b.dataset.modeStart==='card'?'card':'quiz';save();beginPractice('today')}});
    document.querySelectorAll('#main [data-section]').forEach(function(b){b.onclick=function(){changeSection(b.dataset.section)}});
    document.querySelectorAll('#main [data-review]').forEach(function(b){b.onclick=function(){setReview(b.dataset.review)}});
    document.querySelectorAll('#main [data-open]').forEach(function(b){b.onclick=function(){var from=uiTab==='study'?studySection:uiTab==='review'?reviewSection:'today';beginPractice(from,b.dataset.open)}});
    var go=$('uiExitQuiz');if(go)go.onclick=function(){uiPracticing=false;activeId=null;resetTrail();resetCardUI();window.scrollTo(0,0);render()};
    var more=$('uiMore');if(more)more.onclick=function(){reviewLimit+=30;render()};
    var date=$('uiDate');if(date)date.onchange=function(e){changeDay(e.target.value)};
    document.querySelectorAll('#main [data-day-delta]').forEach(function(b){b.onclick=function(){changeDay(shiftDate(selectedDay,Number(b.dataset.dayDelta)))}});
    var category=$('uiCategory');if(category)category.onchange=function(e){filterCat=e.target.value;page=1;render()};
    var search=$('uiSearch');if(search)search.oninput=function(e){var n=e.target.selectionStart;filterText=e.target.value;page=1;render();var next=$('uiSearch');if(next){next.focus();try{next.setSelectionRange(n,n)}catch(err){}}};
    var prevPage=$('prevPage');if(prevPage)prevPage.onclick=function(){page--;render()};
    var nextPage=$('nextPage');if(nextPage)nextPage.onclick=function(){page++;render()};
    var hintBtn=$('quizHintBtn');if(hintBtn)hintBtn.onclick=function(){hint=true;hintUsed=true;render()};
    var normalHint=$('hintBtn');if(normalHint)normalHint.onclick=function(){hint=!hint;render()};
    var flip=$('flipBtn');if(flip)flip.onclick=function(){revealed=true;render()};
    var speak=$('speakBtn');if(speak)speak.onclick=function(){speakCard(byId(activeId))};
    document.querySelectorAll('#main [data-choice]').forEach(function(b){b.onclick=function(){answerQuiz(Number(b.dataset.choice))}});
    document.querySelectorAll('#main [data-grade]').forEach(function(b){b.onclick=function(){grade(Number(b.dataset.grade))}});
    var prev=$('prevQuizBtn');if(prev)prev.onclick=navigatePrevious;
    var next=$('nextQuizBtn');if(next)next.onclick=nextQuiz;
    var goal=$('goalSel');if(goal)goal.onchange=function(e){state.settings.goal=Number(e.target.value);save();sessionDone.clear();activeId=null;resetTrail();resetCardUI();render()};
    var rubyBox=$('uiRuby');if(rubyBox)rubyBox.onchange=function(e){state.settings.ruby=e.target.checked;save();render()};
    var backup=$('autoBackupCheck');if(backup)backup.onchange=function(e){state.settings.autoDownload=e.target.checked;save();setNotice(e.target.checked?'자동 백업 다운로드 시도를 켰습니다.':'자동 백업 다운로드 시도를 껐습니다.')};
    var exp=$('exportBtn');if(exp)exp.onclick=function(){exportData(false)};
    var imp=$('importBtn');if(imp)imp.onclick=function(){$('importFile').click()};
    var snap=$('snapshotBtn');if(snap)snap.onclick=restoreSnapshot;
    var resetButton=$('resetBtn');if(resetButton)resetButton.onclick=reset;
  };
  /* Keep navigation in the correct tab after a date change from the new planner. */
  var oldChangeDay=changeDay;
  changeDay=function(day){oldChangeDay(day)};
  render();
})();