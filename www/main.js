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
  + '<div class="field"><label>你的稱呼（魅魔怎麼叫你）</label><input id="b-title" value="主人"></div>'
  + '<div class="field"><label>你的性別</label><div class="seg" id="b-gender">'
  + '<button data-g="男性">男性</button><button data-g="女性" class="on">女性</button><button data-g="不指定">不指定</button></div></div>'
  + '<div class="field"><label>你的名字（敘事用，可留空）</label><input id="b-name" placeholder="留空則以稱呼代替"></div>'
  + '<p style="font-size:11.5px;color:#9b8fa6;line-height:1.7">起始資金 ₡4,800，住在舊港區的廉租單間（週租 ₡350）。'
  + '領養第一隻魅魔之後，飼育生活才真正開始——而你們，還只是陌生人。</p>'
  + '<button class="btn" id="b-start" style="width:100%;margin-top:8px">前往官方領養所</button></div>';

  b.querySelectorAll('#b-gender button').forEach(x=>x.onclick=()=>{
    b.querySelectorAll('#b-gender button').forEach(y=>y.classList.remove('on')); x.classList.add('on');
  });

  const startBtn = $('b-start');
  if (startBtn){
    startBtn.onclick = async ()=>{
      try{
        const gb = b.querySelector('#b-gender button.on');
        const title = $('b-title').value.trim() || '主人';
        newGame({ name: $('b-name').value.trim() || title, gender: gb?gb.dataset.g:'女性', title });
        b.classList.add('off');
        refreshMarket();
        render(); showTab('market');
        toast('已建立存檔，帶你去官方領養所');
        await openingScene();
      }catch(err){ alert('啟動出錯：' + err.message); }
    };
  }
}

