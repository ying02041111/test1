/* ==========================================================
   動作層：遊戲邏輯與交互
   ========================================================== */

function resetToSetup(){
  var b = $('boot'); if (!b) return;
  b.classList.remove('off');
  b.innerHTML = '<div style="width:88%;max-width:420px">'
  + '<h2 style="color:#e08aa3;letter-spacing:.1em;text-align:center;margin:0 0 4px">緋夜飼育錄</h2>'
  + '<p style="color:#9b8fa6;font-size:12px;text-align:center;margin-bottom:18px">飼育員登記表</p>'
  + '<div class="field"><label>你的稱呼（魅魔怎麼叫你）</label><input id="b-title" value="主人"></div>'
  + '<div class="field"><label>你的性別</label><div class="seg" id="b-gender">'
  + '<button data-g="男性">男性</button><button data-g="女性" class="on">女性</button><button data-g="不指定">不指定</button></div></div>'
  + '<div class="field"><label>你的名字（敘事用，可留空）</label><input id="b-name" placeholder="留空則以稱呼代替"></div>'
  + '<p style="font-size:11.5px;color:#9b8fa6;line-height:1.7">起始資金 ₡4,800，住在舊港區的廉租單間（週租 ₡350）。'
  + '領養與飼育生活即將展開，你們將從完全陌生開始。</p>'
  + '<button class="btn" id="b-start" style="width:100%;margin-top:8px">開始經營飼育所</button></div>';

  b.querySelectorAll('#b-gender button').forEach(function(x){ x.onclick=function(){
    b.querySelectorAll('#b-gender button').forEach(function(y){ y.classList.remove('on'); }); x.classList.add('on');
  }; });

  var startBtn = $('b-start');
  if (startBtn){
    startBtn.onclick = async function(){
      try{
        var gb = b.querySelector('#b-gender button.on');
        var title = $('b-title').value.trim() || '主人';
        newGame({ name: $('b-name').value.trim() || title, gender: gb?gb.dataset.g:'女性', title: title });
        b.classList.add('off');
        refreshMarket();
        if (window.render) window.render();
        if (window.showTab) window.showTab('home');
        toast('經營開始，前往市場尋找第一隻魅魔');
        await openingScene();
      }catch(err){ alert('啟動出錯：' + err.message); }
    };
  }
}

async function openingScene(){
  if (!S || !S.ai || !S.ai.apiKey){
    if (S && S.log){
      S.log.push({ d:1, p:'清晨',
        text:'你在舊港區的飼育所醒來。今天該出門逛逛市場，或是四處走走。（尚未設定 API Key，請至「設定」填寫以開啟 AI 劇情。）',
        chosen:'開始第一天', choices:['前往市場看看待售的魅魔','前往商店購買物資','在附近巡視'] });
      save();
    }
    if (window.render) window.render(); return;
  }
  setBusy(true, 'AI 正在鋪陳開場…');
  try{
    await advanceScene('第一天清晨，我（' + S.master.title + '）剛接手這家飼育所。請寫一段開場，描寫周圍環境與我準備出門前往市場尋找魅魔的心情。');
  }catch(e){ toast(e.message); }
  setBusy(false); if (window.render) window.render();
}

function setBusy(on, msg){
  busy = on;
  var ch = $('home-choices');
  if (on && ch) ch.innerHTML = '<button disabled><span class="loading"></span>' + (msg||'AI 正在書寫…') + '</button>';
  else if (window.render) window.render();
}

async function choose(c){
  if (busy) return;
  if (!S.ai.apiKey){ toast('請先到設定填入 API Key'); return; }
  setBusy(true);
  try{ await advanceScene(c); checkSellReminder(); }
  catch(e){ toast(e.message); }
  setBusy(false); if (window.render) window.render();
}

function actFeed(sid, fid){
  var s = S.succubi.find(function(x){ return x.id===sid; }); if (!s || !(S.food[fid]>0)) return;
  S.food[fid]--; if (!S.food[fid]) delete S.food[fid];
  var f = FOODS[fid], pref = (RACES[s.race].food === fid);
  var log = applyEff(s, { fullness: Math.round(f.fill * (pref?1.5:0.6)), mood: pref?8:-4 }, 1);
  toast(s.name + '：' + log); flashScreen();
  save(); if (window.render) window.render();
}

function actItem(sid, iid){
  var s = S.succubi.find(function(x){ return x.id===sid; }); if (!s || !(S.bag[iid]>0)) return;
  var it = ITEMS[iid];
  if (it.kind==='harsh' && !S.settings.harshItems) return;
  S.bag[iid]--; if (!S.bag[iid]) delete S.bag[iid];
  var log = applyEff(s, it.eff, 1);
  toast(s.name + '：' + log); flashScreen();
  S.log.push({ d:S.day, p:PHASES[S.phase],
    text: (it.kind==='harsh'
      ? '你取出' + it.name + '。金屬觸感冰涼，' + s.name + '的呼吸亂了一拍，接著整個安靜下來。'
      : '你把' + it.name + '用在' + s.name + '身上。她看了你的手一眼，沒有退開。'),
    chosen:'使用' + it.name, choices:['繼續互動','收手休息'] });
  save(); if (window.render) window.render();
}

