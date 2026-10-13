/* ============================================================
   《緋夜飼育錄》核心邏輯 core.js
   ============================================================ */

let S = defaultState();

const DISTRICT_RANK = { oldtown: 1, lantern: 2, tower: 3, outskirt: 4 };

function defaultState() {
  return {
    master: { hp: 100, maxHp: 100, gold: 800, exp: 0, rank: 1, style: "gentle", persona: "" },
    day: 1,
    subPhase: 0,
    currentDistrictId: "oldtown",
    currentHouseId: "oldtown_loft",
    ownedHouses: ["oldtown_loft"],
    succubi: [],
    inventory: [],
    currentChoices: [],
    logs: [],
    summary: "",
    facts: [],
    market: { type: null, candidates: [], selectedId: null, cache: {} },
    sellState: null,
    hasPurchased: false,
    started: false
  };
}

function ensureState() { if (!S) S = defaultState(); }

/* ---------- 工具 ---------- */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

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
function hasItem(itemId) { return S.inventory.includes(itemId); }
function addItem(itemId) { S.inventory.push(itemId); }
function getSuccubus(id) { return S.succubi.find(s => s.id === id); }
function currentSuccubus() { return S.succubi.length ? S.succubi[0] : null; }
function isHighDistrict(id) { const d = getDistrict(id); return d ? !!d.isHigh : false; }
function districtRankReq(id) { return DISTRICT_RANK[id] || 1; }

function sceneHeader() {
  const d = getDistrict(S.currentDistrictId);
  const h = getHouse(S.currentHouseId);
  const loc = (d ? d.name : "緋夜") + (h ? "・" + h.name : "");
  return `── 第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]} · ${loc} ──`;
}

/* ---------- 好感加成 ---------- */
function calcRelRate(suc) {
  if (!suc) return 1;
  return suc.affection >= 55 ? 1.6 : 0.4;
}

/* ---------- 階級 ---------- */
function addMasterExp(amount) {
  if (!S) return;
  S.master.exp += Math.round(amount);
  checkMasterRank();
}

function checkMasterRank() {
  let r = 1;
  for (const rank of MASTER_RANKS) if (S.master.exp >= rank.expNeed) r = rank.rank;
  if (r > S.master.rank) {
    S.master.rank = r;
    const info = getRank(r);
    pushLog("system", `你的名望如夜色蔓延——晉升【${info.name}】。${info.desc}`);
  }
}

/* ---------- 隨機生成魅魔 ---------- */
function rollSuccubus(raceKey) {
  const race = RACES.find(r => r.key === raceKey) || pick(RACES);
  const p = pick(PERSONALITIES), ap = pick(APPEARANCES), sc = pick(SCENTS);
  return {
    id: "suc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: randomName(),
    raceKey: race.key, raceName: race.name, raceDesc: race.desc,
    appearance: ap, scent: sc,
    personality: p.id, personalityName: p.name, personalityDesc: p.desc,
    defect: null,
    affection: 5, obedience: 10, stress: 10, hunger: 25,
    origin: "roll", background: "", risk: null,
    contract: "temporary", storyUnlocked: false
  };
}

/* ---------- 時間 ---------- */
function advanceTime(phases) {
  if (!phases || phases <= 0) return;
  for (let i = 0; i < phases; i++) {
    S.subPhase++;
    if (S.subPhase >= SUBPHASE_NAMES.length) {
      S.subPhase = 0;
      S.day++;
      triggerDailySettlement();
    }
  }
}

