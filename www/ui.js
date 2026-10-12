/* ==========================================================
   介面渲染：全部純程式，切分頁不觸發任何 AI 呼叫。
   ========================================================== */
var curTab = 'home', detailId = null, busy = false;

window.showTab = function(t){
  curTab = t; detailId = null;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.toggle('on', p.id === 'page-'+t); });
  document.querySelectorAll('#tabbar button').forEach(function(b){ b.classList.toggle('on', b.dataset.tab===t); });
  window.render();
  var pg = $('pages'); if (pg) pg.scrollTop = 0;
};

window.render = function(){
  if (!S) return;
  $('tb-title').textContent = S.settings.appName || '緋夜飼育錄';
  $('tb-when').textContent = '第' + S.day + '天 · ' + PHASES[S.phase];
  $('tb-money').textContent = fmt(S.money);

  if (curTab==='home') renderHome();
  if (curTab==='succubi') renderSuccubi();
  if (curTab==='master') renderMaster();
  if (curTab==='house') renderHouse();
  if (curTab==='settings') renderSettings();
};

function card(label, val, cls, sub){
  return '<div class="stat-box"><i>' + label + '</i><b class="' + (cls||'') + '">' + val + '</b>'
    + (sub?'<i style="margin-top:2px">'+sub+'</i>':'') + '</div>';
}

/* ---------- 主頁：純粹劇情與選擇 ---------- */
function renderHome(){
  var log = $('home-story');
  log.innerHTML = S.log.slice(-24).map(function(x){
    if (x.sys) return '<div class="day">' + x.text + '</div>';
    return '<div class="sc"><div class="me">第'+x.d+'天 · '+x.p+'</div>' + esc(x.text).replace(/\n/g,'<br>') +
      (x.chosen ? '<div class="ch">▸ ' + esc(x.chosen) + '</div>' : '') + '</div>';
  }).join('') || '<div class="sc" style="color:#9b8fa6">（點下方選項進行行動。）</div>';
  log.scrollTop = log.scrollHeight;

  var last = S.log.filter(function(x){return !x.sys;}).slice(-1)[0];
  var ch = $('home-choices');
  if (S.flags.gameOver){
    ch.innerHTML = '<button class="bad" data-act="restart">破產了。重新開始</button>';
  } else {
    var list = (last && last.choices && last.choices.length) ? last.choices.slice() : ['在附近觀察','處理飼育所事務','前往市場或商店'];
    ch.innerHTML = list.map(function(c){ return '<button data-choice="' + esc(c) + '">' + esc(c) + '</button>'; }).join('')
      + '<button class="ghost" data-act="sleep">就寢，結束第' + S.day + '天<small>生活費 -' + fmt(dailyUpkeep())
      + (S.day%7===0? '，房租 -'+fmt(weeklyRent()):'') + '</small></button>';
  }
  var tk = tokenEstimate();
  $('token-hint').textContent = '約 ' + tk + ' tokens｜錨點 ' + S.facts.length + ' 條';
  $('token-hint').style.color = tk > (S.settings.autoCompressTokens||5000) ? 'var(--warn)' : '';
}

/* ---------- 魅魔列表與詳情 ---------- */
function renderSuccubi(){
  var box = $('succubi-list');
  if (detailId){
    var s = S.succubi.find(function(x){return x.id===detailId;});
    if (s){ box.innerHTML = succubusDetail(s); bindDetail(); return; }
    detailId = null;
  }
  if (!S.succubi.length){ box.innerHTML = '<div class="card"><p>尚未擁有魅魔。可在劇情中選擇「前往市場」購買。</p></div>'; return; }
  box.innerHTML = S.succubi.map(function(s){
    var R = RACES[s.race] || RACES.nightwing, st = stageOf(s);
    return '<div class="card" data-open="' + s.id + '">'
      + '<h4>' + esc(s.name) + ' <span class="tag' + (s.kept?' r':'') + '">' + (s.kept?'自留':'暫契約') + '</span> '
      + gradeTag(s.level) + ' <span class="tag">' + R.name + '</span></h4>'
      + '<p>' + esc(s.persona) + '｜關係階段：' + st.name + '（' + (s.rel||0) + '/100）</p>'
      + '<div class="bar"><i style="width:' + clamp(s.mood,0,100) + '%"></i></div>'
      + '<div class="tags"><span class="tag">魅惑 ' + s.charm + '</span><span class="tag">服從 ' + s.obedience + '</span>'
      + '<span class="tag">體力 ' + s.stamina + '/' + s.staminaMax + '</span>'
      + '<span class="tag">飽食 ' + s.fullness + '</span></div>'
      + '<p style="margin:0">' + esc(s.look) + '</p></div>';
  }).join('');
  box.querySelectorAll('[data-open]').forEach(function(el){ el.onclick = function(){ detailId = el.dataset.open; window.render(); }; });
}

