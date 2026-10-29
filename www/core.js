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
function hasItem(itemId) { return S.inventory.includes(itemId); }
function addItem(itemId) { S.inventory.push(itemId); }
function getSuccubus(id) { return S.succubi.find(s => s.id === id); }
function currentSuccubus() { return S.succubi.length ? S.succubi[0] : null; }
function isHighDistrict(id) { const d = getDistrict(id); return d ? !!d.isHigh : false; }
function districtRankReq(id) { return DISTRICT_RANK[id] || 1; }

function getGearDef(id) {
  if (!id) return null;
  return COLLARS.find(g => g.id === id) || LEASHES.find(g => g.id === id) || null;
}
function gearKind(id) {
  if (COLLARS.some(g => g.id === id)) return "collar";
  if (LEASHES.some(g => g.id === id)) return "leash";
  return "";
}
function gearOwnedCount(id) { return (S.gear && S.gear[id]) ? S.gear[id] : 0; }

function gradeFromScore(score) {
  let g = SUCCUBUS_GRADES[0];
  for (const t of SUCCUBUS_GRADES) if (score >= t.minScore) g = t;
  return g;
}
function succubusGradeScore(suc) {
  if (!suc) return 0;
  return Math.round((((suc.charm || 0) + (suc.obedience || 0) + (suc.stamina || 0)) / 3));
}
function succubusGrade(suc) { return gradeFromScore(succubusGradeScore(suc)); }
function candidateGrade(c) {
  const seed = (c && c.statSeed) ? c.statSeed : {};
  return gradeFromScore(Math.round((((seed.charm || 0) + (seed.obedience || 0) + (seed.stamina || 0)) / 3)));
}

