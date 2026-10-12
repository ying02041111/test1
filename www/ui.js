/* ==========================================================
   介面渲染：全部純程式，切分頁不觸發任何 AI 呼叫。
   ========================================================== */
var curTab = 'home', detailId = null, busy = false;

window.showTab = function(t){
  curTab = t; detailId = null;
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on', p.id === 'page-'+t));
  document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('on', b.dataset.tab===t));
  window.render();
  var pg = $('pages'); if (pg) pg.scrollTop = 0;
};

window.render = function(){
  if (!S) return;
  $('tb-title').textContent = S.settings.appName || '緋夜飼育錄';
  $('tb-when').textContent = '第' + S.day + '天 · ' + PHASES[S.phase];
  $('tb-money').textContent = fmt(S.money);
  $('tb-stam').textContent = '體 ' + S.stamina + '/' + maxStamina();
  $('tb-power').textContent = '權 ' + S.power;

  if (curTab==='home') renderHome();
  if (curTab==='succubi') renderSuccubi();
  if (curTab==='shop') renderShop();
  if (curTab==='market') renderMarket();
  if (curTab==='house') renderHouse();
  if (curTab==='settings') renderSettings();
};

function card(label, val, cls, sub){
  return '<div class="stat"><i>' + label + '</i><b class="' + (cls||'') + '">' + val + '</b>'
    + (sub?'<i style="margin-top:2px">'+sub+'</i>':'') + '</div>';
}

function renderHome(){
  $('home-status').innerHTML = [
    card('資金', fmt(S.money), S.money < dailyUpkeep()*2 ? 'w':'g', '日結 -' + fmt(dailyUpkeep())),
    card('主控體力', S.stamina + '/' + maxStamina(), S.stamina<20?'w':'r', '每日回復 30'),
    card('權力', S.power, 'ok', '解鎖高級街區'),
    card('房租', weeklyRent()? fmt(weeklyRent()):'—', 'g', weeklyRent()? ('剩 '+daysToRent()+' 天'):'自有'),
    card('住所', S.housing?S.housing.name:'無', '', '上限 '+capacity()+' 隻'),
    card('魅魔', S.succubi.length + '/' + capacity(), S.succubi.length>=capacity()?'w':'', '自留 ' + S.succubi.filter(s=>s.kept).length)
  ].join('');

  var log = $('home-story');
  log.innerHTML = S.log.slice(-24).map(x=>{
    if (x.sys) return '<div class="day">' + x.text + '</div>';
    return '<div class="sc"><div class="me">第'+x.d+'天 · '+x.p+'</div>' + esc(x.text).replace(/\n/g,'<br>') +
      (x.chosen ? '<div class="ch">▸ ' + esc(x.chosen) + '</div>' : '') + '</div>';
  }).join('') || '<div class="sc" style="color:#9b8fa6">（點下方選項進行行動。）</div>';
  log.scrollTop = log.scrollHeight;

  var last = S.log.filter(x=>!x.sys).slice(-1)[0];
  var ch = $('home-choices');
  if (S.flags.gameOver){
    ch.innerHTML = '<button class="bad" data-act="restart">破產了。重新開始</button>';
  } else {
    var list = (last && last.choices && last.choices.length) ? last.choices.slice() : ['四處看看','處理日常','前往市場'];
    ch.innerHTML = list.map(c=>'<button data-choice="' + esc(c) + '">' + esc(c) + '</button>').join('')
      + '<button class="ghost" data-act="sleep">就寢，結束第' + S.day + '天<small>生活費 -' + fmt(dailyUpkeep())
      + (S.day%7===0? '，房租 -'+fmt(weeklyRent()):'') + '</small></button>';
  }
  var tk = tokenEstimate();
  $('token-hint').textContent = '約 ' + tk + ' tokens｜錨點 ' + S.facts.length + ' 條｜摘要 ' + (S.summary?S.summary.length:0) + ' 字';
  $('token-hint').style.color = tk > (S.settings.autoCompressTokens||5000) ? 'var(--warn)' : '';
}