function succubusDetail(s){
  var R = RACES[s.race] || RACES.nightwing, f = FOODS[R.food], st = stageOf(s);
  var bagFoods = Object.keys(S.food).filter(function(k){return S.food[k]>0;});
  var bagItems = Object.keys(S.bag).filter(function(k){return S.bag[k]>0 && (ITEMS[k].kind==='mild' || S.settings.harshItems);});
  var rowsArr = [
    ['種族', R.name], ['個性', s.persona],
    ['主食', f.name],
    ['等級', gradeTag(s.level) + ' ' + (s.level>=7 ? '（滿級）' : '(' + s.exp + '/' + expNeed(s.level) + ')') ],
    ['魅惑值', s.charm], ['服從值', s.obedience],
    ['體力', s.stamina + ' / ' + s.staminaMax], ['飽食', s.fullness], ['心情', s.mood],
    ['每日生活費', fmt(succubusUpkeep(s))],
    ['官方估價', fmt(officialOffer(s))], ['黑市起標', fmt(blackFloor(s))],
    ['契約狀態', s.contract==='permanent'?'永久契約':'臨時契約']
  ];

  return '<button class="btn ghost tiny" data-back="1">‹ 返回列表</button>'
    + '<div class="card" style="margin-top:10px"><h4>' + esc(s.name) + ' ' + gradeTag(s.level) + '</h4>'
    + '<div class="tags"><span class="tag r">' + R.name + '</span>' + (s.kept?'<span class="tag g">自留</span>':'')
    + (s.defect?'<span class="tag">缺陷：'+s.defect+'</span>':'') + '</div>'
    + '<div class="stage">關係階段：<b>' + st.name + '</b>（' + (s.rel||0) + '/100）<br>' + st.tip + '</div>'
    + '<div class="look">' + esc(s.look) + '</div>' + rows(rowsArr)
    + '<p style="font-size:12px;color:#9b8fa6">' + esc(R.desc) + '</p></div>'

    + '<div class="card"><h4>餵食</h4><p>庫存食物：' + (bagFoods.length? bagFoods.map(function(k){return FOODS[k].name+'×'+S.food[k];}).join('、') : '沒有食物') + '</p><div class="tags">'
    + Object.keys(FOODS).map(function(k){
        return '<button class="btn tiny" data-feed="' + k + '" ' + ((S.food[k]||0)?'':'disabled') + '>'
          + FOODS[k].name + (k===R.food?'★':'') + ' ×' + (S.food[k]||0) + '</button>';
      }).join('') + '</div></div>'

    + '<div class="card"><h4>訓練</h4><div class="tags">'
    + TRAININGS.map(function(t){
        return '<button class="btn tiny" data-train="' + t.id + '">' + t.name
          + '<br><span style="font-size:10px;opacity:.7">' + effText(t.eff) + '</span></button>';
      }).join('') + '</div></div>'

    + '<div class="card"><h4>背包道具</h4><div class="tags">'
    + (bagItems.length? bagItems.map(function(k){
        return '<button class="btn tiny' + (ITEMS[k].kind==='harsh'?' bad':'') + '" data-item="' + k + '">'
          + ITEMS[k].name + ' ×' + S.bag[k] + '<br><span style="font-size:10px;opacity:.8">' + effText(ITEMS[k].eff) + '</span></button>';
      }).join('') : '<span class="tiny-note">庫存沒有道具</span>') + '</div></div>'

    + '<div class="card"><h4>歸屬與契約</h4><div class="tags">'
    + (s.kept ? '' : '<button class="btn tiny" data-kept="' + s.id + '">設為自留</button>')
    + (s.kept && s.contract!=='permanent' ? '<button class="btn tiny ok" data-perm="' + s.id + '">簽訂永久契約（關係60）</button>' : '')
    + (s.kept ? '<button class="btn tiny ghost" data-unkept="1">解除自留</button>' : '') + '</div></div>';
}

