/* ==========================================================
   介面渲染：全部純程式，切分頁不觸發任何 AI 呼叫。
   ========================================================== */
let curTab = 'home';
let detailId = null;
let busy = false;

function showTab(t){
  curTab = t;
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('on', p.id === 'page-'+t));
  document.querySelectorAll('#tabbar button').forEach(b=>b.classList.toggle('on', b.dataset.tab===t));
  render();
  $('pages').scrollTop = 0;
}

function render(){
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
}

/* ---------- 主頁 ---------- */
function renderHome(){
  const st = $('home-status');
  st.innerHTML = [
    card('資金', fmt(S.money), S.money < dailyUpkeep()*2 ? 'w':'g', '日結 -' + fmt(dailyUpkeep())),
    card('主控體力', S.stamina + '/' + maxStamina(), S.stamina<20?'w':'r', '每日回復 30'),
    card('權力', S.power, 'ok', '影響能進入的區域'),
    card('房租', weeklyRent()? fmt(weeklyRent()):'—', 'g', weeklyRent()? ('還有 '+daysToRent()+' 天'):'自有'),
    card('住所', S.housing?S.housing.name:'無', '', '上限 '+capacity()+' 隻'),
    card('魅魔', S.succubi.length + '/' + capacity(), S.succubi.length>=capacity()?'w':'', '自留 ' + S.succubi.filter(s=>s.kept).length),
  ].join('');

  const log = $('home-story');
  log.innerHTML = S.log.slice(-24).map(x=>{
    if (x.sys) return '<div class="day">' + x.text + '</div>';
    return '<div class="sc"><div class="me">第'+x.d+'天 · '+x.p+'</div>' + esc(x.text).replace(/\n/g,'<br>') +
      (x.chosen ? '<div class="ch">▸ ' + esc(x.chosen) + '</div>' : '') + '</div>';
  }).join('') || '<div class="sc" style="color:#9b8fa6">（還沒開始。按下方的選項或自由描述你的第一個行動。）</div>';
  log.scrollTop = log.scrollHeight;

  const last = S.log.filter(x=>!x.sys).slice(-1)[0];
  const ch = $('home-choices');
  if (S.flags.gameOver){
    ch.innerHTML = '<button class="bad" data-act="restart">破產了。重新開始一局</button>';
  } else {
    let list = (last && last.choices && last.choices.length) ? last.choices.slice() : [];
    if (!list.length) list = ['先四處看看','處理今天該辦的事','前往市場'];
    ch.innerHTML = list.map(c=>'<button data-choice="' + esc(c) + '">' + esc(c) + '</button>').join('')
      + '<button class="ghost" data-act="sleep">就寢，結束第' + S.day + '天<small>日結算：生活費 -' + fmt(dailyUpkeep())
      + (S.day%7===0? '、房租 -'+fmt(weeklyRent()):'') + '</small></button>';
  }
  const tk = tokenEstimate();
  $('token-hint').textContent = '目前約 ' + tk + ' tokens｜錨點 ' + S.facts.length + ' 條｜摘要 ' + (S.summary?S.summary.length:0) + ' 字';
  $('token-hint').style.color = tk > (S.settings.autoCompressTokens||5000) ? 'var(--warn)' : '';
}
function card(label, val, cls, sub){
  return '<div class="stat"><i>' + label + '</i><b class="' + (cls||'') + '">' + val + '</b>'
    + (sub?'<i style="margin-top:2px">'+sub+'</i>':'') + '</div>';
}

/* ---------- 魅魔 ---------- */
function renderSuccubi(){
  const box = $('succubi-list');
  if (detailId){ const s = S.succubi.find(x=>x.id===detailId); if (s){ box.innerHTML = succubusDetail(s); bindDetail(); return; } detailId=null; }
  if (!S.succubi.length){ box.innerHTML = '<div class="card"><p>你還沒有魅魔。到「市場」頁的官方領養所帶一隻回來。</p></div>'; return; }
  box.innerHTML = S.succubi.map(s=>{
    const R = RACES[s.race];
    return '<div class="card" data-open="' + s.id + '">'
      + '<h4>' + esc(s.name) + ' <span class="tag' + (s.kept?' r':'') + '">' + (s.kept?'自留':'暫契約') + '</span> '
      + '<span class="tag">' + R.name + '</span></h4>'
      + '<p>' + esc(s.persona) + '｜Lv.' + s.level + '　飽食 ' + s.fullness + '</p>'
      + '<div class="bar"><i style="width:' + clamp(s.mood,0,100) + '%"></i></div>'
      + '<div class="tags"><span class="tag">魅惑 ' + s.charm + '</span><span class="tag">服從 ' + s.obedience + '</span>'
      + '<span class="tag">體力 ' + s.stamina + '/' + s.staminaMax + '</span>'
      + (s.kept?'<span class="tag r">關係 ' + s.rel + '</span>':'') + '</div>'
      + '<p style="margin:0">' + esc(s.look) + '</p></div>';
  }).join('');
  box.querySelectorAll('[data-open]').forEach(el=>el.onclick = ()=>{ detailId = el.dataset.open; render(); });
}