function renderSuccubi(){
  var box = $('succubi-list');
  if (detailId){
    var s = S.succubi.find(x=>x.id===detailId);
    if (s){ box.innerHTML = succubusDetail(s); bindDetail(); return; }
    detailId = null;
  }
  if (!S.succubi.length){ box.innerHTML = '<div class="card"><p>尚未擁有魅魔，請至「市場」領養。</p></div>'; return; }
  box.innerHTML = S.succubi.map(s=>{
    var R = RACES[s.race], st = stageOf(s);
    return '<div class="card" data-open="' + s.id + '">'
      + '<h4>' + esc(s.name) + ' <span class="tag' + (s.kept?' r':'') + '">' + (s.kept?'自留':'暫契約') + '</span> '
      + gradeTag(s.level) + ' <span class="tag">' + R.name + '</span></h4>'
      + '<p>' + esc(s.persona) + '｜階段：' + st.name + '（關係 ' + (s.rel||0) + '）</p>'
      + '<div class="bar"><i style="width:' + clamp(s.mood,0,100) + '%"></i></div>'
      + '<div class="tags"><span class="tag">魅惑 ' + s.charm + '</span><span class="tag">服從 ' + s.obedience + '</span>'
      + '<span class="tag">體力 ' + s.stamina + '/' + s.staminaMax + '</span>'
      + '<span class="tag">飽食 ' + s.fullness + '</span></div>'
      + '<p style="margin:0">' + esc(s.look) + '</p></div>';
  }).join('');
  box.querySelectorAll('[data-open]').forEach(el=>{ el.onclick = ()=>{ detailId = el.dataset.open; window.render(); }; });
}