function rows(pairs){
  return '<div class="rows">' + pairs.map(function(p){ return '<div><span>' + p[0] + '</span><span>' + p[1] + '</span></div>'; }).join('') + '</div>';
}

function bindDetail(){
  var box = $('succubi-list'), s = S.succubi.find(function(x){return x.id===detailId;});
  box.querySelector('[data-back]').onclick = function(){ detailId=null; window.render(); };
  var q = function(sel){ return box.querySelectorAll(sel); };
  q('[data-feed]').forEach(function(b){ b.onclick = function(){ actFeed(s.id, b.dataset.feed); }; });
  q('[data-train]').forEach(function(b){ b.onclick = function(){ actTrain(s.id, b.dataset.train); }; });
  q('[data-item]').forEach(function(b){ b.onclick = function(){ actItem(s.id, b.dataset.item); }; });
  q('[data-kept]').forEach(function(b){ b.onclick = function(){ actKept(s.id); }; });
  q('[data-perm]').forEach(function(b){ b.onclick = function(){ actPermanent(s.id); }; });
  q('[data-unkept]').forEach(function(b){ b.onclick = function(){ s.kept=false; toast('已解除自留'); save(); window.render(); }; });
}

function effText(e){
  var m={mood:'心情',obedience:'服從',charm:'魅惑',stamina:'體力',fullness:'飽食',staminaMax:'體力上限',rel:'關係'};
  return Object.keys(e).map(function(k){
    return '<b' + (e[k]<0?' class="minus"':'') + '>' + (m[k]||k) + ' ' + (e[k]>=0?'+':'') + e[k] + '</b>';
  }).join('、');
}

/* ---------- 主控人設與屬性面板 ---------- */
function renderMaster(){
  var m = S.master || {};
  var html = '<div class="stat-grid">'
    + card('資金', fmt(S.money), 'g', '日結 -' + fmt(dailyUpkeep()))
    + card('體力', S.stamina + '/' + maxStamina(), 'r', '每日回復 30')
    + card('權力值', S.power, 'ok', '影響高級街區與交際')
    + card('飼育容量', S.succubi.length + '/' + capacity(), '', '住所：' + (S.housing?S.housing.name:'無'))
    + '</div>'

    + '<div class="card"><h4>主控個人檔案</h4>'
    + f('稱呼', 'm-title', m.title)
    + f('性別', 'm-gender', m.gender)
    + '<div class="field"><label>訓練風格（影響AI撰寫主控動作與語氣）</label>'
    + '<div class="seg" id="m-style-seg">'
    + ['溫柔','嚴厲','功利','放任'].map(function(st){
        return '<button data-st="' + st + '" class="' + (m.style===st?'on':'') + '">' + st + '</button>';
      }).join('')
    + '</div></div>'
    + '<div class="field"><label>故事背景與人設（AI會在劇情中呼應）</label>'
    + '<textarea id="m-story" placeholder="寫下你的背景、習慣或性格…">' + esc(m.story||'') + '</textarea></div>'
    + '<button class="btn tiny" id="save-master-btn">儲存主控人設</button></div>'

    + '<div class="card"><h4>社交與經營（累積權力）</h4>'
    + '<p style="font-size:12px;color:#9b8fa6">花費資源進行政商交際，積攢權力以獲得更多街區通行權與拍賣優勢。</p>'
    + '<button class="btn tiny" id="btn-gain-power">進行外交疏通（₡300，體力 -20，權力 +2）</button></div>';

  $('master-body').innerHTML = html;

  var seg = $('m-style-seg');
  if (seg) seg.querySelectorAll('button').forEach(function(b){
    b.onclick = function(){
      seg.querySelectorAll('button').forEach(function(x){x.classList.remove('on');});
      b.classList.add('on');
    };
  });

  var saveBtn = $('save-master-btn');
  if (saveBtn) saveBtn.onclick = function(){
    var activeStyle = seg.querySelector('button.on');
    S.master.title = $('m-title').value.trim() || '主人';
    S.master.gender = $('m-gender').value.trim() || '女性';
    S.master.style = activeStyle ? activeStyle.dataset.st : '溫柔';
    S.master.story = $('m-story').value.trim();
    save(); toast('已更新主控人設'); window.render();
  };

  var powBtn = $('btn-gain-power');
  if (powBtn) powBtn.onclick = function(){
    if (S.money < 300){ toast('資金不足 ₡300'); return; }
    if (S.stamina < 20){ toast('體力不足 20'); return; }
    S.money -= 300; S.stamina -= 20; S.power += 2;
    S.facts.push('第' + S.day + '天 進行外交疏通，權力提升至 ' + S.power);
    toast('交際完成，權力 +2'); flashScreen(); save(); window.render();
  };
}