function succubusDetail(s){
  const R = RACES[s.race];
  const f = FOODS[R.food];
  const bagFoods = Object.keys(S.food).filter(k=>S.food[k]>0);
  const bagItems = Object.keys(S.bag).filter(k=>S.bag[k]>0 && (ITEMS[k].kind==='mild' || S.settings.harshItems));
  
  const baseRows = [
    ['種族', R.name], ['主食', f.name + '（' + fmt(foodPrice(R.food)) + '）'],
    ['等級 / 經驗', s.level + ' / ' + s.exp + '/' + expNeed(s.level)],
    ['魅惑值', s.charm], ['服從值', s.obedience],
    ['體力', s.stamina + ' / ' + s.staminaMax],
    ['飽食度', s.fullness], ['心情', s.mood],
    ['每日生活費', fmt(succubusUpkeep(s))],
    ['官方估價', fmt(officialOffer(s))], ['黑市起標', fmt(blackFloor(s))]
  ];
  if (s.kept) {
    baseRows.push(['關係', s.rel], ['契約', s.contract==='permanent'?'永久':'臨時']);
  }

  return '<button class="btn ghost tiny" data-back="1">‹ 返回列表</button>'
    + '<div class="card" style="margin-top:10px"><h4>' + esc(s.name) + '</h4>'
    + '<div class="tags"><span class="tag r">' + R.name + '</span><span class="tag">' + s.persona + '</span>'
    + '<span class="tag">Lv.' + s.level + '</span><span class="tag">' + (s.contract==='permanent'?'永久契約':'臨時契約') + '</span>'
    + (s.kept?'<span class="tag g">自留</span>':'') + (s.defect?'<span class="tag">缺陷：'+s.defect+'</span>':'') + '</div>'
    + '<div class="look">' + esc(s.look) + '</div>'
    + rows(baseRows)
    + '<p style="font-size:12px;color:#9b8fa6">' + esc(R.desc) + '</p></div>'

    + '<div class="card"><h4>餵食</h4><p>主食會吃得乾淨；其他食物只算墊肚子。<br>庫存：'
    + (bagFoods.length? bagFoods.map(k=>FOODS[k].name+'×'+S.food[k]).join('、') : '沒有食物，去商店買')
    + '</p><div class="tags">' + Object.keys(FOODS).map(k=>{
        const n = S.food[k]||0;
        return '<button class="btn tiny" data-feed="' + k + '" ' + (n?'':'disabled') + '>' + FOODS[k].name + (k===R.food?'★':'') + ' ×' + n + '</button>';
      }).join('') + '</div></div>'

    + '<div class="card"><h4>訓練</h4><p>消耗主控體力與魅魔體力，提升數值與經驗。</p><div class="tags">'
    + TRAININGS.map(t=>'<button class="btn tiny" data-train="' + t.id + '">' + t.name + '</button>').join('')
    + '</div></div>'

    + '<div class="card"><h4>道具</h4><p>' + (S.settings.harshItems? '含殘酷道具（僅敘述感受，無數字以外描寫）' : '目前只顯示溫和道具（可在設定開啟殘酷道具）') + '</p><div class="tags">'
    + (bagItems.length? bagItems.map(k=>'<button class="btn tiny' + (ITEMS[k].kind==='harsh'?' bad':'') + '" data-item="' + k + '">' + ITEMS[k].name + ' ×' + S.bag[k] + '</button>').join('')
        : '<span class="tiny-note">庫存沒有道具</span>')
    + '</div></div>'

    + '<div class="card"><h4>關係與歸屬</h4><p>'
    + (s.kept ? '自留魅魔可發展深度劇情與關係數值。' : '非自留魅魔只能進行擦邊劇情，賣出時契約自動轉移。')
    + '</p><div class="tags">'
    + (s.kept ? '' : '<button class="btn tiny" data-kept="' + s.id + '">設為自留</button>')
    + (s.kept && s.contract!=='permanent' ? '<button class="btn tiny ok" data-perm="' + s.id + '">簽訂永久契約</button>' : '')
    + (s.kept ? '<button class="btn tiny ghost" data-unkept="1">解除自留</button>' : '')
    + '</div></div>';
}
function rows(pairs){
  return '<div class="rows">' + pairs.map(p=>'<div><span>' + p[0] + '</span><span>' + p[1] + '</span></div>').join('') + '</div>';
}
function bindDetail(){
  const box = $('succubi-list');
  const s = S.succubi.find(x=>x.id===detailId);
  box.querySelector('[data-back]').onclick = ()=>{ detailId=null; render(); };
  const q = sel => box.querySelectorAll(sel);
  q('[data-feed]').forEach(b=> b.onclick = ()=> actFeed(s.id, b.dataset.feed));
  q('[data-train]').forEach(b=> b.onclick = ()=> actTrain(s.id, b.dataset.train));
  q('[data-item]').forEach(b=> b.onclick = ()=> actItem(s.id, b.dataset.item));
  q('[data-kept]').forEach(b=> b.onclick = ()=> actKept(s.id));
  q('[data-perm]').forEach(b=> b.onclick = ()=> actPermanent(s.id));
  q('[data-unkept]').forEach(b=> b.onclick = ()=>{ s.kept=false; toast('已解除自留'); save(); render(); });
}