function succubusDetail(s){
  var R = RACES[s.race], f = FOODS[R.food], st = stageOf(s);
  var bagFoods = Object.keys(S.food).filter(k=>S.food[k]>0);
  var bagItems = Object.keys(S.bag).filter(k=>S.bag[k]>0 && (ITEMS[k].kind==='mild' || S.settings.harshItems));
  var rowsArr = [
    ['種族', R.name], ['個性', s.persona],
    ['主食', f.name + '（本區 ' + (shopFoods().indexOf(R.food)>=0 ? fmt(foodPrice(R.food)) : '未販售') + '）'],
    ['等級', gradeTag(s.level) + ' ' + (s.level>=7 ? '（滿級）' : '(' + s.exp + '/' + expNeed(s.level) + ')')],
    ['魅惑值', s.charm], ['服從值', s.obedience],
    ['體力', s.stamina + ' / ' + s.staminaMax], ['飽食', s.fullness], ['心情', s.mood],
    ['每日生活費', fmt(succubusUpkeep(s))],
    ['官方估價', fmt(officialOffer(s))], ['黑市起標', fmt(blackFloor(s))],
    ['契約', s.contract==='permanent'?'永久契約':'臨時契約']
  ];

  return '<button class="btn ghost tiny" data-back="1">‹ 返回列表</button>'
    + '<div class="card pop" style="margin-top:10px"><h4>' + esc(s.name) + ' ' + gradeTag(s.level) + '</h4>'
    + '<div class="tags"><span class="tag r">' + R.name + '</span>' + (s.kept?'<span class="tag g">自留</span>':'')
    + (s.defect?'<span class="tag">缺陷：'+s.defect+'</span>':'') + '</div>'
    + '<div class="stage">關係階段：<b>' + st.name + '</b>（' + (s.rel||0) + '/100）<br>' + st.tip + '</div>'
    + '<div class="look">' + esc(s.look) + '</div>' + rows(rowsArr)
    + '<p style="font-size:12px;color:#9b8fa6">' + esc(R.desc) + '</p></div>'

    + '<div class="card"><h4>餵食</h4><p>庫存：' + (bagFoods.length? bagFoods.map(k=>FOODS[k].name+'×'+S.food[k]).join('、') : '沒有食物') + '</p><div class="tags">'
    + Object.keys(FOODS).map(k=>'<button class="btn tiny" data-feed="' + k + '" ' + ((S.food[k]||0)?'':'disabled') + '>'
        + FOODS[k].name + (k===R.food?'★':'') + ' ×' + (S.food[k]||0) + '</button>').join('') + '</div></div>'

    + '<div class="card"><h4>訓練</h4><p>消耗主控與魅魔體力，提升數值與經驗。</p><div class="tags">'
    + TRAININGS.map(t=>'<button class="btn tiny" data-train="' + t.id + '">' + t.name
        + '<br><span style="font-size:10px;opacity:.7">' + effText(t.eff) + '</span></button>').join('') + '</div></div>'

    + '<div class="card"><h4>道具</h4><p style="font-size:11.5px">' + (S.settings.harshItems? '含殘酷道具（僅敘述感受）' : '只顯示溫和道具（設定可開啟殘酷）') + '</p><div class="tags">'
    + (bagItems.length? bagItems.map(k=>'<button class="btn tiny' + (ITEMS[k].kind==='harsh'?' bad':'') + '" data-item="' + k + '">'
        + ITEMS[k].name + ' ×' + S.bag[k] + '<br><span style="font-size:10px;opacity:.8">' + effText(ITEMS[k].eff) + '</span></button>').join('')
        : '<span class="tiny-note">庫存沒有道具</span>') + '</div></div>'

    + '<div class="card"><h4>歸屬與契約</h4><p style="font-size:11.5px">'
    + (s.kept ? '自留魅魔可發展深度情感與親密劇情。' : '非自留只能進行擦邊劇情，賣出時契約自動轉移。')
    + '</p><div class="tags">'
    + (s.kept ? '' : '<button class="btn tiny" data-kept="' + s.id + '">設為自留</button>')
    + (s.kept && s.contract!=='permanent' ? '<button class="btn tiny ok" data-perm="' + s.id + '">簽訂永久契約（關係60）</button>' : '')
    + (s.kept ? '<button class="btn tiny ghost" data-unkept="1">解除自留</button>' : '') + '</div></div>';
}

function rows(pairs){
  return '<div class="rows">' + pairs.map(p=>'<div><span>' + p[0] + '</span><span>' + p[1] + '</span></div>').join('') + '</div>';
}

function bindDetail(){
  var box = $('succubi-list'), s = S.succubi.find(x=>x.id===detailId);
  box.querySelector('[data-back]').onclick = ()=>{ detailId=null; window.render(); };
  var q = sel => box.querySelectorAll(sel);
  q('[data-feed]').forEach(b=> b.onclick = ()=> actFeed(s.id, b.dataset.feed));
  q('[data-train]').forEach(b=> b.onclick = ()=> actTrain(s.id, b.dataset.train));
  q('[data-item]').forEach(b=> b.onclick = ()=> actItem(s.id, b.dataset.item));
  q('[data-kept]').forEach(b=> b.onclick = ()=> actKept(s.id));
  q('[data-perm]').forEach(b=> b.onclick = ()=> actPermanent(s.id));
  q('[data-unkept]').forEach(b=> b.onclick = ()=>{ s.kept=false; toast('已解除自留'); save(); window.render(); });
}