/* ---------- 房產：街區下拉式 Accordion ---------- */
function renderHouse(){
  var nb = houseBonus();
  $('house-now').innerHTML = '<div class="card"><h4>目前住所：' + (S.housing?S.housing.name:'無') + '</h4>'
    + '<p>' + (S.housing? esc(S.housing.desc) : '') + '</p>'
    + '<div class="tags"><span class="tag">飼育上限 ' + capacity() + '</span>'
    + (S.housing && S.housing.type==='rent' ? '<span class="tag g">週租 ' + fmt(S.housing.rent) + '</span>' : '<span class="tag g">自有</span>')
    + bonusTags(nb) + '</div></div>';

  var html = DISTRICTS.map(function(d){
    var hs = HOUSES.filter(function(h){ return h.district===d.id; });
    var lk = d.unlock && d.unlock.power > S.power;
    var isCurrent = d.id === S.district;

    return '<div class="acc-group' + (isCurrent?' open':'') + '" data-acc="' + d.id + '">'
      + '<div class="acc-header"><h4>' + d.name + (isCurrent?' （當前街區）':'') + '</h4>'
      + '<span>' + (lk ? '🔒 需權力 '+d.unlock.power : hs.length + ' 間房產 ▾') + '</span></div>'
      + '<div class="acc-content">'
      + '<p style="font-size:12px;color:#9b8fa6;margin:0 0 10px">' + esc(d.desc) + '</p>'
      + (hs.map(function(h){ return houseCard(h, lk); }).join(''))
      + '</div></div>';
  }).join('');

  $('house-accordion').innerHTML = html;

  document.querySelectorAll('.acc-header').forEach(function(el){
    el.onclick = function(){
      var parent = el.parentElement;
      parent.classList.toggle('open');
    };
  });

  document.querySelectorAll('[data-move]').forEach(function(b){ b.onclick=function(){ actMove(b.dataset.move); }; });
}

function houseCard(h, lk){
  var isCurrent = S.housing && S.housing.id === h.id;
  var cost = h.type==='rent' ? h.rent*2 : h.price;
  var canPay = S.money >= cost && !lk && !isCurrent;
  return '<div class="card" style="margin-bottom:8px"><h4>' + h.name + (isCurrent?' <span class="tag r">居住中</span>':'')
    + ' <span class="tag' + (h.type==='buy'?' g':'') + '">' + (h.type==='rent'?'出租':'出售') + '</span></h4>'
    + '<p>' + esc(h.desc) + '</p><div class="tags"><span class="tag">上限 ' + h.cap + ' 隻</span>'
    + '<span class="tag g">' + (h.type==='rent' ? ('週租 '+fmt(h.rent)+' / 入住 '+fmt(cost)) : ('售價 '+fmt(h.price))) + '</span>'
    + bonusTags(h.bonus) + '</div>'
    + (isCurrent ? '<span class="tiny-note">當前居住地</span>' :
        (lk ? '<span class="tiny-note">權力不足</span>' :
          '<button class="btn tiny" data-move="' + h.id + '" ' + (canPay?'':'disabled') + '>'
            + (h.type==='rent'?'租下搬入':'買下搬入') + (canPay?'':'（資金不足）') + '</button>'));
}