function sceneHeader() {
  const d = getDistrict(S.currentDistrictId);
  const h = getHouse(S.currentHouseId);
  const loc = (d ? d.name : "緋夜") + (h ? "・" + h.name : "");
  return `── 第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]} · ${loc} ──`;
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

function calcRelRate(suc) {
  if (!suc) return 1;
  return suc.affection >= 55 ? 1.6 : 0.4;
}

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

function rollFacets() {
  const arr = (typeof TRAIT_FACETS !== "undefined" ? TRAIT_FACETS : []).slice().sort(() => Math.random() - 0.5);
  return arr.slice(0, 2);
}

function rollSuccubus(raceKey) {
  const race = RACES.find(r => r.key === raceKey) || pick(RACES);
  const p = pick(PERSONALITIES);
  const gender = Math.random() < 0.5 ? "男" : "女";
  const ap = gender === "男" ? pick(MALE_APPEARANCES) : pick(APPEARANCES);
  const sc = gender === "男" ? pick(MALE_SCENTS) : pick(SCENTS);
  const name = gender === "男" ? pick(MALE_NAMES) : randomName();
  return {
    id: "suc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: name,
    gender: gender,
    raceKey: race.key, raceName: race.name, raceDesc: race.desc,
    foodDesc: race.foodDesc || "",
    appearance: ap, scent: sc,
    personality: p.id, personalityName: p.name, personalityDesc: p.desc,
    speechStyle: p.speech || "",
    facets: rollFacets(),
    defect: null,
    affection: 5, obedience: 10, charm: 5, stamina: 8, stress: 10, hunger: 25,
    origin: "roll", background: "", risk: null,
    contract: "temporary", storyUnlocked: false,
    present: true, place: "",
    collar: "", leash: ""
  };
}

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
  let permIncome = 0;
  let hpCost = 0, goldCost = 0, starveCount = 0;

  S.succubi.forEach(s => { s.present = true; s.place = ""; });
  S.dayMode = null;
  S.needDayChoice = true;
  S.party = [];

  for (const s of S.succubi) {
    s.affection = clampStatObj(s, "affection", (s.affection || 0) - 3);
    s.obedience = clampStatObj(s, "obedience", (s.obedience || 0) - 2);
    s.charm     = clampStatObj(s, "charm",     (s.charm || 0) - 1);
    s.stamina   = clampStatObj(s, "stamina",   (s.stamina || 0) - 1);
    s.stress = clamp(s.stress + 4, 0, 100);

    if (s.collar) { const c = getGearDef(s.collar); if (c && c.wear) applyWear(s, c.wear); }
    if (s.leash)  { const l = getGearDef(s.leash);  if (l && l.wear) applyWear(s, l.wear); }

    if (s.contract === "permanent") {
      s.affection = clampStatObj(s, "affection", (s.affection || 0) + 4);
      s.stress = clamp(s.stress - 2, 0, 100);
      permIncome += 15;
    }

    const race = RACES.find(r => r.key === s.raceKey);
    const feed = (race && race.feed) ? race.feed : { type: "gold", cost: 20 };
    let fed = false;
    if (feed.type === "hp") {
      if (S.master.hp > feed.cost) { S.master.hp = clamp(S.master.hp - feed.cost, 0, S.master.maxHp); hpCost += feed.cost; fed = true; }
    } else {
      if (S.master.gold >= feed.cost) { S.master.gold -= feed.cost; goldCost += feed.cost; fed = true; }
    }
    if (fed) s.hunger = 0;
    else { s.hunger = clamp(s.hunger + 15, 0, 100); starveCount++; }
  }

  let msg = "新的一日來臨。";
  if (hpCost > 0) msg += ` 幾隻魅魔循著你的氣味索食，你的體力被分走了 ${hpCost}。`;
  if (goldCost > 0) msg += ` 你為魅魔張羅吃食，花去 ${goldCost} 金。`;
  if (starveCount > 0) msg += ` 有 ${starveCount} 隻魅魔沒能吃飽，正餓著。`;

  // 自己的吃食＋過夜回復
  const diet = DIET_OPTIONS.find(x => x.id === S.master.diet) || DIET_OPTIONS[1];
  const pay = Math.min(diet.cost, S.master.gold);
  S.master.gold -= pay;
  const recover = Math.round(diet.hpRecover * (diet.cost ? pay / diet.cost : 1));
  S.master.hp = clamp(S.master.hp + recover, 0, S.master.maxHp);
  msg += pay < diet.cost
    ? ` 你手頭緊，只為自己張羅了 ${pay}/${diet.cost} 金的吃食；一夜休息，體力回復 ${recover}。`
    : ` 你為自己張羅吃食，花去 ${diet.cost} 金；一夜休息，體力回復 ${recover}。`;

  // 房產結算
  fluctuateHousePrices();
  if (!S.ownedHouses.includes(S.currentHouseId)) {
    const rent = dailyRent(S.currentHouseId);
    const paid = Math.min(rent, S.master.gold);
    S.master.gold -= paid;
    msg += paid < rent ? ` 你只付得起 ${paid}/${rent} 金房租。` : ` 你為住處支付租金 ${rent} 金。`;
  }
  let rentIncome = 0;
  for (const id of (S.rentedOut || [])) rentIncome += dailyRentIncome(id);
  if (rentIncome > 0) { S.master.gold += rentIncome; msg += ` 你名下出租的房產帶來 ${rentIncome} 金。`; }
  pushLog("system", msg);

  const income = 30 + S.master.rank * 15 + permIncome;
  S.master.gold += income;
  if (permIncome > 0) pushLog("system", `你名下的產業為你帶來 ${income} 金進帳，其中含永久契約的侍奉之禮。`);
  else pushLog("system", `你名下的產業為你帶來 ${income} 金的進帳。`);
}

function maybePromptDayMode() {
  if (S.needDayChoice && typeof openDayModeModal === "function") openDayModeModal();
}