function triggerDailySettlement() {
  let hpCost = 0, goldCost = 0, permIncome = 0;
  for (const s of S.succubi) {
    s.hunger = clamp(s.hunger + 15, 0, 100);
    s.stress = clamp(s.stress + 4, 0, 100);
    if (s.contract === "permanent") {
      s.affection = clamp(s.affection + 2, 0, 100);
      s.stress = clamp(s.stress - 2, 0, 100);
      permIncome += 15;
    }
    if (s.raceKey === "pure") hpCost += 6; else goldCost += 20;
  }
  let msg = "新的一日來臨。";
  if (hpCost > 0) { S.master.hp = clamp(S.master.hp - hpCost, 0, S.master.maxHp); msg += ` 純血魅魔循著你的氣味索食，你的體力被分走了 ${hpCost}。`; }
  if (goldCost > 0) { S.master.gold = Math.max(0, S.master.gold - goldCost); msg += ` 你為魅魔張羅吃食，花去 ${goldCost} 金。`; }
  pushLog("system", msg);

  const income = 30 + S.master.rank * 15 + permIncome;
  S.master.gold += income;
  if (permIncome > 0) pushLog("system", `你名下的產業為你帶來 ${income} 金進帳，其中含永久契約的侍奉之禮。`);
  else pushLog("system", `你名下的產業為你帶來 ${income} 金的進帳。`);
}

/* ---------- 市場候選 ---------- */
function generateMarketCandidates(type) {
  const list = [];
  const count = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) list.push(generateOneCandidate(type, i));
  return list;
}

function generateOneCandidate(type, idx) {
  const isOfficial = type === "official";
  const race = pick(RACES), p = pick(PERSONALITIES), ap = pick(APPEARANCES), sc = pick(SCENTS);
  let defect = null, background = "", price = 0;

  if (isOfficial) {
    background = pick(OFFICIAL_BACKGROUNDS);
    if (idx === 0) {
      price = 420 + Math.floor(Math.random() * 340);
    } else {
      price = 600 + Math.floor(Math.random() * 800);
    }
  } else {
    background = pick(BLACKMARKET_BACKGROUNDS);
    price = 150 + Math.floor(Math.random() * 450);
    if (Math.random() < 0.85) defect = pick(DEFECTS);
  }
  if (defect) price = Math.max(80, Math.floor(price * 0.7));

  return {
    id: "cand_" + type + "_" + idx + "_" + Math.floor(Math.random() * 10000),
    name: randomName(),
    raceKey: race.key, raceName: race.name, raceDesc: race.desc,
    appearance: ap, scent: sc,
    personality: p.id, personalityName: p.name, personalityDesc: p.desc,
    defect: defect, background: background, price: price,
    risk: isOfficial ? "低風險" : "高風險",
    statSeed: {
      affection: isOfficial ? randInt(10, 19) : randInt(2, 7),
      obedience: isOfficial ? randInt(20, 34) : randInt(3, 10),
      stress: isOfficial ? randInt(5, 12) : randInt(20, 39),
      hunger: randInt(20, 39)
    }
  };
}

function openMarket(type) {
  if (!MARKET_INFO[type]) return;
  if (type === "blackmarket" && !S.hasPurchased) {
    pushLog("system", "你尚無名下魅魔，暗巷黑市還不對你敞開。先到官方契約廳，挑第一雙屬於你的眼睛吧。");
    if (typeof renderAll === "function") renderAll();
    return;
  }

  S.market.type = type;
  const cache = S.market.cache || (S.market.cache = {});
  const entry = cache[type];
  if (entry && entry.day === S.day) {
    S.market.candidates = entry.list.slice();
  } else {
    const list = generateMarketCandidates(type);
    cache[type] = { day: S.day, list };
    S.market.candidates = list.slice();
  }
  S.market.selectedId = null;
  if (typeof renderMarket === "function") renderMarket();
}

function inspectCandidate(id) {
  const c = S.market.candidates.find(x => x.id === id);
  if (!c) return null;
  S.market.selectedId = id;
  if (typeof renderCandidateDetail === "function") renderCandidateDetail(c);
  return c;
}

function showConfirm(id) {
  const c = S.market.candidates.find(x => x.id === id);
  if (!c) return null;
  S.market.selectedId = id;
  if (typeof showConfirmModal === "function") showConfirmModal(c);
  return c;
}