function renderShop(){
  var d = dist();
  $('shop-head').innerHTML = '<div class="card"><h4>' + d.name + ' 商店街</h4><p>' + esc(d.desc) + '</p>'
    + '<div class="tags"><span class="tag g">物價 ×' + d.cost + '</span><span class="tag">食物 ×' + d.food
    + '</span><span class="tag">資金 ' + fmt(S.money) + '</span></div></div>';
  $('shop-items').innerHTML = shopItems().map(k=>{
    var it = ITEMS[k], p = effectivePrice(it.price);
    return '<div class="card"><h4>' + it.name + ' <span class="tag' + (it.kind==='harsh'?' r':'') + '">'
      + (it.kind==='harsh'?'殘酷':'溫和') + '</span> <span class="tag g">' + fmt(p) + '</span></h4>'
      + '<p>' + it.desc + '</p><div class="eff">效果：' + effText(it.eff) + '</div>'
      + '<div class="tags" style="margin-top:8px"><button class="btn tiny" data-buy-item="' + k + '" ' + (S.money<p?'disabled':'') + '>購買</button></div></div>';
  }).join('') || '<div class="card"><p>這一區沒有賣道具。</p></div>';
  $('shop-food').innerHTML = shopFoods().map(k=>{
    var f = FOODS[k], p = foodPrice(k);
    return '<div class="card"><h4>' + f.name + ' <span class="tag g">' + fmt(p) + '</span></h4>'
      + '<p>飽食 +' + f.fill + '（主食者 +' + Math.round(f.fill*1.5) + '，並提升心情）</p>'
      + '<div class="tags"><button class="btn tiny" data-buy-food="' + k + '" ' + (S.money<p?'disabled':'') + '>購買</button></div></div>';
  }).join('') || '<div class="card"><p>這一區沒有賣食物。</p></div>';
  $('shop-items').querySelectorAll('[data-buy-item]').forEach(b=> b.onclick = ()=> actBuyItem(b.dataset.buyItem));
  $('shop-food').querySelectorAll('[data-buy-food]').forEach(b=> b.onclick = ()=> actBuyFood(b.dataset.buyFood));
}

function effText(e){
  var m={mood:'心情',obedience:'服從',charm:'魅惑',stamina:'體力',fullness:'飽食',staminaMax:'體力上限',rel:'關係'};
  return Object.keys(e).map(k=>'<b' + (e[k]<0?' class="minus"':'') + '>' + (m[k]||k) + ' ' + (e[k]>=0?'+':'') + e[k] + '</b>').join('、');
}

function renderMarket(){
  $('mk-official').innerHTML = (S.market.official||[]).map(m=>marketCard(m, 'official')).join('')
    || '<div class="card"><p>今日官方沒有可領養的名單。</p></div>';
  $('mk-black').innerHTML = (S.market.black||[]).map(m=>marketCard(m, 'black')).join('')
    || '<div class="card"><p>黑市今天沒開。</p></div>';
  $('mk-sell').innerHTML = S.succubi.map(s=>'<div class="card"><h4>' + esc(s.name) + ' ' + gradeTag(s.level) + '</h4>'
    + '<p>官方 ' + fmt(officialOffer(s)) + '｜黑市 ' + fmt(blackFloor(s)) + '</p><div class="tags">'
    + '<button class="btn tiny" data-sell-off="' + s.id + '">官方收養</button>'
    + '<button class="btn tiny bad" data-sell-blk="' + s.id + '">黑市拍賣</button></div></div>').join('')
    || '<div class="card"><p>沒有可販售的魅魔。</p></div>';

  $('mk-auction').innerHTML = isAuctionDay()
    ? '<h3 class="sec">今晚黑市拍賣會</h3>'
    : '<h3 class="sec">黑市拍賣會（第 ' + (S.day + daysToRent()) + ' 天開放）</h3>';

  document.querySelectorAll('[data-buy-succ]').forEach(b=> b.onclick = ()=> actBuySuccubus(b.dataset.buySucc, b.dataset.src));
  document.querySelectorAll('[data-sell-off]').forEach(b=> b.onclick = ()=> actSell(b.dataset.sellOff,'official'));
  document.querySelectorAll('[data-sell-blk]').forEach(b=> b.onclick = ()=> actSell(b.dataset.sellBlk,'black'));
  if (isAuctionDay()) $('mk-auction').insertAdjacentHTML('beforeend',
    '<div class="cards">' + S.succubi.map(s=>'<div class="card"><h4>' + esc(s.name) + '</h4><button class="btn tiny" data-auction="' + s.id + '">送上拍賣台</button></div>').join('') + '</div>');
  document.querySelectorAll('[data-auction]').forEach(b=> b.onclick = ()=> actAuction(b.dataset.auction));
}