function setDayMode(mode) {
  S.dayMode = mode;
  S.needDayChoice = false;
  if (typeof closeModal === "function") closeModal("modal-daymode");
  if (mode === "rest" && S.succubi.length) {
    S.party = [];
    if (typeof openPartyModal === "function") { openPartyModal(); return; }
  }
  S.party = [];
  S.succubi.forEach(s => { s.present = true; s.place = ""; });
  pushLog("system", `第 ${S.day} 日，你選擇了${mode === "training" ? "訓練日" : "休息日"}。`);
  if (typeof renderAll === "function") renderAll();
}

function setParty(ids) {
  S.party = Array.isArray(ids) ? ids : [];
  S.succubi.forEach(s => {
    s.present = S.party.includes(s.id);
    s.place = s.present ? "" : "房裡";
  });
  const names = S.party.map(id => (getSuccubus(id) || {}).name).filter(Boolean);
  pushLog("system", names.length ? `你帶著 ${names.join("、")} 出門。` : "你獨自出門，把他們留在了房裡。");
  if (typeof renderAll === "function") renderAll();
}

function housePrice(id) {
  if (!S.housePrices) S.housePrices = {};
  if (S.housePrices[id] == null) S.housePrices[id] = (getHouse(id) || {}).price || 0;
  return S.housePrices[id];
}
function fluctuateHousePrices() {
  if (!S.housePrices) S.housePrices = {};
  for (const d of DISTRICTS) for (const h of d.houses) {
    const base = h.price || 0;
    const cur = (S.housePrices[h.id] == null) ? base : S.housePrices[h.id];
    const pct = Math.random() * 0.09 - 0.04;
    let next = Math.round(cur * (1 + pct));
    next = Math.max(Math.round(base * 0.8), Math.min(Math.round(base * 1.3), next));
    S.housePrices[h.id] = next;
  }
}
function dailyRent(id) { return Math.max(5, Math.round(housePrice(id) * 0.007)); }
function dailyRentIncome(id) { return Math.max(3, Math.round(housePrice(id) * 0.005)); }
function sellHousePrice(id) { return Math.max(40, Math.round(housePrice(id) * 0.9)); }

function totalHousingCapacity() {
  let cap = 0;
  const seen = {};
  for (const id of S.ownedHouses) {
    if ((S.rentedOut || []).includes(id)) continue;
    const h = getHouse(id); if (h) { cap += (h.capacity || 1); seen[id] = 1; }
  }
  if (!S.ownedHouses.includes(S.currentHouseId)) {
    const h = getHouse(S.currentHouseId); if (h && !seen[S.currentHouseId]) cap += (h.capacity || 1);
  }
  return Math.max(0, cap);
}

function rentHouse(houseId) {
  const h = getHouse(houseId);
  if (!h) return false;
  if (S.ownedHouses.includes(houseId)) return false;
  S.currentHouseId = houseId;
  const d = DISTRICTS.find(x => x.houses.some(y => y.id === houseId));
  if (d) S.currentDistrictId = d.id;
  pushLog("system", `你租下了「${h.name}」，日租 ${dailyRent(houseId)} 金。`);
  return true;
}

function sellHouse(houseId) {
  if (houseId === S.currentHouseId) { pushLog("system", "這是你現在的住處，先搬到他處才能販售。"); return false; }
  const idx = S.ownedHouses.indexOf(houseId);
  if (idx === -1) return false;
  S.ownedHouses.splice(idx, 1);
  S.rentedOut = (S.rentedOut || []).filter(x => x !== houseId);
  const gold = sellHousePrice(houseId);
  S.master.gold += gold;
  pushLog("system", `你將「${getHouse(houseId).name}」以 ${gold} 金售出。`);
  return true;
}

function rentOutHouse(houseId) {
  if (houseId === S.currentHouseId) { pushLog("system", "這是你現在的住處，先搬到他處才能出租。"); return false; }
  if (!S.ownedHouses.includes(houseId)) return false;
  if ((S.rentedOut || []).includes(houseId)) return false;
  if (!S.rentedOut) S.rentedOut = [];
  S.rentedOut.push(houseId);
  pushLog("system", `你把「${getHouse(houseId).name}」租了出去，每日可收 ${dailyRentIncome(houseId)} 金。`);
  return true;
}

