/* ==========================================================
   動作層：遊戲邏輯操作（買、賣、餵、訓練、搬家、推進劇情…）
   ========================================================== */

/* ---------- 開場精靈 ---------- */
function resetToSetup(){
  const b = $('boot'); if (!b) return;
  b.classList.remove('off');
  b.innerHTML = '<div style="width:88%;max-width:420px">'
  + '<h2 style="color:#e08aa3;letter-spacing:.1em;text-align:center;margin:0 0 4px">緋夜飼育錄</h2>'
  + '<p style="color:#9b8fa6;font-size:12px;text-align:center;margin-bottom:18px">飼育員登記表</p>'
  + '<div class="field"><label>你的稱呼（魅魔怎麼叫你）</label><input id="b-title" placeholder="主人 / 先生 / 姊姊 / 老闆…" value="主人"></div>'
  + '<div class="field"><label>你的性別</label><div class="seg" id="b-gender">'
  + '<button data-g="男性">男性</button><button data-g="女性" class="on">女性</button><button data-g="不指定">不指定</button></div></div>'
  + '<div class="field"><label>你的名字（敘事用，可留空）</label><input id="b-name" placeholder="留空則以稱呼代替"></div>'
  + '<p style="font-size:11.5px;color:#9b8fa6;line-height:1.7">起始資金 ₡4,800，目前住在舊港區的廉租單間（週租 ₡350）。'
  + '領養第一隻魅魔之後，飼育生活就開始了。</p>'
  + '<button class="btn" id="b-start" style="width:100%;margin-top:8px">前往官方領養所</button></div>';

  b.querySelectorAll('#b-gender button').forEach(x=>x.onclick=()=>{
    b.querySelectorAll('#b-gender button').forEach(y=>y.classList.remove('on')); x.classList.add('on');
  });

  const startBtn = $('b-start');
  if (startBtn) {
    startBtn.onclick = async ()=>{
      try {
        const genderBtn = b.querySelector('#b-gender button.on');
        const gender = genderBtn ? genderBtn.dataset.g : '女性';
        const title = $('b-title').value.trim() || '主人';
        const nm = $('b-name').value.trim() || title;
        newGame({ name:nm, gender, title });
        b.classList.add('off');
        refreshMarket();
        render();
        toast('已建立存檔，帶你去官方領養所');
        showTab('market');
        await openingScene();
      } catch (err) {
        alert('啟動出錯：' + err.message);
      }
    };
  }
}

async function openingScene(){
  if (!S || !S.ai || !S.ai.apiKey){
    if(S && S.log){
      S.log.push({ d:1, p:'清晨', text:'你在官方領養所門口停下。玻璃窗後坐著幾隻等待登記的魅魔，她們抬起頭看你。（尚未設定 API Key，先以系統敘述代替。請到「設定」填入 API Key，之後的劇情就會由 AI 生成。）', chosen:'前往領養所', choices:['走進大廳','先在窗外看一會'] });
      save();
    }
    render(); return;
  }
  setBusy(true, 'AI 正在鋪陳開場…');
  try{
    await advanceScene('第一天清晨，我（' + S.master.title + '）在官方領養所門前，準備領養第一隻魅魔。請寫一段簡短的開場，讓我看見所內的光線、氣味，以及幾隻魅魔的反應。');
  }catch(e){ toast(e.message); }
  setBusy(false); render();
}

function setBusy(on, msg){
  busy = on;
  const ch = $('home-choices');
  if (on && ch) ch.innerHTML = '<button disabled><span class="loading"></span>' + (msg||'AI 正在書寫…') + '</button>';
  else render();
}

async function choose(c){
  if (busy) return;
  if (!S.ai.apiKey){ toast('請先到設定填入 API Key'); return; }
  setBusy(true);
  try{
    await advanceScene(c);
    checkSellReminder();
  }catch(e){ toast(e.message); }
  setBusy(false); render();
}

function actFeed(sid, fid){
  const s = S.succubi.find(x=>x.id===sid); if (!s || !(S.food[fid]>0)) return;
  S.food[fid]--; if (!S.food[fid]) delete S.food[fid];
  const f = FOODS[fid], pref = (RACES[s.race].food === fid);
  const filled = Math.round(f.fill * (pref ? 1.5 : 0.6));
  const log = applyEff(s, { fullness: filled, mood: pref ? 8 : -4 }, 1);
  toast(s.name + '：' + log);
  save(); render();
}