function marketCard(m, src){
  var R = RACES[m.race], price = src==='official' ? m.price : m.blackPrice, locked = capacity() <= S.succubi.length;
  return '<div class="card"><h4>' + esc(m.name) + ' ' + gradeTag(m.level) + ' <span class="tag">' + R.name + '</span>'
    + (R.rare?'<span class="tag g">稀有</span>':'') + (m.defect?'<span class="tag r">可疑</span>':'') + '</h4>'
    + '<p>' + esc(m.persona) + '｜魅惑 ' + m.charm + '｜服從 ' + m.obedience + '｜主食 ' + FOODS[R.food].name + '</p>'
    + '<div class="look">' + esc(m.look) + '</div>'
    + '<div class="tags"><span class="tag g">' + fmt(price) + '</span>'
    + (src==='black'?'<span class="tag r">風險高</span>':'<span class="tag">有保障</span>')
    + (locked?'<span class="tag r">住所已滿</span>':'') + '</div>'
    + '<button class="btn tiny" data-buy-succ="' + m.id + '" data-src="' + src + '" ' + (locked?'disabled':'') + '>'
    + (src==='official'?'領養（' + fmt(price) + '）':'買下（' + fmt(price) + '）') + '</button></div>';
}

function renderHouse(){
  var nb = houseBonus();
  $('house-now').innerHTML = '<div class="card"><h4>目前住所：' + (S.housing?S.housing.name:'無') + '</h4>'
    + '<p>' + (S.housing? esc(S.housing.desc) : '') + '</p>'
    + '<div class="tags"><span class="tag">飼育上限 ' + capacity() + '</span>'
    + (S.housing && S.housing.type==='rent' ? '<span class="tag g">週租 ' + fmt(S.housing.rent) + '</span>' : '<span class="tag g">自有</span>')
    + bonusTags(nb) + '</div></div>';

  $('house-list').innerHTML = DISTRICTS.map(d=>{
    var hs = HOUSES.filter(h=>h.district===d.id && h.id!=(S.housing&&S.housing.id));
    var lk = d.unlock && d.unlock.power > S.power;
    return '<h3 class="sec">' + d.name + (d.id===S.district?'（目前所在）':'') + (lk?' <span class="tag r">需權力 '+d.unlock.power+'</span>':'') + '</h3>'
      + '<div class="cards">' + (hs.length ? hs.map(h=>houseCard(h, lk)).join('') : '<div class="card"><p>這裡沒有其他空房。</p></div>') + '</div>';
  }).join('');

  document.querySelectorAll('[data-move]').forEach(b=> b.onclick = ()=> actMove(b.dataset.move));
  document.querySelectorAll('[data-goto]').forEach(b=> b.onclick = ()=> actGoto(b.dataset.goto));
}

function houseCard(h, lk){
  var cost = h.type==='rent' ? h.rent*2 : h.price, canPay = S.money >= cost && !lk;
  return '<div class="card"><h4>' + h.name + ' <span class="tag' + (h.type==='buy'?' g':'') + '">' + (h.type==='rent'?'出租':'出售') + '</span></h4>'
    + '<p>' + esc(h.desc) + '</p><div class="tags"><span class="tag">上限 ' + h.cap + ' 隻</span>'
    + '<span class="tag g">' + (h.type==='rent' ? ('週 '+fmt(h.rent)+'　入住 '+fmt(cost)+'（首週＋押金）') : ('房價 '+fmt(h.price))) + '</span>'
    + bonusTags(h.bonus) + '</div>'
    + (lk ? '<span class="tiny-note">權力不足。</span>'
          : '<button class="btn tiny" data-move="' + h.id + '" ' + (canPay?'':'disabled') + '>'
            + (h.type==='rent'?'租下搬入':'買下搬入') + (canPay?'':'（資金不足）') + '</button>');
}