function stopRentOut(houseId) {
  if (!(S.rentedOut || []).includes(houseId)) return false;
  S.rentedOut = S.rentedOut.filter(x => x !== houseId);
  pushLog("system", `你收回了「${getHouse(houseId).name}」。`);
  return true;
}

function generateMarketCandidates(type) {
  const list = [];
  const count = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) list.push(generateOneCandidate(type, i));
  return list;
}

function generateOneCandidate(type, idx) {
  const isOfficial = type === "official";
  const race = pick(RACES), p = pick(PERSONALITIES);
  const gender = Math.random() < 0.5 ? "男" : "女";
  const ap = gender === "男" ? pick(MALE_APPEARANCES) : pick(APPEARANCES);
  const sc = gender === "男" ? pick(MALE_SCENTS) : pick(SCENTS);
  const name = gender === "男" ? pick(MALE_NAMES) : randomName();
  let defect = null, background = "", price = 0;

  if (isOfficial) {
    background = pick(OFFICIAL_BACKGROUNDS);
    if (idx === 0) price = 420 + Math.floor(Math.random() * 340);
    else price = 600 + Math.floor(Math.random() * 800);
  } else {
    background = pick(BLACKMARKET_BACKGROUNDS);
    price = 150 + Math.floor(Math.random() * 450);
    if (Math.random() < 0.85) defect = pick(DEFECTS);
  }
  if (defect) price = Math.max(80, Math.floor(price * 0.7));

  return {
    id: "cand_" + type + "_" + idx + "_" + Math.floor(Math.random() * 10000),
    name: name,
    gender: gender,
    raceKey: race.key, raceName: race.name, raceDesc: race.desc,
    foodDesc: race.foodDesc || "",
    appearance: ap, scent: sc,
    personality: p.id, personalityName: p.name, personalityDesc: p.desc,
    speechStyle: p.speech || "",
    facets: rollFacets(),
    defect: defect, background: background, price: price,
    risk: isOfficial ? "低風險" : "高風險",
    statSeed: {
      affection: isOfficial ? randInt(10, 29) : randInt(2, 9),
      obedience: isOfficial ? randInt(20, 49) : randInt(3, 12),
      charm:     isOfficial ? randInt(12, 34) : randInt(4, 14),
      stamina:   isOfficial ? randInt(15, 39) : randInt(5, 16),
      stress:    isOfficial ? randInt(5, 12) : randInt(20, 39),
      hunger:    randInt(20, 39)
    }
  };
}