function confirmPurchase() {
  const c = S.market.candidates.find(x => x.id === S.market.selectedId);
  if (!c) return;
  const type = S.market.type;
  if (S.master.gold < c.price) {
    pushLog("system", `你的錢袋不夠沉，還差 ${c.price - S.master.gold} 金。`);
    if (typeof renderMarket === "function") renderMarket();
    return;
  }

  S.master.gold -= c.price;
  const suc = {
    id: "suc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: c.name,
    raceKey: c.raceKey, raceName: c.raceName, raceDesc: c.raceDesc,
    appearance: c.appearance, scent: c.scent,
    personality: c.personality, personalityName: c.personalityName, personalityDesc: c.personalityDesc,
    defect: c.defect, background: c.background, risk: c.risk,
    origin: c.risk === "低風險" ? "official" : "blackmarket",
    affection: c.statSeed.affection, obedience: c.statSeed.obedience,
    stress: c.statSeed.stress, hunger: c.statSeed.hunger,
    contract: "temporary", storyUnlocked: false
  };

  S.succubi.push(suc);
  S.hasPurchased = true;

  if (type && S.market.cache && S.market.cache[type]) {
    S.market.cache[type].list = S.market.cache[type].list.filter(x => x.id !== c.id);
  }
  S.market.candidates = S.market.candidates.filter(x => x.id !== c.id);
  S.market.selectedId = null;
  S.market.type = null;
  addMasterExp(25);

  if (typeof closeAllModals === "function") closeAllModals();
  if (typeof purchaseReaction === "function") {
    const r = purchaseReaction(suc);
    if (r && typeof appendStoryMessage === "function") {
      appendStoryMessage("system", sceneHeader());
      appendStoryMessage("story", r.narrative);
    }
    if (r) S.currentChoices = r.choices || [];
  }
  pushLog("system", `契約成立。${suc.name} 從此納入你的名下，${suc.risk}的出身，往後都得由你負責。`);
  if (typeof renderAll === "function") renderAll();
}

/* ---------- 出售 ---------- */
function computeQuality(suc) {
  return Math.round(suc.affection * 2 + suc.obedience * 3 + (100 - suc.stress) * 1.5 - suc.hunger * 0.8);
}

function officialPrice(suc) { return Math.max(80, 150 + Math.round(computeQuality(suc) * 1.2)); }
function blackPrice(suc) { return Math.max(150, Math.round(officialPrice(suc) * (1.4 + Math.random() * 0.6))); }
function auctionPrice(suc) { return Math.round(officialPrice(suc) * (1.8 + Math.random() * 1.2)); }

function prepareSell(succubusId, channel) {
  const suc = getSuccubus(succubusId);
  if (!suc) return null;
  if (suc.contract === "permanent") { pushLog("system", "她已與你締下永久之契，不能再被轉讓。"); return null; }

  S.sellState = { succubusId, channel, weird: null, price: 0 };

  if (channel === "official") {
    S.sellState.price = officialPrice(suc);
  } else if (channel === "blackmarket") {
    S.sellState.price = blackPrice(suc);
    if (Math.random() < 0.45) {
      const w = pick(WEIRD_BUYERS);
      S.sellState.weird = w;
      S.sellState.price = Math.max(120, Math.round(S.sellState.price * w.priceMult));
    }
  } else if (channel === "auction") {
    if (!isHighDistrict(S.currentDistrictId)) { pushLog("system", "拍賣會只在高等街區舉辦，緋夜舊城沒有這等燈海。"); S.sellState = null; return null; }
    if (!(suc.obedience >= AUCTION_INFO.minObedience && suc.affection >= AUCTION_INFO.minAffection)) {
      pushLog("system", "她的火候還不夠，尚不足以站上競價台。");
      S.sellState = null;
      return null;
    }
    S.sellState.price = auctionPrice(suc);
  }
  return S.sellState;
}