function bonusTags(b){
  b = b || {}; var m = {train:'訓練',recover:'回復',upkeep:'生活費',sell:'售價'};
  return Object.keys(b).map(k=>'<span class="tag">' + m[k] + ' ' + Math.round(b[k]*100) + '%</span>').join('');
}

function renderSettings(){
  var a = S.ai, st = S.settings;
  $('set-body').innerHTML = ''
  + '<div class="card"><h4>角色設定</h4>' + f('稱呼', 'in-set-title', S.master.title) + f('性別', 'in-set-gender', S.master.gender) + '<button class="btn tiny" data-save-master="1">更新</button></div>'
  + '<div class="card"><h4>AI 連線</h4><div class="field"><label>供應商</label><div class="seg" id="seg-provider">'
  + Object.keys(PROVIDERS).map(k=>'<button data-prov="' + k + '" class="' + (a.provider===k?'on':'') + '">' + PROVIDERS[k].label + '</button>').join('') + '</div></div>'
  + f('API Key', 'in-key', a.apiKey, 'password') + f('Base URL', 'in-base', a.baseUrl) + f('模型名稱', 'in-model', a.model)
  + '<div class="tags" style="margin-top:8px"><button class="btn tiny" data-save-ai="1">儲存 AI 設定</button><button class="btn tiny ghost" data-test-ai="1">測試連線</button></div></div>'
  + '<div class="card"><h4>內容設定</h4>'
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
  var seg = (id, fn) => { var el = $(id); if (el) el.querySelectorAll('button').forEach(b=> b.onclick = ()=>{ fn(b); renderSettings(); }); };
  seg('seg-provider', b=>{ var k=b.dataset.prov, P=PROVIDERS[k]; S.ai.provider=k; if(P.base){S.ai.baseUrl=P.base; S.ai.model=P.model; S.ai.jsonMode=!!P.json;} save(); });
  seg('seg-lang', b=>{ S.settings.lang=b.dataset.lang; save(); });
  seg('seg-harsh', b=>{ S.settings.harshItems = b.dataset.harsh==='1'; save(); });
  var bind = (id, fn) => { var el=$(id); if(el) el.onchange = ()=>{ fn(el.value); save(); }; };
  bind('in-key', v=>S.ai.apiKey=v.trim()); bind('in-base', v=>S.ai.baseUrl=v.trim()); bind('in-model', v=>S.ai.model=v.trim());
  var q = sel => document.querySelector(sel);
  if (q('[data-save-master]')) q('[data-save-master]').onclick = ()=>{ S.master.title=$('in-set-title').value.trim()||S.master.title; S.master.gender=$('in-set-gender').value.trim()||S.master.gender; save(); toast('已更新'); window.render(); };
  if (q('[data-save-ai]')) q('[data-save-ai]').onclick = ()=>{ save(); toast('已儲存 AI 設定'); };
  if (q('[data-test-ai]')) q('[data-test-ai]').onclick = async ()=>{ try{ await aiChat('只回一個字：好','測試'); toast('連線成功'); }catch(e){ toast(e.message); } };
  if (q('[data-save-write]')) q('[data-save-write]').onclick = ()=>{ save(); toast('已儲存'); };
  if (q('[data-reset]')) q('[data-reset]').onclick = ()=>{ if(confirm('確定要刪除存檔並重新開始？')){ wipe(); location.reload(); } };
}

function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function modal(html){ $('modal-box').innerHTML = html; $('modal').classList.remove('hidden'); }
function closeModal(){ $('modal').classList.add('hidden'); }