/* ---------- 商店 ---------- */
function renderShop(){
  const d = dist();
  $('shop-head').innerHTML = '<div class="card"><h4>' + d.name + ' 商店街</h4><p>' + esc(d.desc) + '</p>'
    + '<div class="tags"><span class="tag g">物價 ×' + d.cost + '</span><span class="tag">食物 ×' + d.food + '</span>'
    + '<span class="tag">資金 ' + fmt(S.money) + '</span></div></div>';
  $('shop-items').innerHTML = Object.keys(ITEMS).filter(k=>ITEMS[k].kind==='mild' || S.settings.harshItems).map(k=>{
    const it = ITEMS[k], p = effectivePrice(it.price);
    return '<div class="card"><h4>' + it.name + ' <span class="tag' + (it.kind==='harsh'?' r':'') + '">' + (it.kind==='harsh'?'殘酷':'溫和') + '</span> '
      + '<span class="tag g">' + fmt(p) + '</span></h4><p>' + it.desc + '<br>效果：' + effText(it.eff) + '</p>'
      + '<button class="btn tiny" data-buy-item="' + k + '" ' + (S.money<p?'disabled':'') + '>購買</button></div>';
  }).join('');
  $('shop-food').innerHTML = Object.keys(FOODS).map(k=>{
    const f = FOODS[k], p = foodPrice(k);
    return '<div class="card"><h4>' + f.name + ' <span class="tag g">' + fmt(p) + '</span></h4>'
      + '<p>飽食 +' + f.fill + '（主食者 +' + Math.round(f.fill*1.5) + '，並提升心情）</p>'
      + '<button class="btn tiny" data-buy-food="' + k + '" ' + (S.money<p?'disabled':'') + '>購買</button></div>';
  }).join('');
  $('shop-items').querySelectorAll('[data-buy-item]').forEach(b=>b.onclick=()=>actBuyItem(b.dataset.buyItem));
  $('shop-food').querySelectorAll('[data-buy-food]').forEach(b=>b.onclick=()=>actBuyFood(b.dataset.buyFood));
}
function effText(e){
  const m={mood:'心情',obedience:'服從',charm:'魅惑',stamina:'體力',fullness:'飽食',staminaMax:'體力上限',rel:'關係'};
  return Object.keys(e).map(k=>(m[k]||k)+(e[k]>=0?'+':'')+e[k]).join('、');
}