function executeSell() {
  if (!S.sellState) return false;
  const { succubusId, channel, price, weird } = S.sellState;
  const idx = S.succubi.findIndex(s => s.id === succubusId);
  if (idx === -1) { S.sellState = null; return false; }
  const suc = S.succubi[idx];
  S.succubi.splice(idx, 1);

  let gold = price;
  if (channel === "auction") gold = Math.round(price * (1 - AUCTION_INFO.commission));

  let bonusText = "";
  if (weird && weird.effect) {
    gold += (weird.effect.gold || 0);
    S.master.hp = clamp(S.master.hp + (weird.effect.hp || 0), 0, S.master.maxHp);
    if (weird.effect.exp) addMasterExp(weird.effect.exp);
    bonusText = " " + (weird.consequenceText || "");
  }

  S.master.gold += gold;
  addMasterExp(channel === "auction" ? 30 : 15);
  pushLog("system", `你將 ${suc.name} 轉讓了出去，換得 ${gold} 金。${bonusText}`);
  S.sellState = null;
  return true;
}

/* ---------- 永久契約 ---------- */
function signPermanentContract(succubusId) {
  const suc = getSuccubus(succubusId);
  if (!suc) return false;
  if (suc.contract === "permanent") { pushLog("system", "她早已是你緋夜的一部分。"); return false; }
  if (suc.affection < CONTRACT_INFO.permanentAffectionReq) {
    pushLog("system", `她的心意尚未抵達。永久之契需要好感達到 ${CONTRACT_INFO.permanentAffectionReq}。`);
    return false;
  }
  if (S.master.gold < CONTRACT_INFO.permanentCost) {
    pushLog("system", "你的錢袋不夠沉，無力置辦這份永久的儀式。");
    return false;
  }
  S.master.gold -= CONTRACT_INFO.permanentCost;
  suc.contract = "permanent";
  suc.storyUnlocked = true;
  addMasterExp(40);
  pushLog("system", `以血與吻烙下永久之契。${suc.name} 從此不再是可以易手的貨物，而是你緋夜的一部分。`);
  return true;
}

/* ---------- 道具 ---------- */
function applyEffects(suc, fx) {
  if (!suc || !fx) return;
  let aff = fx.affection || 0, obe = fx.obedience || 0;
  if (suc.contract === "permanent") {
    if (aff > 0) aff = Math.round(aff * 1.5);
    if (obe > 0) obe = Math.round(obe * 1.5);
  }
  suc.affection = clamp(suc.affection + aff, 0, 100);
  suc.obedience = clamp(suc.obedience + obe, 0, 100);
  suc.stress = clamp(suc.stress + (fx.stress || 0), 0, 100);
  suc.hunger = clamp(suc.hunger + (fx.hunger || 0), 0, 100);
}

function consumeItemByStory(itemId, succubusId) {
  const idx = S.inventory.indexOf(itemId);
  if (idx === -1) return false;
  S.inventory.splice(idx, 1);
  const item = getItem(itemId);
  const suc = getSuccubus(succubusId) || currentSuccubus();
  if (item && suc) {
    applyEffects(suc, item.effects);
    if (item.masterHp) {
      S.master.hp = clamp(S.master.hp + item.masterHp, 0, S.master.maxHp);
      pushLog("system", `駕馭「${item.name}」耗去了你 ${-item.masterHp} 點體力。`);
    }
    pushLog("story", `你使用了「${item.name}」。${item.desc}`);
    addMasterExp(3);
  }
  return true;
}

function useItemOnSuccubus(itemId, succubusId) { return consumeItemByStory(itemId, succubusId); }

/* ---------- 道具商店 ---------- */
const SHOP_INFO = {
  official:    { name: "官方道具行",     desc: "高塔區的官方道具行，明碼標價、童叟無欺。", riskLabel: "正規" },
  blackmarket: { name: "暗巷黑市道具鋪", desc: "暗巷深處的祕密鋪子，只賣些見不得光的玩意。", riskLabel: "違禁" }
};

