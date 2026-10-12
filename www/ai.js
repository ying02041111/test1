/* ==========================================================
   AI 層：純文字劇情驅動 + 雙軌氛圍 + 數據指令與權限檢查
   ========================================================== */

const PROVIDERS = {
  openai:     { label:'OpenAI',       base:'https://api.openai.com/v1',                        model:'gpt-4o-mini', json:true },
  gemini:     { label:'Google Gemini',base:'https://generativelanguage.googleapis.com/v1beta', model:'gemini-flash-latest', json:true, kind:'gemini' },
  openrouter: { label:'OpenRouter',   base:'https://openrouter.ai/api/v1',                     model:'', json:true },
  deepseek:   { label:'DeepSeek',     base:'https://api.deepseek.com/v1',                      model:'deepseek-chat', json:true },
  groq:       { label:'Groq',         base:'https://api.groq.com/openai/v1',                   model:'llama-3.3-70b-versatile', json:true },
  custom:     { label:'自訂',         base:'',                                                 model:'', json:false },
};

function estTokens(str){ return Math.round((str||'').length * 0.8); }

async function aiChat(system, user){
  const cfg = S.ai;
  if (!cfg.apiKey) throw new Error('尚未設定 API Key（請至「設定」分頁填寫）');
  const P = PROVIDERS[cfg.provider] || PROVIDERS.custom;
  const kind = P.kind || 'openai';

  if (kind === 'gemini'){
    const url = cfg.baseUrl.replace(/\/$/,'') + '/models/' + cfg.model + ':generateContent?key=' + encodeURIComponent(cfg.apiKey);
    const body = {
      systemInstruction: { parts:[{ text: system }] },
      contents: [{ role:'user', parts:[{ text: user }] }],
      generationConfig: { temperature: cfg.temp, maxOutputTokens: cfg.maxTokens,
        ...(cfg.jsonMode ? { responseMimeType:'application/json' } : {}) }
    };
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('AI 錯誤 ' + r.status + '：' + (await r.text()).slice(0,180));
    const d = await r.json();
    const c = d.candidates && d.candidates[0];
    return (c && c.content && c.content.parts && c.content.parts.map(p=>p.text||'').join('')) || '';
  }

  const body = {
    model: cfg.model, temperature: cfg.temp, max_tokens: cfg.maxTokens,
    messages: [ { role:'system', content: system }, { role:'user', content: user } ],
  };
  if (cfg.jsonMode && P.json) body.response_format = { type:'json_object' };
  const r = await fetch(cfg.baseUrl.replace(/\/$/,'') + '/chat/completions', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + cfg.apiKey },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error('AI 錯誤 ' + r.status + '：' + (await r.text()).slice(0,180));
  const d = await r.json();
  return (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
}

/* ---------- 系統提示：雙軌氛圍控管 ---------- */
function sysPrompt(action){
  const lang = S.settings.lang === 'hans' ? '簡體中文' : '繁體中文';
  const rank = masterRankInfo();
  
  // 判斷是否為「親密/訓練」情境
  const isIntimate = (action || '').includes('訓練') || (action || '').includes('自留') || (action || '').includes('親密') || (action || '').includes('使用');

  const tones = [
    '含蓄：情慾以氣氛、距離、眼神為主，點到為止。',
    '成熟：情慾張力與暗示寫滿，寫身體反應與呼吸，過程以氣氛帶過。',
    '濃烈：把張力推到極限，佔有慾、粗口、痛與血可寫，仍不寫器官級直白描寫。'
  ];

  const atmosphereRule = isIntimate
    ? '【氛圍模式：親密與訓練】此時為私人親密或訓練場合。展現濃烈情慾張力、肢體接觸、體溫、呼吸急促與佔有慾描寫。' + tones[clamp(S.settings.tone,0,2)-1]
    : '【氛圍模式：日常生活感】此時為普通街區、巡視、交易或閒聊場合。保持乾淨、自然、有生活感（Slice-of-Life）的都市奇幻風格，不無故賣弄情慾。';

  return [
'你是文字冒險遊戲《緋夜飼育錄》的敘事引擎。玩家是魅魔飼育員。',
'【硬規則】所有角色皆為成年虛構個體；不出現未成年角色、不寫器官級直白描寫。',
'【語言】' + lang + '。',
'【風格】第二人稱「你」。感性、貼近情緒，不要企劃書腔、不要列點。',
atmosphereRule,
'【主控階級與訓練風格】主控階級：' + rank.name + '（Rank ' + rank.rank + '）。風格：' + S.master.style + '。故事背景：' + S.master.story + '。劇情寫作必須完全符合主控風格。',
'【關係與外型鐵則】',
'1. 關係必須由陌生慢慢累積。剛認識的魅魔會保持距離、話少、試探、觀察你；親密度必須嚴格符合「關係階段」。禁止一見鍾情。',
'2. 必須遵照情境給予的「魅魔人物卡」描寫其外型（髮色、眼色、特徵、氣味）與雙重個性（表個性 + 隱藏反差），絕對不能憑空竄改外貌。',
'3. 只有「自留」魅魔能發展深度情感與親密劇情；非自留魅魔僅能進行擦邊描寫。',
'【劇情觸發交易與數據】',
'若玩家在劇情中做出購買魅魔、購買道具、使用道具或展現權力的行為，你可在 JSON 中輸出對應指令：',
'{"scene":"劇情文字","is_major_event":false,"choices":["選項1","選項2"],"buy_succubus_id":"m1","buy_item_id":"nectar","use_item_id":"nectar","target_succubus_id":"s1","gain_power":0,"effects":[{"id":"s1","mood":3,"rel":1}],"facts":["關鍵事實"]}',
'is_major_event: 若此行動為遠行、深度訓練、重大交易等耗時活動設為 true（推進時段）；普通問答或逛街設為 false。',
'choices: 提供 1~4 個具體選項（6~18字）。若玩家在飼育所，選項要包含「訓練」或「餵食」等互動方向。'
  ].join('\n');
}

function ctxPrompt(action){
  const L = [];
  const d = dist();
  const rank = masterRankInfo();

  L.push('【主控】' + S.master.title + '（' + S.master.gender + '）｜階級：' + rank.name + '｜風格：' + S.master.style + '｜資金 ' + Math.round(S.money) + '｜體力 ' + S.stamina + '/' + maxStamina() + '｜權力 ' + S.power);
  L.push('【現況】第' + S.day + '天 ' + PHASES[S.phase] + ' (' + ((S.subPhase||0)+1) + '/3)｜' + d.name + '｜住所：' + (S.housing?S.housing.name+'（上限'+capacity()+'隻）':'無'));
  L.push('【當前街區可購道具】' + shopItems().map(k=>k+'='+ITEMS[k].name+'('+fmt(effectivePrice(ITEMS[k].price))+')').join('、'));
  L.push('【當前街區可購食物】' + shopFoods().map(k=>k+'='+FOODS[k].name+'('+fmt(foodPrice(k))+')').join('、'));

  if (S.succubi.length){
    L.push('【玩家擁有的魅魔卡】' + S.succubi.map(s=>{
      const R = RACES[s.race] || RACES.nightwing, st = stageOf(s);
      return s.id + '=' + s.name + '(' + R.name + '|' + gradeOf(s.level) + '級|魅' + s.charm + '|服' + s.obedience
        + '|關係' + (s.rel||0) + '|階段:' + st.name + '|表個性:' + s.persona + '|隱藏反差:' + (s.hiddenBias||'無')
        + '|成長率:' + (s.relRate||1.0) + 'x|外貌:' + s.look
        + (s.kept ? '|自留' : '|暫契約') + ')';
    }).join('\n'));
  } else {
    L.push('【玩家擁有的魅魔】無。玩家需要去市場購買第一隻魅魔。');
  }

  const off = S.market.official || [], blk = S.market.black || [];
  if (off.length || blk.length){
    L.push('【市場待售魅魔卡（只可提及與購買這些）】'
      + (off.length ? '\n官方：' + off.map(m=>m.id+'='+m.name+'('+RACES[m.race].name+'|'+gradeOf(m.level)+'級|價格:'+fmt(m.price)+'|外貌:'+m.look+'|個性:'+m.persona+')').join('\n') : '')
      + (blk.length ? '\n黑市：' + blk.map(m=>m.id+'='+m.name+'('+RACES[m.race].name+'|'+gradeOf(m.level)+'級|價格:'+fmt(m.blackPrice)+'|外貌:'+m.look+'|個性:'+m.persona+')').join('\n') : ''));
  }

  if (S.facts.length) L.push('【劇情錨點】\n- ' + S.facts.slice(-12).join('\n- '));
  if (S.summary) L.push('【前情摘要】' + S.summary);
  const recent = S.log.filter(x=>!x.sys).slice(-(S.settings.keepRecent||3));
  if (recent.length) L.push('【最近劇情】' + recent.map(x=>'（第'+x.d+'天）'+(x.chosen?'[選擇:'+x.chosen+'] ':'')+x.text).join('\n'));
  if (action) L.push('【本回合行動】' + action);
  L.push('請推進下一段劇情，嚴格遵循氛圍模式與魅魔人物卡。');
  return L.join('\n');
}

function parseScene(raw){
  let t = (raw||'').trim();
  t = t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i >= 0 && j > i){
    try{
      const o = JSON.parse(t.slice(i, j+1));
      return {
        scene: String(o.scene || o.text || '').trim() || '（場面一時凝住。）',
        is_major_event: !!o.is_major_event,
        choices: (Array.isArray(o.choices)?o.choices:[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,4),
        buy_succubus_id: o.buy_succubus_id || null,
        buy_item_id: o.buy_item_id || null,
        use_item_id: o.use_item_id || null,
        target_succubus_id: o.target_succubus_id || null,
        gain_power: typeof o.gain_power==='number'? o.gain_power : 0,
        effects: Array.isArray(o.effects)?o.effects:[],
        facts: (Array.isArray(o.facts)?o.facts:[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,4),
      };
    }catch(e){}
  }
  return { scene: t.slice(0,600) || '（場面一時凝住。）', is_major_event:false, choices: [], effects: [], facts: [] };
}

/* 處理 AI 回傳指令與權限檢查 */
function processAICommands(sc){
  const rank = masterRankInfo();

  if (sc.gain_power > 0){
    S.power += sc.gain_power;
    toast('權力值 +' + sc.gain_power);
    gainMasterExp(15);
  }

  // AI 觸發購買魅魔意圖 → 觸發二階段確定彈窗
  if (sc.buy_succubus_id){
    const off = S.market.official || [], blk = S.market.black || [];
    let m = off.find(x=>x.id===sc.buy_succubus_id), src='official';
    if (!m){ m = blk.find(x=>x.id===sc.buy_succubus_id); src='black'; }
    if (m && window.promptBuySuccubus){
      window.promptBuySuccubus(m, src);
    }
  }

  // AI 觸發購買道具意圖 → 觸發二階段確定彈窗
  if (sc.buy_item_id){
    const k = sc.buy_item_id;
    if ((ITEMS[k] || FOODS[k]) && window.promptBuyItem){
      window.promptBuyItem(k, !!FOODS[k]);
    }
  }

  // AI 觸發使用道具
  if (sc.use_item_id && sc.target_succubus_id){
    const k = sc.use_item_id, sid = sc.target_succubus_id;
    const s = S.succubi.find(x=>x.id===sid);
    const item = ITEMS[k];

    if (s && item){
      // 權限檢查：黑市 Plus 道具需要 Rank 3 資深訓練師
      if (item.isPlus && !rank.allowPlusItems){
        toast('⚠️ 主控等級不足（需要資深訓練師 Rank 3），無法使用 Plus 版道具！');
        return;
      }
      // 權限檢查：每日殘酷道具計數
      if (item.kind === 'harsh'){
        const used = S.flags.harshUsedToday || 0;
        if (used >= rank.harshLimitPerDay){
          toast('⚠️ 今日殘酷道具使用已達上限（' + rank.harshLimitPerDay + ' 次/天）');
          return;
        }
        S.flags.harshUsedToday = used + 1;
      }

      if (S.bag[k] > 0){
        S.bag[k]--; if(!S.bag[k]) delete S.bag[k];
        const log = applyEff(s, item.eff, 1);
        gainMasterExp(20);
        toast(s.name + ' 使用 ' + item.name + '：' + log);
        flashScreen();
      }
    }
  }
}

async function advanceScene(action){
  const raw = await aiChat(sysPrompt(action), ctxPrompt(action));
  const sc = parseScene(raw);
  
  processAICommands(sc);

  if (sc.effects.length){
    sc.effects.forEach(e=>{
      if(!e||!e.id) return;
      const s = S.succubi.find(x=>x.id===e.id);
      if(s) applyEff(s, { mood:e.mood||0, obedience:e.obedience||0, rel:e.rel||0, charm:e.charm||0 });
    });
  }

  if (sc.facts.length) sc.facts.forEach(f=>{ if (S.facts.indexOf(f)<0) S.facts.push(f); });
  
  S.log.push({ d:S.day, p:PHASES[S.phase], text: sc.scene, chosen: action||'', choices: sc.choices });
  
  // 動態時間流逝
  advanceTime(sc.is_major_event || (action||'').includes('前往') || (action||'').includes('訓練'));
  
  save();
  return sc;
}

async function compressStory(silent){
  const scenes = S.log.filter(x=>!x.sys);
  const keep = S.settings.keepRecent || 3;
  if (scenes.length <= keep + 1){ if(!silent) toast('還沒有需要壓縮的段落'); return 0; }
  const old = scenes.slice(0, scenes.length - keep);
  const meat = old.map(x=>'（第'+x.d+'天）'+(x.chosen?('[選] '+x.chosen+' ') : '')+x.text).join('\n').slice(-9000);
  const sys = '你是文字冒險存檔整理器。濃縮舊劇情為摘要，保留人物關係階段、承諾、債務、金錢流向、主線推進。只輸出JSON：{"summary":"400~700字摘要","facts":["關鍵事實"]}';
  const usr = '【已有摘要】' + (S.summary || '無') + '\n【舊段落】\n' + meat;
  let o = {};
  try { o = parseScene(await aiChat(sys, usr)); }
  catch(e){ toast('壓縮失敗：' + e.message); return 0; }
  S.summary = (o.scene||'').slice(0,1200);
  (o.facts||[]).forEach(f=>{ if (S.facts.indexOf(f)<0) S.facts.push(f); });
  const removed = old.length;
  S.log = S.log.filter(x => x.sys || old.indexOf(x) < 0);
  save();
  if(!silent) toast('已壓縮 ' + removed + ' 段');
  return removed;
}

function tokenEstimate(){ return estTokens(sysPrompt('')) + estTokens(ctxPrompt('')) + 260; }