function actItem(sid, iid){
  const s = S.succubi.find(x=>x.id===sid); if (!s || !(S.bag[iid]>0)) return;
  const it = ITEMS[iid];
  if (it.kind==='harsh' && !S.settings.harshItems) return;
  S.bag[iid]--; if (!S.bag[iid]) delete S.bag[iid];
  const log = applyEff(s, it.eff, 1);
  const harsh = it.kind==='harsh';
  toast(s.name + '：' + log);
  S.log.push({ d:S.day, p:PHASES[S.phase], text: (harsh? '你取出' + it.name + '。金屬觸上皮膚時，' + s.name + '的呼吸先亂了一拍，接著整個人安靜下來，只剩下很輕的、咬著牙的抽氣聲。'
    : '你把' + it.name + '用在' + s.name + '身上。' + '她' + (it.eff.mood>0? '的眼神慢慢軟下來' : '別開臉，耳朵卻紅了') + '，指尖在你手邊停住沒有收回去。'),
    chosen:'使用' + it.name, choices:['繼續','收手','換一個'] });
  save(); render();
}

function actTrain(sid, tid){
  const s = S.succubi.find(x=>x.id===sid), T = TRAININGS.find(t=>t.id===tid);
  if (!s || !T) return;
  if (S.stamina < T.cost){ toast('主控體力不足'); return; }
  if (s.stamina < Math.round(T.cost*0.8)){ toast(s.name + ' 太累了'); return; }
  if (s.fullness <= 0){ toast(s.name + ' 餓著，先餵食'); return; }
  S.stamina -= T.cost;
  applyEff(s, { stamina: -Math.round(T.cost*0.8), fullness: -8 }, 1);
  const log = applyEff(s, T.eff, 1 + (houseBonus().train||0));
  gainExp(s, T.exp);
  toast(s.name + ' 訓練完成：' + log);
  save(); render();
}

function actKept(sid){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  S.succubi.forEach(x=> x.kept=false);
  s.kept = true; if (!s.rel) s.rel = 10;
  S.facts.push(s.name + ' 被主人自留（第' + S.day + '天）');
  toast(s.name + ' 成為你的自留魅魔');
  save(); render();
}

function actPermanent(sid){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  if (s.rel < 60){ toast('關係需達 60（目前 ' + s.rel + '）'); return; }
  s.contract = 'permanent';
  S.facts.push(s.name + ' 與主人簽下永久契約（第' + S.day + '天）');
  toast(s.name + ' 簽下永久契約');
  save(); render();
}

function actBuyItem(k){
  const p = effectivePrice(ITEMS[k].price);
  if (S.money < p) return;
  S.money -= p; S.bag[k] = (S.bag[k]||0)+1;
  toast('購入 ' + ITEMS[k].name + '（-' + fmt(p) + '）'); save(); render();
}

function actBuyFood(k){
  const p = foodPrice(k);
  if (S.money < p) return;
  S.money -= p; S.food[k] = (S.food[k]||0)+1;
  toast('購入 ' + FOODS[k].name + '（-' + fmt(p) + '）'); save(); render();
}

async function actBuySuccubus(race, src, price){
  price = parseInt(price);
  if (S.money < price) { toast('資金不足'); return; }
  if (S.succubi.length >= capacity()){ toast('住所已滿（上限 ' + capacity() + '）'); return; }
  const m = (src==='official'?S.market.official:S.market.black).find(x=>x.race===race && (src==='official'?x.price:x.blackPrice)===price);
  S.money -= price;
  let defect = null;
  if (src==='black'){
    S.flags.blackBought++;
    if (Math.random() < 0.34){ defect = pick(DEFECTS).id; toast('黑市貨源有問題…'); }
  }
  const s = rollSuccubus(race, { name: m && m.name, level: m ? m.level : rint(1,2), defect });
  s.charm = m?m.charm:rint(10,26); s.obedience = m?m.obedience:rint(10,26);
  S.succubi.push(s);
  S.facts.push('第' + S.day + '天' + (src==='official'?'官方領養':'黑市購入') + ' ' + s.name + '（' + RACES[race].name + '）');
  refreshMarket(); save(); render();
  if (S.ai.apiKey){
    busy = true; render();
    try{ await advanceScene((src==='official'?'我在官方領養所完成手續，把':'我把黑市賣方帶到後巷，付了錢，把') + s.name + '帶回家。請寫她走出門口、第一次踏進我住處的那一小段。'); }
    catch(e){ toast(e.message); }
    busy = false;
  } else { toast(s.name + ' 已成為你的魅魔'); }
  render();
}

