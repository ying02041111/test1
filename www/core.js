/* ==========================================================
   核心：狀態、經濟、數值結算。完全不呼叫 AI。
   ========================================================== */

const SAVE_KEY = 'ck_save_v1';
let S = null;

const $ = id => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2,9);
const pick = a => a[Math.floor(Math.random()*a.length)];
const rint = (a,b) => a + Math.floor(Math.random()*(b-a+1));
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const deep = o => JSON.parse(JSON.stringify(o));

function toast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('on');
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),1900);
}
function fmt(n){ return '₡' + Math.round(n).toLocaleString('en-US'); }

/* ---------- 派生數值 ---------- */
function dist(){ return DISTRICTS.find(d=>d.id===S.district) || DISTRICTS[0]; }
function houseBonus(){ return (S.housing && S.housing.bonus) || {}; }
function capacity(){ return S.housing ? S.housing.cap : 1; }
function maxStamina(){ return 100 + Math.floor(S.power/2); }
function succubusUpkeep(s){ return 20 + s.level*10 + Math.floor(s.charm/10)*6; }
function dailyUpkeep(){
  let c = Math.round(60 * dist().cost);
  S.succubi.forEach(s=> c += succubusUpkeep(s));
  return Math.max(0, Math.round(c * (1 + (houseBonus().upkeep||0))));
}
function weeklyRent(){ return S.housing && S.housing.type==='rent' ? S.housing.rent : 0; }
function daysToRent(){ return 7 - (S.day % 7 === 0 ? 7 : S.day % 7); }
function isAuctionDay(){ return S.day % 7 === 0; }
function expNeed(lv){ return 40 + lv*35; }
function foodOf(raceId){ return FOODS[RACES[raceId].food]; }
function effectivePrice(base){ return Math.max(1, Math.round(base * dist().cost)); }
function foodPrice(fid){ return Math.max(1, Math.round(FOODS[fid].price * dist().food)); }

/* ---------- 生成一隻魅魔 ---------- */
function rollSuccubus(raceId, opts){
  opts = opts || {};
  const R = RACES[raceId], lv = opts.level || rint(1, 1);
  const s = {
    id: uid(), name: opts.name || pick(NAME_POOL), race: raceId,
    persona: pick(R.bias), level: lv, exp: 0,
    charm: rint(6,16) + (R.mod.charm||0),
    obedience: rint(8,20) + (R.mod.obedience||0),
    staminaMax: 100 + (R.mod.staminaMax||0),
    stamina: 0, fullness: rint(40,70), mood: rint(45,70),
    kept: false, contract: 'temporary', rel: 0,
    traits: [], notes: [], bornDay: S ? S.day : 1,
    defect: null,
  };
  s.stamina = s.staminaMax;
  s.look = buildLook(R);
  if (opts.defect) applyDefect(s, opts.defect);
  return s;
}
function buildLook(R){
  return pick(HAIR) + '的髮、' + pick(EYES) + '色的眼，' + pick(BUILDER) + '的身形。'
    + pick(R.look) + '。' + pick(['身上帶著' + pick(['雪松','蜜','鐵','雨後泥土','舊紙','花','鹽']) + '的氣味。',
      '走路時' + pick(['幾乎沒聲音','帶著一點急躁','很慢，像在打量地板','尾巴/翅會不自覺晃'] ) + '。'];
}
const DEFECTS = [
  { id:'frail', name:'體虛', apply:s=>{ s.staminaMax-=25; s.stamina=s.staminaMax; } },
  { id:'scar',  name:'舊傷', apply:s=>{ s.staminaMax-=15; } },
  { id:'wild',  name:'野性難馴', apply:s=>{ s.obedience-=18; } },
  { id:'night', name:'夜啼', apply:s=>{ s.traits.push('需額外伙食費 +15/天'); } },
];
function applyDefect(s,d){ const D=DEFECTS.find(x=>x.id===d); if(D){ if(D.apply) D.apply(s); s.defect=D.name; } }

/* ---------- 經濟動作 ---------- */
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
  const R = RACES[raceId];
  const r = R.rare ? 1.6 : 1;
  return Math.round(R.price * r * 1.35 * dist().cost);
}
function blackBuyPrice(raceId){
  return Math.round(officialBuyPrice(raceId) * rint(48,68) / 100);
}

/* ---------- 增減 ---------- */
function addMoney(n){ S.money += Math.round(n); }
function gainExp(s, n){
  const mult = 1 + (houseBonus().train||0);
  s.exp += Math.round(n * mult);
  let lv = 0;
  while (s.exp >= expNeed(s.level)) { s.exp -= expNeed(s.level); s.level++; s.charm += 2; lv++; }
  if (lv) toast(s.name + ' 升到 Lv.' + s.level);
}
function applyEff(s, eff, scale){
  scale = scale===undefined ? 1 : scale;
  const log = [];
  const map = { mood:'心情', obedience:'服從', charm:'魅惑', stamina:'體力', fullness:'飽食', staminaMax:'體力上限', rel:'關係' };
  for (const k in eff){
    let v = Math.round(eff[k] * scale);
    if (k==='rel'){ if(!s.kept) continue; s.rel = clamp(s.rel+v, 0, 100); }
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
  const notes = [];
  S.succubi.forEach(s=>{
    if (s.fullness <= 0){ applyEff(s,{mood:-6,stamina:-12,obedience:-3}); if(s.kept) s.rel=clamp(s.rel-1,0,100); }
    const rec = Math.round(16 * (1 + (houseBonus().recover||0)));
    s.stamina = clamp(s.stamina + rec, 0, s.staminaMax);
    s.fullness = clamp(s.fullness - 16, 0, 100);
  });
  S.stamina = clamp(S.stamina + 30, 0, maxStamina());
  notes.push('生活費 ' + fmt(up));
  if (rent) notes.push('房租 ' + fmt(rent));
  S.log.push({ d:S.day, p:'—', text:'［日結］' + notes.join('，') + '。結餘 ' + fmt(S.money) + '。', sys:true });
  if (S.money < 0){ S.flags.gameOver = true; }
  S.day++; S.phase = 0;
  refreshMarket();
  save();
}

/* ---------- 存讀檔 ---------- */
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
function load(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !o.succubi) return null;
    return o;
  }catch(e){ return null; }
}
function wipe(){ localStorage.removeItem(SAVE_KEY); }