function bonusTags(b){
  b = b || {}; var m = {train:'訓練',recover:'回復',upkeep:'生活費',sell:'售價'};
  return Object.keys(b).map(function(k){ return '<span class="tag">' + m[k] + ' ' + Math.round(b[k]*100) + '%</span>'; }).join('');
}

/* ---------- 設定 ---------- */
function renderSettings(){
  var a = S.ai, st = S.settings;
  $('set-body').innerHTML = ''
  + '<div class="card"><h4>AI 連線設定</h4><div class="field"><label>供應商</label><div class="seg" id="seg-provider">'
  + Object.keys(PROVIDERS).map(function(k){ return '<button data-prov="' + k + '" class="' + (a.provider===k?'on':'') + '">' + PROVIDERS[k].label + '</button>'; }).join('') + '</div></div>'
  + f('API Key', 'in-key', a.apiKey, 'password') + f('Base URL', 'in-base', a.baseUrl) + f('模型名稱', 'in-model', a.model)
  + '<div class="tags" style="margin-top:8px"><button class="btn tiny" data-save-ai="1">儲存 AI 設定</button><button class="btn tiny ghost" data-test-ai="1">測試連線</button></div></div>'
  + '<div class="card"><h4>寫作設定</h4>'
  + '<div class="field"><label>語言</label><div class="seg" id="seg-lang"><button data-lang="hant" class="' + (st.lang==='hant'?'on':'') + '">繁體</button><button data-lang="hans" class="' + (st.lang==='hans'?'on':'') + '">簡體</button></div></div>'
  + '<div class="field"><label>殘酷道具</label><div class="seg" id="seg-harsh"><button data-harsh="1" class="' + (st.harshItems?'on':'') + '">開啟</button><button data-harsh="0" class="' + (!st.harshItems?'on':'') + '">關閉</button></div></div>'
  + '<button class="btn tiny" data-save-write="1">儲存</button></div>'
  + '<div class="card"><h4>存檔管理</h4><button class="btn tiny bad" data-reset="1">重新開始（重置存檔）</button></div>';
  bindSettings();
}

function f(label, id, val, type){
  return '<div class="field"><label>' + label + '</label><input id="' + id + '" type="' + (type||'text') + '" value="' + String(val==null?'':val).replace(/"/g,'&quot;') + '"></div>';
}

function bindSettings(){
  var seg = function(id, fn){ var el = $(id); if (el) el.querySelectorAll('button').forEach(function(b){ b.onclick = function(){ fn(b); renderSettings(); }; }); };
  seg('seg-provider', function(b){ var k=b.dataset.prov, P=PROVIDERS[k]; S.ai.provider=k; if(P.base){S.ai.baseUrl=P.base; S.ai.model=P.model; S.ai.jsonMode=!!P.json;} save(); });
  seg('seg-lang', function(b){ S.settings.lang=b.dataset.lang; save(); });
  seg('seg-harsh', function(b){ S.settings.harshItems = b.dataset.harsh==='1'; save(); });
  var bind = function(id, fn){ var el=$(id); if(el) el.onchange = function(){ fn(el.value); save(); }; };
  bind('in-key', function(v){ S.ai.apiKey=v.trim(); }); bind('in-base', function(v){ S.ai.baseUrl=v.trim(); }); bind('in-model', function(v){ S.ai.model=v.trim(); });
  var q = function(sel){ return document.querySelector(sel); };
  if (q('[data-save-ai]')) q('[data-save-ai]').onclick = function(){ save(); toast('已儲存 AI 設定'); };
  if (q('[data-test-ai]')) q('[data-test-ai]').onclick = async function(){ try{ await aiChat('只回一個字：好','測試'); toast('連線成功'); }catch(e){ toast(e.message); } };
  if (q('[data-save-write]')) q('[data-save-write]').onclick = function(){ save(); toast('已儲存'); };
  if (q('[data-reset]')) q('[data-reset]').onclick = function(){ if(confirm('確定要刪除存檔並重新開始？')){ wipe(); location.reload(); } };
}

function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function modal(html){ $('modal-box').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal(){ $('modal').classList.add('hidden'); }
