/* ==========================================================
   核心：狀態、經濟、數值結算。完全不呼叫 AI。
   ========================================================== */

const SAVE_KEY = 'ck_save_v2';
let S = null;

const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2,9);
const pick = a => a[Math.floor(Math.random()*a.length)];
const rint = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const deep = o => JSON.parse(JSON.stringify(o));

function toast(msg){
  const t=$('toast'); if(!t) return;
  t.textContent=msg; t.classList.add('on');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),2000);
}
function fmt(n){ return '₡' + Math.round(n||0).toLocaleString('en-US'); }
function flashScreen(){
  let f = $('flash');
  if (!f){ f = document.createElement('div'); f.id='flash'; document.body.appendChild(f); }
  f.classList.add('on'); setTimeout(()=>f.classList.remove('on'), 220);
}

/* ---------- 等級 S~F ---------- */
function gradeOf(lv){ return GRADES[clamp((lv||1)-1, 0, GRADES.length-1)]; }
function gradeTag(lv){
  const g = gradeOf(lv);
  return '<span class="tag g-' + g + '">' + g + '級</span>';
}
function expNeed(lv){ return lv >= 7 ? Infinity : 60 + (lv-1)*55; }
function stageOf(s){
  const r = s.rel || 0;
  let st = STAGES[0];
  for (const x of STAGES) if (r >= x.min) st = x;
  return st;
}

/* ---------- 建立新遊戲 ---------- */
function newGame(masterInfo){
  masterInfo = masterInfo || {};
  S = {
    day: 1, phase: 0, money: 4800, stamina: 100, power: 10,
    district: 'harbor',
    housing: deep(HOUSES[0]),
    master: { name: masterInfo.name || '主人', title: masterInfo.title || '主人', gender: masterInfo.gender || '女性' },
    succubi: [], food: { shadowdew: 1 }, bag: { nectar: 1 },
    market: { official: [], black: [] },
    facts: ['第1天：開始經營飼育所。目前沒有任何魅魔，一切都還陌生。'],
    summary: '', log: [],
    flags: { gameOver: false, blackBought: 0 },
    settings: { appName:'緋夜飼育錄', lang:'hant', tone:2, harshItems:false, keepRecent:3, autoCompressTokens:5000 },
    ai: { provider:'gemini', apiKey:'', baseUrl:'https://generativelanguage.googleapis.com/v1beta',
      model:'gemini-flash-latest', temp:0.85, maxTokens:700, jsonMode:true }
  };
  save();
}

/* ---------- 存檔修補：舊存檔缺欄位會自動補齊 ---------- */
function migrateSave(o){
  if (!o || typeof o !== 'object') return null;
  o.flags = Object.assign({ gameOver:false, blackBought:0 }, o.flags || {});
  o.settings = Object.assign({ appName:'緋夜飼育錄', lang:'hant', tone:2, harshItems:false,
    keepRecent:3, autoCompressTokens:5000 }, o.settings || {});
  o.ai = Object.assign({ provider:'gemini', apiKey:'', baseUrl:'https://generativelanguage.googleapis.com/v1beta',
    model:'gemini-flash-latest', temp:0.85, maxTokens:700, jsonMode:true }, o.ai || {});
  o.master = Object.assign({ name:'主人', title:'主人', gender:'女性' }, o.master || {});
  o.food = o.food || {}; o.bag = o.bag || {};
  o.market = o.market || { official:[], black:[] };
  o.facts = Array.isArray(o.facts) ? o.facts : [];
  o.log = Array.isArray(o.log) ? o.log : [];
  o.succubi = Array.isArray(o.succubi) ? o.succubi : [];
  o.summary = o.summary || '';
  o.day = o.day || 1; o.phase = o.phase || 0;
  o.money = typeof o.money === 'number' ? o.money : 4800;
  o.stamina = typeof o.stamina === 'number' ? o.stamina : 100;
  o.power = typeof o.power === 'number' ? o.power : 10;
  o.district = o.district || 'harbor';
  if (!o.housing) o.housing = deep(HOUSES[0]);
  // 魅魔欄位補齊
  o.succubi.forEach(s=>{
    s.rel = typeof s.rel === 'number' ? s.rel : 0;
    s.contract = s.contract || 'temporary';
    s.kept = !!s.kept;
    s.traits = s.traits || [];
    if (!s.look) s.look = buildLook(RACES[s.race] || RACES.verdant);
    if (typeof s.exp !== 'number') s.exp = 0;
  });
  return o;
}

