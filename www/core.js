/* ============================================================
   《緋夜飼育錄》核心邏輯 core.js
   ============================================================ */

let S = defaultState();

const DISTRICT_RANK = { oldtown: 1, lantern: 2, tower: 3, outskirt: 4 };

function defaultState() {
  return {
    master: { hp: 100, maxHp: 100, gold: 1000, exp: 0, rank: 1, style: "gentle", persona: "", diet: "normal" },
    day: 1,
    subPhase: 0,
    dayMode: "training",
    needDayChoice: true,
    party: [],
    currentDistrictId: "oldtown",
    currentHouseId: "oldtown_loft",
    ownedHouses: ["oldtown_loft"],
    rentedOut: [],
    housePrices: {},
    succubi: [],
    inventory: [],
    gear: {},
    currentChoices: [],
    logs: [],
    summary: "",
    facts: [],
    history: [],
    lastUsage: null,
    market: { type: null, candidates: [], selectedId: null, cache: {} },
    sellState: null,
    hasPurchased: false,
    started: false
  };
}

function ensureState() { if (!S) S = defaultState(); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function statCap(key) {
  const caps = (typeof STAT_CAPS !== "undefined") ? STAT_CAPS : null;
  return (caps && caps[key] != null) ? caps[key] : 100;
}
function clampStatObj(suc, key, val) { return clamp(val, 0, statCap(key)); }

function randomName() { return pick(SUCCUBUS_NAMES); }
function getRank(r) { return MASTER_RANKS.find(x => x.rank === r) || MASTER_RANKS[0]; }
function getDistrict(id) { return DISTRICTS.find(d => d.id === id); }
function getHouse(houseId) {
  for (const d of DISTRICTS) {
    const h = d.houses.find(x => x.id === houseId);
    if (h) return h;
  }
  return null;
}

function getItem(itemId) { return ITEMS.find(i => i.id === itemId); }
function getSuccubus(id) { return S.succubi.find(s => s.id === id); }
function currentSuccubus() { return S.succubi.length ? S.succubi[0] : null; }

function getPersonalityDef(pId) {
  return PERSONALITIES.find(p => p.id === pId) || PERSONALITIES[0];
}

function succubusGradeScore(suc) {
  if (!suc) return 0;
  return Math.round((((suc.charm || 0) + (suc.obedience || 0) + (suc.stamina || 0)) / 3));
}
function succubusGrade(suc) {
  const score = succubusGradeScore(suc);
  let g = SUCCUBUS_GRADES[0];
  for (const t of SUCCUBUS_GRADES) if (score >= t.minScore) g = t;
  return g;
}

function sceneHeader() {
  const d = getDistrict(S.currentDistrictId);
  const h = getHouse(S.currentHouseId);
  const loc = (d ? d.name : "緋夜") + (h ? "・" + h.name : "");
  return `── 第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]} · ${loc} ──`;
}

function notifyGoldChange(delta, reason) {
  if (!delta || delta === 0) return;
  const sign = delta > 0 ? "+" : "";
  pushLog("system", `［金錢變動］${sign}${delta} 金${reason ? `（${reason}）` : ""}`);
}

function snapStats(suc) {
  return { affection: suc.affection, obedience: suc.obedience, charm: suc.charm || 0, stamina: suc.stamina || 0, stress: suc.stress, hunger: suc.hunger };
}

function notifyStatChange(suc, before) {
  if (!suc || !before) return;
  const parts = [];
  const add = (label, key) => {
    const d = (suc[key] || 0) - (before[key] || 0);
    if (d !== 0) parts.push(`${label}${d > 0 ? "+" : ""}${d}`);
  };
  add("好感", "affection");
  add("服從", "obedience");
  add("魅惑", "charm");
  add("體能", "stamina");
  add("壓力", "stress");
  add("飢餓", "hunger");
  if (parts.length) pushLog("system", `［${suc.name}］${parts.join("　")}`);
}

function addMasterExp(amount) {
  if (!S) return;
  S.master.exp += Math.round(amount);
  let r = 1;
  for (const rank of MASTER_RANKS) if (S.master.exp >= rank.expNeed) r = rank.rank;
  if (r > S.master.rank) {
    S.master.rank = r;
    pushLog("system", `你的名望如夜色蔓延——晉升【${getRank(r).name}】。`);
  }
}

/* 時間推進與自然增加飢餓度 */
function advanceTime(phases) {
  if (!phases || phases <= 0) return;
  for (let i = 0; i < phases; i++) {
    S.subPhase++;
    
    // 時段推進：飢餓度 +5
    S.succubi.forEach(s => {
      s.hunger = clamp((s.hunger || 0) + 5, 0, 100);
    });

    if (S.subPhase >= SUBPHASE_NAMES.length) {
      S.subPhase = 0;
      S.day++;
      triggerDailySettlement();
    }
  }
}

function triggerDailySettlement() {
  S.succubi.forEach(s => {
    const pDef = getPersonalityDef(s.personality);
    
    // 依性格類別調整每日衰減
    let obeDecay = 2;
    if (pDef.category === "負面") obeDecay = 4; // 負面性格消退更快
    else if (pDef.category === "正面") obeDecay = 1;

    s.affection = clampStatObj(s, "affection", (s.affection || 0) - 3);
    s.obedience = clampStatObj(s, "obedience", (s.obedience || 0) - obeDecay);
    s.stress = clamp(s.stress + 4, 0, 100);

    const race = RACES.find(r => r.key === s.raceKey);
    const feed = (race && race.feed) ? race.feed : { type: "gold", cost: 15 };
    if (feed.type === "hp" && S.master.hp > feed.cost) {
      S.master.hp -= feed.cost;
      s.hunger = 0;
    } else if (feed.type === "gold" && S.master.gold >= feed.cost) {
      S.master.gold -= feed.cost;
      notifyGoldChange(-feed.cost, `餵食：${s.name}`);
      s.hunger = 0;
    } else {
      s.hunger = clamp(s.hunger + 15, 0, 100);
    }
  });

  const diet = DIET_OPTIONS.find(x => x.id === S.master.diet) || DIET_OPTIONS[1];
  const pay = Math.min(diet.cost, S.master.gold);
  S.master.gold -= pay;
  notifyGoldChange(-pay, "每日伙食");
  S.master.hp = clamp(S.master.hp + diet.hpRecover, 0, S.master.maxHp);

  const income = 30 + S.master.rank * 15;
  S.master.gold += income;
  notifyGoldChange(income, "產業收益");
}

function processAICommands(cmd) {
  if (!cmd) return;
  const n = (v, d) => { const x = Math.round(Number(v)); return isNaN(x) ? (d || 0) : x; };

  if (cmd.narrative && typeof appendStoryMessage === "function") {
    appendStoryMessage("system", sceneHeader());
    appendStoryMessage("story", cmd.narrative);
  }

  if (Array.isArray(cmd.commands)) {
    for (const c of cmd.commands) {
      if (!c) continue;
      switch (c.type) {
        case "train": {
          const suc = getSuccubus(c.succubusId) || currentSuccubus();
          if (suc) {
            const before = snapStats(suc);
            const pDef = getPersonalityDef(suc.personality);
            
            // 結合性格服從率倍率！
            let obeBase = clamp(n(c.obedience), 0, 40);
            let finalObe = Math.round(obeBase * (pDef.obedMult || 1.0));
            
            suc.obedience = clampStatObj(suc, "obedience", (suc.obedience || 0) + finalObe);
            if (c.affection) suc.affection = clampStatObj(suc, "affection", (suc.affection || 0) + n(c.affection));
            if (c.stress) suc.stress = clamp(suc.stress + n(c.stress), 0, 100);
            notifyStatChange(suc, before);
            
            // 負面性格調教耗費主人額外體力
            let extraHp = pDef.category === "負面" ? -3 : 0;
            if (c.hp || extraHp) {
              S.master.hp = clamp(S.master.hp + n(c.hp) + extraHp, 0, S.master.maxHp);
            }
          }
          break;
        }
        case "feed": {
          const suc = getSuccubus(c.succubusId) || currentSuccubus();
          if (suc) { suc.hunger = 0; pushLog("system", `［${suc.name}］飽足，飢餓歸零`); }
          break;
        }
        case "time": advanceTime(1); break;
        case "gold": { 
          const amt = n(c.amount); 
          if (amt) { S.master.gold = Math.max(0, S.master.gold + amt); notifyGoldChange(amt, "打工/事件"); } 
          break; 
        }
      }
    }
  }

  if (Array.isArray(cmd.choices) && cmd.choices.length) S.currentChoices = cmd.choices;
  if (typeof saveGame === "function") saveGame();
  if (typeof renderAll === "function") renderAll();
}

function pushLog(type, text) {
  if (!S.logs) S.logs = [];
  S.logs.push({ type, text, t: Date.now() });
}

const SAVE_KEY = "ck_save_v4";
function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; } catch (e) { return false; }
}
function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    S = Object.assign(defaultState(), JSON.parse(raw));
    return true;
  } catch (e) { return false; }
}