function actTrain(sid, tid){
  var s = S.succubi.find(function(x){ return x.id===sid; }), T = TRAININGS.find(function(t){ return t.id===tid; });
  if (!s || !T) return;
  if (S.stamina < T.cost){ toast('主控體力不足'); return; }
  if (s.stamina < Math.round(T.cost*0.8)){ toast(s.name + ' 太累了'); return; }
  if (s.fullness <= 0){ toast(s.name + ' 肚子餓，請先餵食'); return; }
  S.stamina -= T.cost;
  applyEff(s, { stamina: -Math.round(T.cost*0.8), fullness: -8 }, 1);
  var log = applyEff(s, T.eff, 1 + (houseBonus().train||0));
  gainExp(s, T.exp);
  toast(s.name + ' 訓練完成：' + log); flashScreen();
  save(); if (window.render) window.render();
}

function actKept(sid){
  var s = S.succubi.find(function(x){ return x.id===sid; }); if (!s) return;
  S.succubi.forEach(function(x){ x.kept=false; });
  s.kept = true;
  S.facts.push(s.name + ' 成為自留魅魔（第' + S.day + '天）');
  toast(s.name + ' 成為你的自留魅魔'); flashScreen();
  save(); if (window.render) window.render();
}

function actPermanent(sid){
  var s = S.succubi.find(function(x){ return x.id===sid; }); if (!s) return;
  if ((s.rel||0) < 60){ toast('關係需達 60（目前 ' + (s.rel||0) + '）'); return; }
  s.contract = 'permanent';
  S.facts.push(s.name + ' 與主人簽下永久契約（第' + S.day + '天）');
  toast(s.name + ' 簽下永久契約'); flashScreen();
  save(); if (window.render) window.render();
}

function actMove(hid){
  var h = HOUSES.find(function(x){ return x.id===hid; }); if (!h) return;
  var cost = h.type==='rent' ? h.rent*2 : h.price;
  if (S.money < cost){ toast('資金不足（需要 ' + fmt(cost) + '）'); return; }
  S.money -= cost;
  S.housing = deep(h);
  S.district = h.district;
  if (h.type==='rent') S.housing.rent = h.rent;
  S.facts.push('第' + S.day + '天 搬到 ' + DISTRICTS.find(function(d){ return d.id===h.district; }).name + ' 的 ' + h.name);
  toast('已搬入 ' + h.name + '（-' + fmt(cost) + '）'); flashScreen();
  refreshMarket(); save(); if (window.render) window.render();
}

function refreshMarket(){
  if (!S) return;
  var pool = Object.keys(RACES);
  var mk = function(src){
    var out = [], n = src==='official' ? 2 : 3;
    for (var i=0;i<n;i++){
      var avail = pool.filter(function(r){ return !(src==='official' && RACES[r].rare) || Math.random()<0.15; });
      var rid = pick(avail);
      var lv = Math.random()<0.18 ? rint(3,4) : rint(1,2);
      var s = rollSuccubus(rid, { level: lv, defect: (src==='black' && Math.random()<0.3) ? pick(DEFECTS).id : null });
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
    if (window.render) window.render();
    modal('<h3>破產</h3><p>資金見底，飼育所無法維持營運。<br><br>這一輪遊戲到此結束。</p>'
      + '<button class="btn" onclick="closeModal()">知道了</button>');
    return;
  }
  if (window.render) window.render();
  if (window.showTab) window.showTab('home');
  toast('第 ' + S.day + ' 天開始（' + PHASES[0] + '）');
}

function start(){
  var tabbar = $('tabbar');
  if (tabbar) tabbar.addEventListener('click', function(e){
    var b = e.target.closest('button[data-tab]'); if (b && window.showTab) window.showTab(b.dataset.tab);
  });
  var modalEl = $('modal');
  if (modalEl) modalEl.addEventListener('click', function(e){ if (e.target.id==='modal') closeModal(); });

  var btnComp = $('btn-compress');
  if (btnComp) btnComp.onclick = async function(){
    if (!S.ai.apiKey){ toast('請先設定 API Key'); return; }
    toast('壓縮中…'); await compressStory(); if (window.render) window.render();
  };
  var freeSend = $('free-send');
  if (freeSend) freeSend.onclick = function(){
    var v = $('free-input').value.trim(); if (!v) return;
    $('free-input').value = ''; choose('（自由描述）' + v);
  };
  var homeChoices = $('home-choices');
  if (homeChoices) homeChoices.addEventListener('click', function(e){
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.choice) return choose(b.dataset.choice);
    if (b.dataset.act==='sleep') return doSleep();
    if (b.dataset.act==='restart') return resetToSetup();
  });
  setInterval(function(){ if (S) save(); }, 20000);

  var sv = load();
  if (sv){
    S = sv;
    refreshMarket();
    if (window.render) window.render();
    if (window.showTab) window.showTab('home');
    var bootEl = $('boot'); if (bootEl) bootEl.classList.add('off');
  } else {
    resetToSetup();
  }
}

document.addEventListener('DOMContentLoaded', start);