/* ---------- 派生數值 ---------- */
function dist(){ return DISTRICTS.find(d=>d.id===(S&&S.district)) || DISTRICTS[0]; }
function houseBonus(){ return (S && S.housing && S.housing.bonus) || {}; }
function capacity(){ return (S && S.housing) ? S.housing.cap : 1; }
function maxStamina(){ return 100 + Math.floor((S?S.power:10)/2); }
function succubusUpkeep(s){ return 20 + s.level*10 + Math.floor(s.charm/10)*6; }
function dailyUpkeep(){
  if(!S) return 60;
  let c = Math.round(60 * dist().cost);
  if(S.succubi) S.succubi.forEach(s=> c += succubusUpkeep(s));
  return Math.max(0, Math.round(c * (1 + (houseBonus().upkeep||0))));
}
function weeklyRent(){ return (S && S.housing && S.housing.type==='rent') ? S.housing.rent : 0; }
function daysToRent(){ const d=(S?S.day:1)%7; return 7 - (d===0?7:d); }
function isAuctionDay(){ return (S?S.day:1) % 7 === 0; }
function foodOf(raceId){ return FOODS[RACES[raceId].food]; }
function effectivePrice(base){ return Math.max(1, Math.round(base * dist().cost)); }
function foodPrice(fid){ return Math.max(1, Math.round(FOODS[fid].price * dist().food)); }
function shopItems(){ return (dist().items || []).slice(); }
function shopFoods(){ return (dist().foods || []).slice(); }

/* ---------- 生成魅魔 ---------- */
function rollSuccubus(raceId, opts){
  opts = opts || {};
  const R = RACES[raceId], lv = opts.level || 1;
  const s = {
    id: uid(), name: opts.name || pick(NAME_POOL), race: raceId,
    persona: opts.persona || pick(R.bias), level: lv, exp: 0,
    charm: rint(6,16) + (R.mod.charm||0),
    obedience: rint(8,20) + (R.mod.obedience||0),
    staminaMax: 100 + (R.mod.staminaMax||0),
    stamina: 0, fullness: rint(40,70), mood: rint(45,70),
    kept: false, contract: 'temporary', rel: rint(0,6),
    traits: [], bornDay: S ? S.day : 1, defect: null,
  };
  s.stamina = s.staminaMax;
  s.look = buildLook(R);
  if (opts.defect) applyDefect(s, opts.defect);
  return s;
}
function buildLook(R){
  const scent = '身上帶著' + pick(['雪松','蜜','鐵','雨後泥土','舊紙','花','鹽']) + '的氣味。';
  const walk = '走路時' + pick(['幾乎沒聲音','帶著一點急躁','很慢，像在打量地板','尾巴或翅會不自覺晃']) + '。';
  return pick(HAIR) + '的髮、' + pick(EYES) + '色的眼，' + pick(BUILDER) + '的身形。'
    + pick(R.look) + '。' + pick([scent, walk]);
}
const DEFECTS = [
  { id:'frail', name:'體虛', apply:s=>{ s.staminaMax-=25; s.stamina=s.staminaMax; } },
  { id:'scar',  name:'舊傷', apply:s=>{ s.staminaMax-=15; } },
  { id:'wild',  name:'野性難馴', apply:s=>{ s.obedience-=18; } },
  { id:'night', name:'夜啼', apply:s=>{ s.traits.push('需額外伙食費 +15/天'); } },
];
function applyDefect(s,d){ const D=DEFECTS.find(x=>x.id===d); if(D && D.apply) D.apply(s); s.defect = (D?D.name:'舊傷'); }