async function actSell(sid, ch){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  if (ch==='official'){
    const p = officialOffer(s);
    modal('<h3>官方收養</h3><p>官方會安排適合的主人，並保障魅魔的處置權。收購價 ' + fmt(p) + '。</p>'
      + '<div class="tags"><button class="btn" id="ok-sell">確定送出</button><button class="btn ghost" onclick="closeModal()">取消</button></div>');
    $('ok-sell').onclick = ()=>{
      S.money += p;
      if (s.kept) s.kept = false;
      S.succubi = S.succubi.filter(x=>x.id!==sid);
      S.facts.push('第' + S.day + '天 ' + s.name + ' 被官方收養');
      closeModal(); refreshMarket(); save(); render(); toast(s.name + ' 已送往官方（+' + fmt(p) + '）');
    };
  } else {
    const floor = blackFloor(s);
    const weird = Math.random();
    const bid = Math.round(floor * (weird<0.2 ? rint(150,230)/100 : rint(60,140)/100));
    const buyer = pick(BLACK_MARKET_BUYERS);
    const desc = bid > floor*1.5
      ? '對方出價高得異常，眼神卻一直在你身上，而不是她身上。'
      : bid < floor
        ? '對方慢慢加價，每加一次就看你一眼，像在等你先撐不住。'
        : '對方檢查得很仔細，連牙齒都看了。';
    modal('<h3>黑市拍賣</h3><p>買家：' + buyer.n + '（' + buyer.d + '）</p><p>' + desc + '</p>'
      + '<div class="rows"><div><span>起標</span><span>' + fmt(floor) + '</span></div>'
      + '<div><span>目前出價</span><span>' + fmt(bid) + '</span></div>'
      + '<div><span>風險</span><span>' + (weird<0.2?'高':'中') + '</span></div></div>'
      + '<div class="tags"><button class="btn" id="ok-blk">成交</button><button class="btn ghost" id="no-blk">帶回家</button></div>');
    $('ok-blk').onclick = ()=>{
      S.money += bid;
      S.succubi = S.succubi.filter(x=>x.id!==sid);
      S.facts.push('第' + S.day + '天 ' + s.name + ' 被黑市賣出，價格 ' + fmt(bid));
      if (weird < 0.2){ S.flags.oddBuyer = (S.flags.oddBuyer||0)+1; S.facts.push('黑市出現一名異常買家，記得留意'); }
      closeModal(); refreshMarket(); save(); render(); toast('成交 ' + fmt(bid));
    };
    $('no-blk').onclick = ()=>{ applyEff(s, {mood:-5, obedience:-2}, 1); closeModal(); save(); render(); toast('你把 ' + s.name + ' 帶回家'); };
  }
}

async function actAuction(sid){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  const base = blackFloor(s);
  const bidders = [];
  const n = rint(2,3);
  for (let i=0;i<n;i++){
    const b = pick(BLACK_MARKET_BUYERS);
    const mul = rint(60,180)/100;
    bidders.push({ n:b.n, d:b.d, p: Math.round(base*mul) });
  }
  bidders.sort((a,b)=>b.p-a.p);
  modal('<h3>今晚的拍賣台</h3><p>' + s.name + ' 被帶上台。</p>'
    + bidders.map((b,i)=>'<div class="card"><h4>' + b.n + ' <span class="tag g">' + fmt(b.p) + '</span></h4><p>' + b.d + '</p>'
      + '<button class="btn tiny" data-take="' + i + '">賣給他</button></div>').join('')
    + '<button class="btn ghost" id="au-none" style="margin-top:8px">帶回家</button>');
  document.querySelectorAll('[data-take]').forEach(btn=> btn.onclick = ()=>{
    const b = bidders[parseInt(btn.dataset.take)];
    S.money += b.p;
    S.succubi = S.succubi.filter(x=>x.id!==sid);
    S.flags.auctionsWon = (S.flags.auctionsWon||0)+1;
    S.facts.push('第' + S.day + '天 ' + s.name + ' 於黑市拍賣以 ' + fmt(b.p) + ' 成交');
    closeModal(); refreshMarket(); save(); render(); toast('成交 ' + fmt(b.p));
  });
  $('au-none').onclick = ()=>{ applyEff(s,{mood:-6,obedience:-3},1); closeModal(); save(); render(); toast(s.name + ' 跟你回家了'); };
}