/* ---------- 市場 ---------- */
function renderMarket(){
  const off = $('mk-official');
  off.innerHTML = S.market.official.map(m=>marketCard(m, 'official')).join('') || '<div class="card"><p>今日官方沒有可領養的名單。</p></div>';
  const blk = $('mk-black');
  blk.innerHTML = S.market.black.map(m=>marketCard(m, 'black')).join('') || '<div class="card"><p>黑市今天沒開。</p></div>';
  const sell = $('mk-sell');
  sell.innerHTML = S.succubi.map(s=>'<div class="card"><h4>' + esc(s.name) + ' <span class="tag">' + RACES[s.race].name + '</span></h4>'
    + '<p>官方收購 ' + fmt(officialOffer(s)) + '｜黑市起標 ' + fmt(blackFloor(s)) + '</p><div class="tags">'
    + '<button class="btn tiny" data-sell-off="' + s.id + '">官方收養</button>'
    + '<button class="btn tiny bad" data-sell-blk="' + s.id + '">黑市拍賣</button></div></div>').join('')
    || '<div class="card"><p>沒有可販售的魅魔。</p></div>';

  const au = $('mk-auction');
  if (isAuctionDay()) au.innerHTML = '<h3 class="sec">今晚黑市拍賣會 <span class="tiny-note">賣家自行判斷是否成交</span></h3><div class="card"><p>今晚開放。選一隻魅魔上台，會有買家出價，價格隨機且可能遇到怪人。沒成交就帶回家。</p></div>';
  else au.innerHTML = '<h3 class="sec">黑市拍賣會</h3><div class="card"><p>每週一次，下一次在第 ' + (S.day + daysToRent()) + ' 天。</p></div>';

  document.querySelectorAll('[data-buy-succ]').forEach(b=>b.onclick=()=>actBuySuccubus(b.dataset.race, b.dataset.src, b.dataset.price));
  document.querySelectorAll('[data-sell-off]').forEach(b=>b.onclick=()=>actSell(b.dataset.sellOff,'official'));
  document.querySelectorAll('[data-sell-blk]').forEach(b=>b.onclick=()=>actSell(b.dataset.sellBlk,'black'));
  if (isAuctionDay()) $('mk-auction').insertAdjacentHTML('beforeend',
    '<div class="cards" style="margin-top:8px">' + S.succubi.map(s=>'<div class="card"><h4>' + esc(s.name) + '</h4><p>起標 ' + fmt(blackFloor(s)) + '｜服從 ' + s.obedience + '｜魅惑 ' + s.charm + '</p><button class="btn tiny" data-auction="' + s.id + '">送上拍賣台</button></div>').join('') + '</div>');
  document.querySelectorAll('[data-auction]').forEach(b=>b.onclick=()=>actAuction(b.dataset.auction));
}
function marketCard(m, src){
  const R = RACES[m.race];
  const price = src==='official' ? m.price : m.blackPrice;
  const locked = capacity() <= S.succubi.length;
  return '<div class="card"><h4>' + esc(m.name) + ' <span class="tag">' + R.name + '</span>'
    + (R.rare?'<span class="tag g">稀有</span>':'') + (m.defect?'<span class="tag r">可疑</span>':'') + '</h4>'
    + '<p>' + m.persona + '｜Lv.' + m.level + '｜魅惑 ' + m.charm + '｜服從 ' + m.obedience + '</p>'
    + '<div class="look">' + esc(m.look) + '</div>'
    + '<div class="tags"><span class="tag g">' + fmt(price) + '</span>'
    + (src==='black'?'<span class="tag r">風險高</span>':'<span class="tag">有保障</span>')
    + (locked?'<span class="tag r">住所已滿</span>':'') + '</div>'
    + '<button class="btn tiny" data-buy-succ="' + m.race + '" data-src="' + src + '" data-price="' + price + '" ' + (locked?'disabled':'') + '>'
    + (src==='official'?'領養':'買下') + '</button></div>';
}