const SHOP_ITEM_SOURCE = {
  soothe_candy: "official", herbal_tea: "official", aroma_oil: "official",
  honey_sweet: "official", calming_incense: "official",
  soft_whip: "official", crimson_gag: "official", night_beads: "official",
  velvet_rope: "official", silk_ribbon: "official", feather_duster: "official",
  candle_wax: "official", silver_collar: "official",
  onyx_blindfold: "official", silver_bell_clips: "official",
  tower_page: "official",
  oldtown_incense: "blackmarket",
  charm_essence: "blackmarket", abyss_spirit: "blackmarket",
  codex1: "blackmarket", codex2: "blackmarket", codex3: "blackmarket",
  bm_spiked_rod: "blackmarket", bm_blood_clips: "blackmarket",
  bm_tri_shackle: "blackmarket", bm_iron_mask: "blackmarket", bm_twin_serpent: "blackmarket"
};

function shopItems(type) { return ITEMS.filter(it => SHOP_ITEM_SOURCE[it.id] === type); }

function buyItem(itemId) {
  const it = getItem(itemId);
  if (!it) return false;
  if (S.master.gold < it.price) {
    pushLog("system", `你的錢袋不夠沉，還差 ${it.price - S.master.gold} 金。`);
    return false;
  }
  if (S.master.rank < it.rankReq) {
    pushLog("system", `你的階級尚不足以駕馭「${it.name}」，需晉升至【${getRank(it.rankReq).name}】。`);
    return false;
  }
  S.master.gold -= it.price;
  addItem(itemId);
  pushLog("system", `你購入了「${it.name}」。${it.desc}`);
  return true;
}

/* ---------- AI 指令結算 ---------- */
function processAICommands(cmd) {
  if (!cmd) return;

  if (cmd.narrative && typeof appendStoryMessage === "function") {
    appendStoryMessage("system", sceneHeader());
    appendStoryMessage("story", cmd.narrative);
  }

  if (Array.isArray(cmd.commands)) {
    for (const c of cmd.commands) {
      if (!c) continue;
      switch (c.type) {
        case "item": consumeItemByStory(c.itemId, c.succubusId); break;
        case "stat": {
          const suc = getSuccubus(c.succubusId) || currentSuccubus();
          if (suc && c.delta) applyEffects(suc, c.delta);
          break;
        }
        case "time": advanceTime(c.phases || 1); break;
        case "gold": S.master.gold = Math.max(0, S.master.gold + (c.amount || 0)); break;
        case "hp": S.master.hp = clamp(S.master.hp + (c.amount || 0), 0, S.master.maxHp); break;
        case "exp": addMasterExp(c.amount || 0); break;
      }
    }
  }

  if (Array.isArray(cmd.choices) && cmd.choices.length) S.currentChoices = cmd.choices;
  if (typeof renderAll === "function") renderAll();
}

/* ---------- 日誌 ---------- */
function pushLog(type, text) {
  if (!S.logs) S.logs = [];
  S.logs.push({ type, text, t: Date.now() });
}

/* ---------- 存檔 ---------- */
const SAVE_KEY = "ck_save_v4";

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; }
  catch (e) { return false; }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    const base = defaultState();
    S = Object.assign(base, parsed);

    S.market = { type: null, candidates: [], selectedId: null, cache: {} };
    S.sellState = null;
    if (!S.master || typeof S.master !== "object") S.master = base.master;
    S.succubi = Array.isArray(S.succubi) ? S.succubi : [];
    S.inventory = Array.isArray(S.inventory) ? S.inventory : [];
    S.ownedHouses = Array.isArray(S.ownedHouses) ? S.ownedHouses : ["oldtown_loft"];
    S.currentChoices = Array.isArray(S.currentChoices) ? S.currentChoices : [];
    S.logs = Array.isArray(S.logs) ? S.logs : [];
    S.facts = Array.isArray(S.facts) ? S.facts : [];
    S.hasPurchased = !!S.hasPurchased || S.succubi.length > 0;
    if (typeof S.day !== "number") S.day = 1;
    if (typeof S.subPhase !== "number") S.subPhase = 0;
    return true;
  } catch (e) {
    return false;
  }
}

function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  S = defaultState();
  if (typeof renderAll === "function") renderAll();
}
