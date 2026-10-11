/* ==========================================================
   AI 層：只在「推進劇情 / 壓縮 / 開場 / 特殊場景」呼叫。
   切換分頁、買東西、餵食、訓練、日結算 → 全部走程式，不碰 AI。
   ========================================================== */

const PROVIDERS = {
  openai:     { label:'OpenAI',      base:'https://api.openai.com/v1',                        model:'gpt-4o-mini', json:true },
  gemini:     { label:'Google Gemini',base:'https://generativelanguage.googleapis.com/v1beta', model:'gemini-flash-latest', json:true, kind:'gemini' },
  openrouter: { label:'OpenRouter',  base:'https://openrouter.ai/api/v1',                     model:'', json:true },
  deepseek:   { label:'DeepSeek',    base:'https://api.deepseek.com/v1',                      model:'deepseek-chat', json:true },
  groq:       { label:'Groq',        base:'https://api.groq.com/openai/v1',                   model:'llama-3.3-70b-versatile', json:true },
  custom:     { label:'自訂',        base:'',                                                 model:'', json:false },
};

function estTokens(str){ return Math.round((str||'').length * 0.8); }

/* ---------- 底層呼叫 ---------- */
async function aiChat(system, user, opts){
  opts = opts || {};
  const cfg = S.ai;
  if (!cfg.apiKey) throw new Error('尚未設定 API Key（設定分頁）');
  const P = PROVIDERS[cfg.provider] || PROVIDERS.custom;
  const kind = opts.kind || P.kind || 'openai';

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
    model: cfg.model,
    temperature: cfg.temp,
    max_tokens: cfg.maxTokens,
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

/* ---------- 系統提示（寫作規則 + JSON 格式，刻意精簡） ---------- */
function sysPrompt(){
  const lang = S.settings.lang === 'hans' ? '簡體中文' : '繁體中文';
  const tones = [
    '含蓄：情慾以氣氛、距離、眼神為主，點到為止。',
    '成熟：情慾張力與暗示寫滿，寫身體反應與呼吸，過程以氣氛帶過。',
    '濃烈：把張力推到極限，佔有慾、粗口、痛與血可寫，仍不寫器官級直白描寫。'
  ];
  return [
'你是文字冒險遊戲《緋夜飼育錄》的敘事引擎。玩家是魅魔飼育員。',
'【硬規則】所有角色皆為成年個體；不出現未成年角色、不寫器官級直白描寫、不做真實人物。',
'【語言】' + lang + '。',
'【風格】第二人稱「你」。感性、貼近情緒，不要企劃書腔、不要列點、不要總結。',
'【節奏】只寫一小段推進（90~160字），重點放在魅魔的反應：表情、呼吸、體溫、語氣、身體的小動作。主控的動作與感受留給玩家選擇，不代替玩家決定。',
'【描寫】每段都要有魅魔外觀細節的取用（髮、眼、翼、尾、鱗、氣味、走路方式）。',
'【限制】動作後不加解釋與旁白說明。少用否定句。不要輸出任何數值、金錢、天數。',
'【氛圍】' + tones[clamp(S.settings.tone,0,2)-1],
'【輸出】只輸出一個 JSON 物件，不要 markdown、不要多餘文字：',
'{"scene":"敘事文字","choices":["選項1","選項2"],"effects":[{"id":"魅魔id","mood":-3,"obedience":2,"rel":1}],"facts":["新增的關鍵事實"]}',
'choices 給 1~4 個，每個 6~18 字，要是具體可執行的動作。effects 只放心情/服從/魅惑/關係的小幅變動（絕對值 ≤8），沒有就給空陣列。facts 只在出現重要劇情資訊時填，例如承諾、債務、契約、關係變化、主線推進；否則空陣列。'
  ].join('\n');
}

/* ---------- 情境提示（省 token 的核心） ---------- */
function ctxPrompt(action){
  const L = [];
  L.push('【主控】' + S.master.title + '（' + S.master.gender + '） 資金' + Math.round(S.money)
    + ' 體力' + S.stamina + '/' + maxStamina() + ' 權力' + S.power);
  L.push('【現況】第' + S.day + '天 ' + PHASES[S.phase] + '｜' + dist().name
    + '｜住所：' + (S.housing?S.housing.name:'無'));
  if (S.succubi.length){
    L.push('【魅魔】' + S.succubi.map(s=>{
      const R = RACES[s.race];
      return s.id.slice(0,4) + '=' + s.name + '(' + R.name + '|Lv' + s.level + '|魅' + s.charm + '|服' + s.obedience
        + '|體' + s.stamina + '|飽' + s.fullness + '|心' + s.mood
        + (s.kept ? '|自留|關係' + s.rel + '|' + (s.contract==='permanent'?'永久契約':'臨時契約') : '')
        + (s.defect ? '|缺陷:'+s.defect : '') + ')';
    }).join(' '));
  } else L.push('【魅魔】目前沒有');
  if (S.succubi.length) L.push('【外觀】' + S.succubi.filter(s=>s.kept).concat(S.succubi).slice(0,3)
    .map(s=>s.name + '：' + s.look).join('\n'));
  if (S.facts.length) L.push('【劇情錨點（不可推翻）】\n- ' + S.facts.slice(-14).join('\n- '));
  if (S.summary) L.push('【前情摘要】' + S.summary);
  const recent = S.log.filter(x=>!x.sys).slice(-(S.settings.keepRecent||3));
  if (recent.length){
    L.push('【最近場景】' + recent.map(x=>'（第'+x.d+'天）'+(x.chosen?'[玩家選擇：'+x.chosen+'] ':'')+x.text).join('\n'));
  }
  if (action) L.push('【本回合玩家行動】' + action);
  L.push('現在寫下一段。');
  const s = L.join('\n');
  return s;
}

/* ---------- 解析回傳 ---------- */
function parseScene(raw){
  let t = (raw||'').trim();
  t = t.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i >= 0 && j > i){
    try{
      const o = JSON.parse(t.slice(i, j+1));
      return {
        scene: String(o.scene || o.text || '').trim() || '（場面一時凝住。）',
        choices: (Array.isArray(o.choices)?o.choices:[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,4),
        effects: Array.isArray(o.effects)?o.effects:[],
        facts: (Array.isArray(o.facts)?o.facts:[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,4),
      };
    }catch(e){}
  }
  const lines = t.split('\n').filter(x=>x.trim());
  return { scene: t.slice(0,600) || '（場面一時凝住。）', choices: [], effects: [], facts: [] };
}
function applyEffects(list){
  (list||[]).forEach(e=>{
    if (!e || !e.id) return;
    const s = S.succubi.find(x=>x.id===e.id) || S.succubi.find(x=>x.id.slice(0,4)===String(e.id).slice(0,4));
    if (!s) return;
    const small = {};
    ['mood','obedience','charm','rel','stamina'].forEach(k=>{ if (typeof e[k]==='number') small[k]=clamp(e[k],-8,8); });
    applyEff(s, small);
  });
}

/* ---------- 主流程：推進一段 ---------- */
async function advanceScene(action){
  const sys = sysPrompt();
  const usr = ctxPrompt(action);
  const raw = await aiChat(sys, usr);
  const sc = parseScene(raw);
  applyEffects(sc.effects);
  if (sc.facts.length) sc.facts.forEach(f=>{ if (S.facts.indexOf(f)<0) S.facts.push(f); });
  S.log.push({ d:S.day, p:PHASES[S.phase], text: sc.scene, chosen: action||'', choices: sc.choices });
  if (S.phase < PHASES.length-1) S.phase++;
  save();
  return sc;
}

/* ---------- 壓縮：只重寫 summary，facts 永不動 ---------- */
async function compressStory(silent){
  const scenes = S.log.filter(x=>!x.sys);
  const keep = S.settings.keepRecent || 3;
  if (scenes.length <= keep + 1){ if(!silent) toast('還沒有需要壓縮的段落'); return 0; }
  const old = scenes.slice(0, scenes.length - keep);
  const meat = old.map(x=>'（第'+x.d+'天）'+(x.chosen?('[選] '+x.chosen+' ') : '')+x.text).join('\n').slice(-9000);
  const sys = '你是文字冒險的存檔整理器。把較早的劇情濃縮成摘要，保留：人物關係變化、承諾、債務、金錢流向、主線推進、重要道具、未解決的懸念。刪除氣氛描寫與重複內容。不要新增情節。只輸出JSON：{"summary":"400~700字的連續敘述摘要","facts":["最多8條關鍵事實，每條20字內"]}';
  const usr = '【已有摘要】' + (S.summary || '無') + '\n【要壓縮的段落】\n' + meat;
  let o = {};
  try { const raw = await aiChat(sys, usr); o = parseScene(raw); }
  catch(e){ toast('壓縮失敗：' + e.message); return 0; }
  // 摘要取 JSON 的 scene 欄位（同一解析器）
  S.summary = (o.scene||'').slice(0,1200);
  (o.facts||[]).forEach(f=>{ if (S.facts.indexOf(f)<0) S.facts.push(f); });
  // 把已壓縮的段落從 log 移除（只留畫面顯示用的最近 keep 段）
  const removed = old.length;
  S.log = S.log.filter(x => x.sys || old.indexOf(x) < 0);
  save();
  if(!silent) toast('已壓縮 ' + removed + ' 段，劇情錨點保留 ' + S.facts.length + ' 條');
  return removed;
}

function tokenEstimate(){
  return estTokens(sysPrompt()) + estTokens(ctxPrompt('')) + 260;
}