async function openingScene(){
  if (!S || !S.ai || !S.ai.apiKey){
    if (S && S.log){
      S.log.push({ d:1, p:'清晨',
        text:'你在官方領養所門口停下。玻璃窗後坐著幾隻等待登記的魅魔，她們抬起頭看你一眼，又各自移開視線——沒有人認識你。',
        chosen:'前往領養所', choices:['走進大廳','先在窗外看一會'] });
      save();
    }
    render(); return;
  }
  setBusy(true, 'AI 正在鋪陳開場…');
  try{
    await advanceScene('第一天清晨，我（' + S.master.title + '）第一次走進官方領養所，來看今天市場上登記的魅魔。請依「市場現貨」清單裡真實存在的那幾隻來寫，她們對我是完全陌生的，態度保持距離與打量。');
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
  try{ await advanceScene(c); checkSellReminder(); }
  catch(e){ toast(e.message); }
  setBusy(false); render();
}

/* ---------- 餵食 / 道具 / 訓練 ---------- */
function actFeed(sid, fid){
  const s = S.succubi.find(x=>x.id===sid); if (!s || !(S.food[fid]>0)) return;
  S.food[fid]--; if (!S.food[fid]) delete S.food[fid];
  const f = FOODS[fid], pref = (RACES[s.race].food === fid);
  const log = applyEff(s, { fullness: Math.round(f.fill * (pref?1.5:0.6)), mood: pref?8:-4 }, 1);
  toast(s.name + '：' + log); flashScreen();
  save(); render();
}

function actItem(sid, iid){
  const s = S.succubi.find(x=>x.id===sid); if (!s || !(S.bag[iid]>0)) return;
  const it = ITEMS[iid];
  if (it.kind==='harsh' && !S.settings.harshItems) return;
  S.bag[iid]--; if (!S.bag[iid]) delete S.bag[iid];
  const log = applyEff(s, it.eff, 1);
  toast(s.name + '：' + log); flashScreen();
  S.log.push({ d:S.day, p:PHASES[S.phase],
    text: (it.kind==='harsh'
      ? '你取出' + it.name + '。金屬先吃掉她的體溫，' + s.name + '的呼吸亂了一拍，然後整個人安靜下來，只剩很輕的、咬著牙的抽氣聲。'
      : '你把' + it.name + '用在' + s.name + '身上。她沒有立刻反應，只是先看了你的手一眼，然後才慢慢把視線移開。'),
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
  toast(s.name + ' 訓練完成：' + log); flashScreen();
  save(); render();
}

function actKept(sid){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  S.succubi.forEach(x=> x.kept=false);
  s.kept = true;
  S.facts.push(s.name + ' 成為自留魅魔（第' + S.day + '天）');
  toast(s.name + ' 成為你的自留魅魔'); flashScreen();
  save(); render();
}

function actPermanent(sid){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  if ((s.rel||0) < 60){ toast('關係需達 60（目前 ' + (s.rel||0) + '）'); return; }
  s.contract = 'permanent';
  S.facts.push(s.name + ' 與主人簽下永久契約（第' + S.day + '天）');
  toast(s.name + ' 簽下永久契約'); flashScreen();
  save(); render();
}

/* ---------- 購買 ---------- */
function actBuyItem(k){
  const p = effectivePrice(ITEMS[k].price);
  if (S.money < p){ toast('資金不足'); return; }
  S.money -= p; S.bag[k] = (S.bag[k]||0)+1;
  toast('購入 ' + ITEMS[k].name + '（-' + fmt(p) + '）'); flashScreen(); save(); render();
}
function actBuyFood(k){
  const p = foodPrice(k);
  if (S.money < p){ toast('資金不足'); return; }
  S.money -= p; S.food[k] = (S.food[k]||0)+1;
  toast('購入 ' + FOODS[k].name + '（-' + fmt(p) + '）'); flashScreen(); save(); render();
}

/* ---------- 領養魅魔（修正版：用 id 精準比對、買完從市場移除） ---------- */
function actBuySuccubus(id, src){
  try{
    const list = (src==='official' ? S.market.official : S.market.black) || [];
    const m = list.find(x=>x.id===id);
    if (!m){ toast('這隻已經不在名單上了'); return; }
    const price = src==='official' ? m.price : m.blackPrice;
    if (S.succubi.length >= capacity()){ toast('住所已滿（上限 ' + capacity() + '），先搬家或賣掉一隻'); return; }
    if (S.money < price){ toast('資金不足（需要 ' + fmt(price) + '）'); return; }

    const R = RACES[m.race];
    modal('<h3>' + (src==='official'?'官方領養':'黑市交易') + '</h3>'
      + '<div class="card"><h4>' + esc(m.name) + ' ' + gradeTag(m.level) + '</h4>'
      + '<p>' + R.name + '｜' + esc(m.persona) + '｜魅惑 ' + m.charm + '｜服從 ' + m.obedience + '</p>'
      + '<div class="look">' + esc(m.look) + '</div>'
      + '<div class="eff">費用：<b class="minus">-' + fmt(price) + '</b>　餘額：<b>' + fmt(S.money - price) + '</b>'
      + (src==='black' ? '<br>黑市貨源有風險，缺陷機率約三成。' : '<br>官方會附上健康與契約證明。') + '</div></div>'
      + '<div class="tags"><button class="btn" id="ok-buy">確認' + (src==='official'?'領養':'買下') + '</button>'
      + '<button class="btn ghost" onclick="closeModal()">再想想</button></div>');

    $('ok-buy').onclick = async ()=>{
      try{
        const l2 = (src==='official' ? S.market.official : S.market.black) || [];
        const idx = l2.findIndex(x=>x.id===id);
        if (idx < 0){ toast('這隻已經被領走了'); closeModal(); return; }
        // 扣款 → 從市場移除 → 加入隊伍
        S.money -= price;
        l2.splice(idx, 1);
        let defect = null;
        if (src==='black' && Math.random() < 0.34) defect = pick(DEFECTS).id;
        const s = rollSuccubus(m.race, { name:m.name, persona:m.persona, level:m.level, defect, look:m.look });
        s.charm = m.charm; s.obedience = m.obedience; s.look = m.look;
        S.succubi.push(s);
        S.facts.push('第' + S.day + '天' + (src==='official'?'官方領養':'黑市購入') + ' ' + s.name + '（' + R.name + '），彼此仍是陌生。');
        if (defect) toast('黑市貨源有問題…' + s.name + ' 帶有「' + s.defect + '」');
        save(); closeModal(); flashScreen(); render();
        toast(s.name + ' 已加入你的飼育所（-' + fmt(price) + '）');

        if (S.ai && S.ai.apiKey){
          busy = true; render();
          try{
            await advanceScene((src==='official'
              ? '我剛在官方領養所辦完手續，把 ' + s.name + ' 帶回住處。'
              : '我在黑市付完錢，把 ' + s.name + ' 帶回住處。')
              + '這是我們第一次單獨相處，她對我完全陌生。請寫她進門後那一小段，保持距離感。');
          }catch(e){ toast(e.message); }
          busy = false; render();
        }
      }catch(err){ alert('領養出錯：' + err.message); }
    };
  }catch(err){ alert('領養出錯：' + err.message); }
}

/* ---------- 販售 ---------- */
function actSell(sid, ch){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  if (ch==='official'){
    const p = officialOffer(s);
    modal('<h3>官方收養</h3><p>官方會安排適合的主人，並保障魅魔的處置權。收購價 ' + fmt(p) + '。</p>'
      + '<div class="tags"><button class="btn" id="ok-sell">確定送出</button><button class="btn ghost" onclick="closeModal()">取消</button></div>');
    $('ok-sell').onclick = ()=>{
      S.money += p;
      S.succubi = S.succubi.filter(x=>x.id!==sid);
      S.facts.push('第' + S.day + '天 ' + s.name + ' 被官方收養');
      closeModal(); flashScreen(); save(); render(); toast(s.name + ' 已送往官方（+' + fmt(p) + '）');
    };
  } else {
    const floor = blackFloor(s), weird = Math.random();
    const bid = Math.round(floor * (weird<0.2 ? rint(150,230)/100 : rint(60,140)/100));
    const buyer = pick(BLACK_MARKET_BUYERS);
    modal('<h3>黑市拍賣</h3><p>買家：' + buyer.n + '（' + buyer.d + '）</p>'
      + '<div class="rows"><div><span>起標</span><span>' + fmt(floor) + '</span></div>'
      + '<div><span>目前出價</span><span>' + fmt(bid) + '</span></div>'
      + '<div><span>風險</span><span>' + (weird<0.2?'高':'中') + '</span></div></div>'
      + '<div class="tags"><button class="btn" id="ok-blk">成交</button><button class="btn ghost" id="no-blk">帶回家</button></div>');
    $('ok-blk').onclick = ()=>{
      S.money += bid;
      S.succubi = S.succubi.filter(x=>x.id!==sid);
      S.facts.push('第' + S.day + '天 ' + s.name + ' 被黑市賣出，價格 ' + fmt(bid));
      if (weird < 0.2){ S.flags.oddBuyer = (S.flags.oddBuyer||0)+1; S.facts.push('黑市出現一名異常買家，值得留意'); }
      closeModal(); flashScreen(); save(); render(); toast('成交 ' + fmt(bid));
    };
    $('no-blk').onclick = ()=>{ applyEff(s,{mood:-5,obedience:-2},1); closeModal(); save(); render(); toast('你把 ' + s.name + ' 帶回家'); };
  }
}

function actAuction(sid){
  const s = S.succubi.find(x=>x.id===sid); if (!s) return;
  const base = blackFloor(s), bidders = [];
  for (let i=0;i<rint(2,3);i++){
    const b = pick(BLACK_MARKET_BUYERS);
    bidders.push({ n:b.n, d:b.d, p: Math.round(base * rint(60,180)/100) });
  }
  bidders.sort((a,b)=>b.p-a.p);
  modal('<h3>今晚的拍賣台</h3><p>' + s.name + ' 被帶上台。檯燈很亮，她沒有看你。</p>'
    + bidders.map((b,i)=>'<div class="card"><h4>' + b.n + ' <span class="tag g">' + fmt(b.p) + '</span></h4><p>' + b.d + '</p>'
      + '<button class="btn tiny" data-take="' + i + '">賣給他</button></div>').join('')
    + '<button class="btn ghost" id="au-none" style="margin-top:8px">全部拒絕，帶回家</button>');
  document.querySelectorAll('[data-take]').forEach(btn=> btn.onclick = ()=>{
    const b = bidders[parseInt(btn.dataset.take)];
    S.money += b.p;
    S.succubi = S.succubi.filter(x=>x.id!==sid);
    S.facts.push('第' + S.day + '天 ' + s.name + ' 於黑市拍賣以 ' + fmt(b.p) + ' 成交');
    closeModal(); flashScreen(); save(); render(); toast('成交 ' + fmt(b.p));
  });
  $('au-none').onclick = ()=>{ applyEff(s,{mood:-6,obedience:-3},1); closeModal(); save(); render(); toast(s.name + ' 跟你回家了'); };
}

/* ---------- 搬家 / 前往 ---------- */
function actMove(hid){
  const h = HOUSES.find(x=>x.id===hid); if (!h) return;
  const cost = h.type==='rent' ? h.rent*2 : h.price;
  if (S.money < cost){ toast('資金不足（需要 ' + fmt(cost) + '）'); return; }
  S.money -= cost;
  S.housing = deep(h);
  S.district = h.district;      // 搬遷即前往該街區
  if (h.type==='rent') S.housing.rent = h.rent;
  S.facts.push('第' + S.day + '天 搬到 ' + DISTRICTS.find(d=>d.id===h.district).name + ' 的 ' + h.name);
  toast('已搬入 ' + h.name + '（-' + fmt(cost) + '）'); flashScreen();
  refreshMarket(); save(); render();
}

function actGoto(did){
  S.district = did;
  toast('你移動到 ' + dist().name); flashScreen();
  refreshMarket(); save(); render();
}

/* ---------- 市場刷新 ---------- */
function refreshMarket(){
  if (!S) return;
  const pool = Object.keys(RACES);
  const mk = src => {
    const out = [], n = src==='official' ? 2 : 3;
    for (let i=0;i<n;i++){
      const avail = pool.filter(r => !(src==='official' && RACES[r].rare) || Math.random()<0.15);
      const rid = pick(avail);
      const lv = Math.random()<0.18 ? rint(3,4) : rint(1,2);
      const s = rollSuccubus(rid, { level: lv, defect: (src==='black' && Math.random()<0.3) ? pick(DEFECTS).id : null });
      s.price = officialBuyPrice(rid);
      s.blackPrice = blackBuyPrice(rid);
      out.push(s);
    }
    return out;
  };
  S.market = { official: (S.day % 7 === 0 ? [] : mk('official')), black: (Math.random()<0.85 ? mk('black') : []) };
}

function checkSellReminder(){ if (S && S.money < dailyUpkeep()*3) toast('資金偏低，注意日結算'); }

function doSleep(){
  if (busy || S.flags.gameOver) return;
  endDay(); save();
  if (S.flags.gameOver){
    render();
    modal('<h3>破產</h3><p>結算後資金見底。住所的燈被切了，魅魔們站在門邊看著你。<br><br>這一輪飼育到此結束。</p>'
      + '<button class="btn" onclick="closeModal()">知道了</button>');
    return;
  }
  render(); showTab('home');
  toast('第 ' + S.day + ' 天開始（' + PHASES[0] + '）');
}

/* ---------- 啟動 ---------- */
function start(){
  const tabbar = $('tabbar');
  if (tabbar) tabbar.addEventListener('click', e=>{
    const b = e.target.closest('button[data-tab]'); if (b) showTab(b.dataset.tab);
  });
  const modalEl = $('modal');
  if (modalEl) modalEl.addEventListener('click', e=>{ if (e.target.id==='modal') closeModal(); });

  const btnComp = $('btn-compress');
  if (btnComp) btnComp.onclick = async ()=>{
    if (!S.ai.apiKey){ toast('請先設定 API Key'); return; }
    toast('壓縮中…'); await compressStory(); render();
  };
  const freeSend = $('free-send');
  if (freeSend) freeSend.onclick = ()=>{
    const v = $('free-input').value.trim(); if (!v) return;
    $('free-input').value = ''; choose('（自由描述）' + v);
  };
  const homeChoices = $('home-choices');
  if (homeChoices) homeChoices.addEventListener('click', e=>{
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.choice) return choose(b.dataset.choice);
    if (b.dataset.act==='sleep') return doSleep();
    if (b.dataset.act==='restart') return resetToSetup();
  });
  setInterval(()=>{ if (S) save(); }, 20000);

  const sv = load();
  if (sv){
    S = sv;
    refreshMarket();
    render(); showTab('home');
    const bootEl = $('boot'); if (bootEl) bootEl.classList.add('off');
  } else {
    resetToSetup();
  }
}

document.addEventListener('DOMContentLoaded', start);