function actMove(hid){
  const h = HOUSES.find(x=>x.id===hid); if (!h) return;
  const cost = h.type==='rent' ? h.rent*2 : h.price;
  if (S.money < cost){ toast('資金不足'); return; }
  S.money -= cost;
  S.housing = deep(h);
  if (h.type==='rent') S.housing.rent = Math.round(h.rent * (DISTRICTS.find(d=>d.id===S.district)||{rent:1}).rent);
  S.facts.push('第' + S.day + '天 搬到 ' + h.name);
  toast('已搬到 ' + h.name + '（-' + fmt(cost) + '）');
  save(); render();
}

function actGoto(did){
  S.district = did;
  toast('你移動到 ' + dist().name);
  refreshMarket(); save(); render();
}

function refreshMarket(){
  if(!S) return;
  const pool = Object.keys(RACES);
  const mk = src => {
    const out = [];
    const n = src==='official' ? 2 : 3;
    for (let i=0;i<n;i++){
      const rid = pick(pool.filter(r=> !(src==='official' && RACES[r].rare) || Math.random()<0.15));
      const lv = Math.random()<0.15 ? rint(3,4) : rint(1,2);
      const s = rollSuccubus(rid, { level: lv, defect: src==='black' && Math.random()<0.3 ? pick(DEFECTS).id : null });
      s.price = officialBuyPrice(rid);
      s.blackPrice = blackBuyPrice(rid);
      out.push(s);
    }
    return out;
  };
  S.market = { official: (S.day % 7 === 0 ? [] : mk('official')), black: Math.random()<0.85 ? mk('black') : [] };
}

function checkSellReminder(){
  if (S && S.money < dailyUpkeep()*3) toast('資金偏低，注意日結算');
}

function doSleep(){
  if (busy) return;
  if (S.flags.gameOver) return;
  endDay();
  save();
  if (S.flags.gameOver){
    render();
    modal('<h3>破產</h3><p>結算後資金見底。這一輪飼育到此結束。</p>'
      + '<button class="btn" onclick="closeModal()">知道了</button>');
    return;
  }
  render();
  showTab('home');
  toast('第 ' + S.day + ' 天開始（' + PHASES[0] + '）');
}

function start(){
  const tabbar = $('tabbar');
  if (tabbar) {
    tabbar.addEventListener('click', e=>{
      const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab);
    });
  }
  const modalEl = $('modal');
  if (modalEl) {
    modalEl.addEventListener('click', e=>{ if (e.target.id==='modal') closeModal(); });
  }
  const btnComp = $('btn-compress');
  if (btnComp) {
    btnComp.onclick = async ()=>{
      if (!S.ai.apiKey){ toast('請先設定 API Key'); return; }
      toast('壓縮中…'); await compressStory(); render();
    };
  }
  const freeSend = $('free-send');
  if (freeSend) {
    freeSend.onclick = ()=>{
      const v = $('free-input').value.trim(); if (!v) return;
      $('free-input').value = ''; choose('（自由描述）' + v);
    };
  }
  const homeChoices = $('home-choices');
  if (homeChoices) {
    homeChoices.addEventListener('click', e=>{
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.choice) return choose(b.dataset.choice);
      if (b.dataset.act==='sleep') return doSleep();
      if (b.dataset.act==='restart') return resetToSetup();
    });
  }
  setInterval(()=>{ if (S) save(); }, 20000);

  const sv = load();
  if (sv){
    S = sv;
    if(!S.settings) S.settings = {};
    S.settings.appName = S.settings.appName || '緋夜飼育錄';
    refreshMarket();
    render();
    showTab('home');
  } else {
    resetToSetup();
  }
}

document.addEventListener('DOMContentLoaded', start);