/* ---------- 估價 ---------- */
function officialOffer(s){
  const R = RACES[s.race];
  const base = R.price * (1 + 0.35*(s.level-1)) * (1 + s.charm/110) * (1 + s.obedience/400);
  return Math.max(200, Math.round(base * 0.85 * (1 + (houseBonus().sell||0))));
}
function blackFloor(s){
  const R = RACES[s.race];
  const base = R.price * (1 + 0.40*(s.level-1)) * (1 + s.charm/95);
  return Math.round(base * 1.05 * (1 + (houseBonus().sell||0)));
}
function officialBuyPrice(raceId){
  const R = RACES[raceId], r = R.rare ? 1.6 : 1;
  return Math.round(R.price * r * 1.35 * dist().cost);
}
function blackBuyPrice(raceId){ return Math.round(officialBuyPrice(raceId) * rint(48,68) / 100); }

/* ---------- 增減 ---------- */
function gainExp(s, n){
  const mult = 1 + (houseBonus().train||0);
  s.exp += Math.round(n * mult);
  let lv = 0;
  while (s.level < 7 && s.exp >= expNeed(s.level)) { s.exp -= expNeed(s.level); s.level++; s.charm += 2; lv++; }
  if (s.level >= 7) s.exp = 0;
  if (lv) toast(s.name + ' 升至 ' + gradeOf(s.level) + ' 級');
}
function applyEff(s, eff, scale){
  scale = scale===undefined ? 1 : scale;
  const log = [];
  const map = { mood:'心情', obedience:'服從', charm:'魅惑', stamina:'體力', fullness:'飽食', staminaMax:'體力上限', rel:'關係' };
  for (const k in eff){
    let v = Math.round(eff[k] * scale);
    if (k==='rel'){ s.rel = clamp((s.rel||0)+v, 0, 100); }
    else if (k==='staminaMax'){ s.staminaMax = clamp(s.staminaMax+v, 30, 400); }
    else if (k==='stamina'){ s.stamina = clamp(s.stamina+v, 0, s.staminaMax); }
    else if (k==='fullness'){ s.fullness = clamp(s.fullness+v, 0, 100); }
    else { s[k] = clamp((s[k]||0)+v, 0, k==='mood'?100:9999); }
    if (map[k]) log.push(map[k] + (v>=0?'+':'') + v);
  }
  return log.join(' / ');
}

/* ---------- 日結算 ---------- */
function endDay(){
  const up = dailyUpkeep();
  S.money -= up;
  let rent = 0;
  if (S.day % 7 === 0){ rent = weeklyRent(); S.money -= rent; }
  S.succubi.forEach(s=>{
    if (s.fullness <= 0){ applyEff(s,{mood:-6,stamina:-12,obedience:-3}); if(s.kept) s.rel=clamp(s.rel-1,0,100); }
    const rec = Math.round(16 * (1 + (houseBonus().recover||0)));
    s.stamina = clamp(s.stamina + rec, 0, s.staminaMax);
    s.fullness = clamp(s.fullness - 16, 0, 100);
  });
  S.stamina = clamp(S.stamina + 30, 0, maxStamina());
  const notes = ['生活費 ' + fmt(up)];
  if (rent) notes.push('房租 ' + fmt(rent));
  S.log.push({ d:S.day, p:'—', text:'［日結］' + notes.join('，') + '。結餘 ' + fmt(S.money) + '。', sys:true });
  if (S.money < 0) S.flags.gameOver = true;
  S.day++; S.phase = 0;
  if (typeof refreshMarket === 'function') refreshMarket();
  save();
}

/* ---------- 存讀檔 ---------- */
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
  }catch(e){ return null; }
}
function wipe(){ localStorage.removeItem(SAVE_KEY); }