/* ---------- 房產 ---------- */
function renderHouse(){
  const nb = houseBonus();
  $('house-now').innerHTML = '<div class="card"><h4>目前的住所：' + (S.housing?S.housing.name:'無') + '</h4>'
    + '<p>' + (S.housing? esc(S.housing.desc) : '') + '</p>'
    + '<div class="tags"><span class="tag">飼育上限 ' + capacity() + '</span>'
    + (S.housing && S.housing.type==='rent' ? '<span class="tag g">週租 ' + fmt(S.housing.rent) + '</span>' : '<span class="tag g">自有</span>')
    + (nb.train?'<span class="tag">訓練 +' + Math.round(nb.train*100) + '%</span>':'')
    + (nb.recover?'<span class="tag">回復 +' + Math.round(nb.recover*100) + '%</span>':'')
    + (nb.upkeep?'<span class="tag">生活費 ' + Math.round(nb.upkeep*100) + '%</span>':'')
    + (nb.sell?'<span class="tag">售價 +' + Math.round(nb.sell*100) + '%</span>':'') + '</div></div>';
  $('house-list').innerHTML = HOUSES.filter(h=>h.id!==(S.housing&&S.housing.id)).map(h=>{
    const here = h.districts.indexOf(S.district) >= 0;
    const cost = h.type==='rent' ? h.rent*2 : h.price;
    return '<div class="card"><h4>' + h.name + ' <span class="tag' + (h.type==='buy'?' g':'') + '">' + (h.type==='rent'?'出租':'出售') + '</span></h4>'
      + '<p>' + esc(h.desc) + '</p>'
      + '<div class="tags"><span class="tag">上限 ' + h.cap + ' 隻</span>'
      + '<span class="tag g">' + (h.type==='rent'? ('週 '+fmt(h.rent)+' · 入住 '+fmt(cost)+'（首週+押金）') : fmt(h.price)) + '</span>'
      + h.districts.map(id=>'<span class="tag' + (id===S.district?' r':'') + '">' + DISTRICTS.find(d=>d.id===id).name + '</span>').join('')
      + Object.keys(h.bonus||{}).map(k=>'<span class="tag">' + ({train:'訓練',recover:'回復',upkeep:'生活費',sell:'售價'}[k]) + ' ' + Math.round(h.bonus[k]*100) + '%</span>').join('')
      + '</div>'
      + (here ? '<button class="btn tiny" data-move="' + h.id + '" ' + (S.money<cost?'disabled':'') + '>搬過去</button>'
              : '<span class="tiny-note">此房產不在 ' + dist().name + '，請先前往該街區（搬家會同時移動）</span>')
      + '</div>';
  }).join('') + '<h3 class="sec">街區</h3><div class="cards">' + DISTRICTS.map(d=>{
    const lk = d.unlock && d.unlock.power > S.power;
    return '<div class="card"><h4>' + d.name + (d.id===S.district?' <span class="tag r">目前所在</span>':'') + '</h4>'
      + '<p>' + esc(d.desc) + '</p><div class="tags"><span class="tag g">物價 ×' + d.cost + '</span><span class="tag">房租 ×' + d.rent + '</span><span class="tag">食物 ×' + d.food + '</span>'
      + (lk?'<span class="tag r">需權力 ' + d.unlock.power + '</span>':'') + '</div>'
      + (d.id===S.district ? '' : '<button class="btn tiny" data-goto="' + d.id + '" ' + (lk?'disabled':'') + '>前往（當日往返）</button>')
      + '</div>';
  }).join('') + '</div>';
  document.querySelectorAll('[data-move]').forEach(b=>b.onclick=()=>actMove(b.dataset.move));
  document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>actGoto(b.dataset.goto));
}

/* ---------- 設定 ---------- */
function renderSettings(){
  const a = S.ai, st = S.settings;
  $('set-body').innerHTML = ''
  + '<div class="card"><h4>角色基本設定</h4>'
  + f('稱呼', 'in-set-title', S.master.title) + f('性別', 'in-set-gender', S.master.gender)
  + '<button class="btn tiny" data-save-master="1">更新</button></div>'

  + '<div class="card"><h4>AI 連線</h4>'
  + '<div class="field"><label>供應商</label><div class="seg" id="seg-provider">'
  + Object.keys(PROVIDERS).map(k=>'<button data-prov="' + k + '" class="' + (a.provider===k?'on':'') + '">' + PROVIDERS[k].label + '</button>').join('')
  + '</div></div>'
  + f('API Key（只存在本機，不會寫進 APK）', 'in-key', a.apiKey, 'password')
  + f('API Base URL', 'in-base', a.baseUrl)
  + f('模型名稱', 'in-model', a.model)
  + '<div class="field"><label>Temperature ' + a.temp + '</label><input id="in-temp" type="range" min="0.3" max="1.3" step="0.1" value="' + a.temp + '"></div>'
  + f('每次回覆上限 tokens', 'in-maxtok', a.maxTokens, 'number')
  + '<button