function openMarket(type) {
  if (!MARKET_INFO[type]) return;
  if (type === "blackmarket" && !S.hasPurchased) {
    pushLog("system", "你尚無名下魅魔，暗巷黑市還不對你敞開。先到官方契約廳，挑一雙屬於你的眼睛吧。");
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

  if (S.succubi.length >= totalHousingCapacity()) {
    pushLog("system", "你的住處已無空位，無法再收容新的魅魔。請先購入或租下更大的房產。");
    if (typeof renderMarket === "function") renderMarket();
    return;
  }
  if (S.master.gold < c.price) {
    pushLog("system", `你的錢袋不夠沉，還差 ${c.price - S.master.gold} 金。`);
    if (typeof renderMarket === "function") renderMarket();
    return;
  }
  S.master.gold -= c.price;
  const suc = {
    id: "suc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    name: c.name,
    gender: c.gender || "女",
    raceKey: c.raceKey, raceName: c.raceName, raceDesc: c.raceDesc,
    foodDesc: c.foodDesc || "",
    appearance: c.appearance, scent: c.scent,
    personality: c.personality, personalityName: c.personalityName, personalityDesc: c.personalityDesc,
    speechStyle: c.speechStyle || "",
    facets: c.facets || [],
    defect: c.defect, background: c.background, risk: c.risk,
    origin: c.risk === "低風險" ? "official" : "blackmarket",
    affection: c.statSeed.affection, obedience: c.statSeed.obedience,
    charm: c.statSeed.charm || 0, stamina: c.statSeed.stamina || 0,
    stress: c.statSeed.stress, hunger: c.statSeed.hunger,
    contract: "temporary", storyUnlocked: false,
    present: true, place: "",
    collar: "", leash: ""
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
    if (r && typeof appendStoryMessage === "function") appendStoryMessage("story", r.narrative);
    if (r) S.currentChoices = r.choices || [];
  }
  pushLog("system", `契約成立。${suc.name} 從此納入你的名下，${suc.risk}的出身，往後都得由你負責。`);
  if (typeof renderAll === "function") renderAll();
}

function computeQuality(suc) {
  return Math.round(
    (suc.affection || 0) * 0.8 + (suc.obedience || 0) * 1.0 +
    (suc.charm || 0) * 0.8 + (suc.stamina || 0) * 0.5 +
    (100 - suc.stress) * 0.6 - (suc.hunger || 0) * 0.4
  );
}

function officialPrice(suc) {
  const g = succubusGrade(suc);
  const base = 120 + computeQuality(suc) * 0.6;
  return Math.max(80, Math.round(base * g.priceMult));
}
function blackPrice(suc) { return Math.max(150, Math.round(officialPrice(suc) * (1.4 + Math.random() * 0.6))); }
function auctionPrice(suc) { return Math.round(officialPrice(suc) * (1.8 + Math.random() * 1.2)); }

function prepareSell(succubusId, channel) {
  const suc = getSuccubus(succubusId);
  if (!suc) return null;
  if (suc.contract === "permanent") { pushLog("system", "已締下永久之契，不能再被轉讓。"); return null; }

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
    if (!isHighDistrict(S.currentDistrictId)) { pushLog("system", "拍賣會只在高等街區舉辦。"); S.sellState = null; return null; }
    const g = succubusGrade(suc);
    const allow = (AUCTION_INFO.minGrade || ["A", "S"]);
    if (allow.indexOf(g.grade) === -1) {
      pushLog("system", `拍賣會只收 ${allow.join("／")} 級。目前是 ${g.grade} 級（${g.name}），火候還不夠。`);
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

function signPermanentContract(succubusId) {
  const suc = getSuccubus(succubusId);
  if (!suc) return false;
  if (suc.contract === "permanent") { pushLog("system", "早已是你緋夜的一部分。"); return false; }
  if (suc.affection < CONTRACT_INFO.permanentAffectionReq) {
    pushLog("system", `心意尚未抵達。永久之契需要好感達到 ${CONTRACT_INFO.permanentAffectionReq}。`);
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
  pushLog("system", `以血與吻烙下永久之契。${suc.name} 從此不再是可以易手的貨物。`);
  return true;
}

function applyEffects(suc, fx) {
  if (!suc || !fx) return;
  let aff = fx.affection || 0, obe = fx.obedience || 0, cha = fx.charm || 0;
  if (suc.contract === "permanent") {
    if (aff > 0) aff = Math.round(aff * 1.5);
    if (obe > 0) obe = Math.round(obe * 1.5);
    if (cha > 0) cha = Math.round(cha * 1.5);
  }
  suc.affection = clampStatObj(suc, "affection", (suc.affection || 0) + aff);
  suc.obedience = clampStatObj(suc, "obedience", (suc.obedience || 0) + obe);
  suc.charm     = clampStatObj(suc, "charm",     (suc.charm || 0) + cha);
  suc.stamina   = clampStatObj(suc, "stamina",   (suc.stamina || 0) + (fx.stamina || 0));
  suc.stress = clamp(suc.stress + (fx.stress || 0), 0, 100);
  suc.hunger = clamp(suc.hunger + (fx.hunger || 0), 0, 100);
}

function applyWear(suc, wear) {
  if (!suc || !wear) return;
  if (wear.affection) suc.affection = clampStatObj(suc, "affection", (suc.affection || 0) + wear.affection);
  if (wear.obedience) suc.obedience = clampStatObj(suc, "obedience", (suc.obedience || 0) + wear.obedience);
  if (wear.charm)     suc.charm     = clampStatObj(suc, "charm",     (suc.charm || 0) + wear.charm);
  if (wear.stamina)   suc.stamina   = clampStatObj(suc, "stamina",   (suc.stamina || 0) + wear.stamina);
  if (wear.stress)    suc.stress    = clamp(suc.stress + wear.stress, 0, 100);
}

function consumeItemByStory(itemId, succubusId) {
  const idx = S.inventory.indexOf(itemId);
  if (idx === -1) return false;
  S.inventory.splice(idx, 1);
  const item = getItem(itemId);
  const suc = getSuccubus(succubusId) || currentSuccubus();
  if (item && suc) {
    const before = snapStats(suc);
    applyEffects(suc, item.effects);
    if (item.satiates) suc.hunger = 0;
    if (item.masterHp) {
      S.master.hp = clamp(S.master.hp + item.masterHp, 0, S.master.maxHp);
      pushLog("system", `駕馭「${item.name}」耗去了你 ${-item.masterHp} 點體力。`);
    }
    pushLog("story", `你使用了「${item.name}」。${item.desc}`);
    notifyStatChange(suc, before);
    addMasterExp(3);
  }
  return true;
}

function useItemOnSuccubus(itemId, succubusId) { return consumeItemByStory(itemId, succubusId); }

const SHOP_INFO = {
  official:    { name: "官方道具行",     desc: "高塔區的官方道具行，明碼標價。", riskLabel: "正規" },
  blackmarket: { name: "暗巷黑市道具鋪", desc: "暗巷深處的祕密鋪子。", riskLabel: "違禁" }
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
  bm_tri_shackle: "blackmarket", bm_iron_mask: "blackmarket", bm_twin_serpent: "blackmarket",
  plug_jade: "official", male_ring: "official", male_pearl: "official", male_chastity: "official", male_frenulum: "official",
  male_arousal_oil: "blackmarket", bm_male_cage: "blackmarket", bm_male_rod: "blackmarket", bm_male_electro: "blackmarket"
};

function shopItems(type) { return ITEMS.filter(it => SHOP_ITEM_SOURCE[it.id] === type); }

function buyItem(itemId) {
  const it = getItem(itemId);
  if (!it) return false;
  if (S.master.gold < it.price) { pushLog("system", `你的錢袋不夠沉，還差 ${it.price - S.master.gold} 金。`); return false; }
  if (S.master.rank < it.rankReq) { pushLog("system", `你的階級尚不足以駕馭「${it.name}」。`); return false; }
  S.master.gold -= it.price;
  addItem(itemId);
  pushLog("system", `你購入了「${it.name}」。${it.desc}`);
  return true;
}

function collarShopItems(type) { return [...COLLARS, ...LEASHES].filter(g => g.source === type); }

function buyGear(gearId) {
  const g = getGearDef(gearId);
  if (!g) return false;
  if (!S.gear) S.gear = {};
  if (S.master.gold < g.price) { pushLog("system", `你的錢袋不夠沉，還差 ${g.price - S.master.gold} 金。`); return false; }
  if (S.master.rank < (g.rankReq || 1)) { pushLog("system", `你的階級尚不足以購入「${g.name}」。`); return false; }
  S.master.gold -= g.price;
  S.gear[gearId] = (S.gear[gearId] || 0) + 1;
  pushLog("system", `你購入了「${g.name}」。${g.desc}`);
  return true;
}

function equipGear(succubusId, gearId) {
  const suc = getSuccubus(succubusId);
  const kind = gearKind(gearId);
  if (!suc || !kind) return false;
  if (gearOwnedCount(gearId) <= 0) return false;
  if (!S.gear) S.gear = {};
  const prevId = suc[kind];
  if (prevId) S.gear[prevId] = (S.gear[prevId] || 0) + 1;
  S.gear[gearId] -= 1;
  if (S.gear[gearId] <= 0) delete S.gear[gearId];
  suc[kind] = gearId;
  const g = getGearDef(gearId);
  pushLog("system", `${suc.name} 配上了「${g.name}」（${g.material}·${g.look}·${g.weight}）。`);
  return true;
}

function unequipGear(succubusId, kind) {
  const suc = getSuccubus(succubusId);
  if (!suc) return false;
  const id = suc[kind];
  if (!id) return false;
  if (!S.gear) S.gear = {};
  S.gear[id] = (S.gear[id] || 0) + 1;
  suc[kind] = "";
  pushLog("system", `${suc.name} 卸下了「${getGearDef(id).name}」。`);
  return true;
}

function isLeashReady(suc) { return !!(suc && suc.collar && suc.leash); }

function processAICommands(cmd) {
  if (!cmd) return;
  const n = (v, d) => { const x = Math.round(Number(v)); return isNaN(x) ? (d || 0) : x; };

  if (cmd.narrative && typeof appendStoryMessage === "function") {
    appendStoryMessage("system", sceneHeader());
    appendStoryMessage("story", cmd.narrative);
    if (typeof appendTokenNote === "function") appendTokenNote();
  }

  if (Array.isArray(cmd.commands)) {
    for (const c of cmd.commands) {
      if (!c) continue;
      switch (c.type) {
        case "item": consumeItemByStory(c.itemId, c.succubusId); break;
        case "feed": {
          const suc = getSuccubus(c.succubusId) || currentSuccubus();
          if (suc) { suc.hunger = 0; pushLog("system", `［${suc.name}］飽足，飢餓歸零`); }
          break;
        }
        case "train": {
          const suc = getSuccubus(c.succubusId) || currentSuccubus();
          if (suc) {
            const before = snapStats(suc);
            const obe = clamp(n(c.obedience), 0, 40);
            suc.obedience = clampStatObj(suc, "obedience", (suc.obedience || 0) + obe);
            if (c.affection) suc.affection = clampStatObj(suc, "affection", (suc.affection || 0) + n(c.affection));
            if (c.charm) suc.charm = clampStatObj(suc, "charm", (suc.charm || 0) + n(c.charm));
            if (c.stamina) suc.stamina = clampStatObj(suc, "stamina", (suc.stamina || 0) + n(c.stamina));
            if (c.stress) suc.stress = clamp(suc.stress + n(c.stress), 0, 100);
            if (c.hunger) suc.hunger = clamp(suc.hunger + n(c.hunger), 0, 100);
            notifyStatChange(suc, before);
            const expGain = (c.exp != null) ? n(c.exp) : Math.round(obe * 0.8);
            if (expGain) addMasterExp(expGain);
            if (c.hp) {
              S.master.hp = clamp(S.master.hp + n(c.hp), 0, S.master.maxHp);
              pushLog("system", `這套調教耗去你 ${-n(c.hp)} 點體力。`);
            }
          }
          break;
        }
        case "stat": {
          const suc = getSuccubus(c.succubusId) || currentSuccubus();
          if (suc && c.delta) {
            const before = snapStats(suc);
            applyEffects(suc, c.delta);
            notifyStatChange(suc, before);
          }
          break;
        }
        case "presence": {
          const suc = getSuccubus(c.succubusId) || currentSuccubus();
          if (suc) {
            const was = suc.present;
            suc.present = (c.present !== false);
            suc.place = c.place || "";
            if (was !== suc.present) {
              pushLog("system", `［${suc.name}］${suc.present ? "回到了你身邊" : ("離開了你身邊" + (suc.place ? `（${suc.place}）` : ""))}`);
            }
          }
          break;
        }
        case "time": advanceTime(n(c.phases, 1) || 1); break;
        case "gold": { const amt = n(c.amount); if (amt) S.master.gold = Math.max(0, S.master.gold + amt); break; }
        case "hp": { const amt = n(c.amount); if (amt) S.master.hp = clamp(S.master.hp + amt, 0, S.master.maxHp); break; }
        case "exp": { const amt = n(c.amount); if (amt) addMasterExp(amt); break; }
      }
    }
  }

  if (Array.isArray(cmd.choices) && cmd.choices.length) S.currentChoices = cmd.choices;
  if (typeof renderAll === "function") renderAll();
  maybePromptDayMode();
}

function pushLog(type, text) {
  if (!S.logs) S.logs = [];
  S.logs.push({ type, text, t: Date.now() });
}

const SAVE_KEY = "ck_save_v4";

function applyLoadedState(parsed) {
  const base = defaultState();
  S = Object.assign(base, parsed);

  S.market = { type: null, candidates: [], selectedId: null, cache: {} };
  S.sellState = null;
  if (!S.master || typeof S.master !== "object") S.master = base.master;
  if (!S.master.diet) S.master.diet = "normal";
  S.succubi = Array.isArray(S.succubi) ? S.succubi : [];
  S.succubi.forEach(s => {
    if (typeof s.present !== "boolean") s.present = true;
    if (typeof s.place !== "string") s.place = "";
    if (typeof s.charm !== "number") s.charm = 0;
    if (typeof s.stamina !== "number") s.stamina = 0;
    if (typeof s.gender !== "string") s.gender = "女";
    if (!Array.isArray(s.facets)) s.facets = [];
    if (typeof s.collar !== "string") s.collar = "";
    if (typeof s.leash !== "string") s.leash = "";
    if (!s.speechStyle) { const p = PERSONALITIES.find(x => x.id === s.personality); s.speechStyle = p ? p.speech : ""; }
  });
  S.inventory = Array.isArray(S.inventory) ? S.inventory : [];
  S.gear = (S.gear && typeof S.gear === "object") ? S.gear : {};
  S.ownedHouses = Array.isArray(S.ownedHouses) ? S.ownedHouses : ["oldtown_loft"];
  S.rentedOut = Array.isArray(S.rentedOut) ? S.rentedOut : [];
  S.housePrices = (S.housePrices && typeof S.housePrices === "object") ? S.housePrices : {};
  S.party = Array.isArray(S.party) ? S.party : [];
  if (typeof S.dayMode !== "string" || !S.dayMode) S.dayMode = "training";
  if (typeof S.needDayChoice !== "boolean") S.needDayChoice = false;
  S.currentChoices = Array.isArray(S.currentChoices) ? S.currentChoices : [];
  S.logs = Array.isArray(S.logs) ? S.logs : [];
  S.facts = Array.isArray(S.facts) ? S.facts : [];
  S.history = Array.isArray(S.history) ? S.history : [];
  S.hasPurchased = !!S.hasPurchased || S.succubi.length > 0;
  if (typeof S.day !== "number") S.day = 1;
  if (typeof S.subPhase !== "number") S.subPhase = 0;
}

function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; }
  catch (e) { return false; }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    applyLoadedState(JSON.parse(raw));
    return true;
  } catch (e) {
    return false;
  }
}

function exportSave() {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  catch (e) { return ""; }
}

function importSave(code) {
  try {
    const json = decodeURIComponent(escape(atob(String(code).trim())));
    applyLoadedState(JSON.parse(json));
    if (typeof renderAll === "function") renderAll();
    return true;
  } catch (e) { return false; }
}

function resetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  S = defaultState();
  if (typeof renderAll === "function") renderAll();
}
