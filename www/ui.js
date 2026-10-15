/* ============================================================
   《緋夜飼育錄》介面渲染 ui.js
   ============================================================ */

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function signed(n) { return n > 0 ? "+" + n : "" + n; }

function effText(eff) {
  if (!eff) return "";
  const parts = [];
  const add = (label, k) => { if (eff[k]) parts.push(`${label}${signed(eff[k])}`); };
  add("好感", "affection"); add("服從", "obedience"); add("魅惑", "charm");
  add("體能", "stamina"); add("壓力", "stress"); add("飢餓", "hunger");
  return parts.join("　");
}

function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add("open"); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove("open"); }
function closeAllModals() { document.querySelectorAll(".modal-overlay.open").forEach(m => m.classList.remove("open")); }

let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

let thinkingEl = null;
function showThinking() {
  const log = document.getElementById("story-log");
  if (!log) return;
  thinkingEl = document.createElement("div");
  thinkingEl.className = "msg msg-system thinking";
  thinkingEl.textContent = "……";
  log.appendChild(thinkingEl);
  log.scrollTop = log.scrollHeight;
}
function hideThinking() {
  if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; }
}

function renderAll() {
  renderStatusBar();
  renderStoryLog();
  renderChoices();
  renderSuccubi();
  renderMaster();
  renderInventory();
  renderProperty();
}

function renderStatusBar() {
  const m = S.master;
  document.getElementById("stat-day").textContent = `第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}`;
  document.getElementById("stat-gold").textContent = `${m.gold} 金`;
  document.getElementById("stat-rank").textContent = getRank(m.rank).name;
}

function switchTab(tabId) {
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById("panel-" + tabId);
  if (panel) panel.classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
}

function appendStoryMessage(type, text) {
  pushLog(type, text);
  const log = document.getElementById("story-log");
  if (!log) return;
  const el = document.createElement("div");
  el.className = "msg msg-" + type;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function renderStoryLog() {
  const log = document.getElementById("story-log");
  log.innerHTML = (S.logs || []).map(l => `<div class="msg msg-${l.type}">${escapeHtml(l.text)}</div>`).join("");
  log.scrollTop = log.scrollHeight;
}

function renderChoices() {
  const box = document.getElementById("choice-list");
  if (!S.currentChoices || !S.currentChoices.length) { box.innerHTML = ""; return; }
  box.innerHTML = S.currentChoices.map((c, i) => `<button class="choice-btn" data-i="${i}">${escapeHtml(c)}</button>`).join("");
}

function renderMaster() {
  const m = S.master;
  const rank = getRank(m.rank);
  const next = MASTER_RANKS.find(r => r.rank === m.rank + 1);
  document.getElementById("master-rank-name").textContent = `${rank.name} · ${rank.desc}`;
  document.getElementById("master-hp").textContent = m.hp;
  document.getElementById("master-gold").textContent = m.gold;
  document.getElementById("master-exp-text").textContent = next ? `${m.exp} / ${next.expNeed}` : `${m.exp} / 滿階`;
  document.getElementById("master-exp-bar").style.width = (next ? clamp(m.exp / next.expNeed * 100, 0, 100) : 100) + "%";
  document.getElementById("master-style").innerHTML = MASTER_STYLES
    .map(s => `<option value="${s.id}" ${s.id === m.style ? "selected" : ""}>${s.name} — ${s.desc}</option>`).join("");
  document.getElementById("master-persona").value = m.persona || "";
}

function statItem(label, val, cls, max, color) {
  const mx = max || 100;
  const pct = Math.max(0, Math.min(100, ((val || 0) / mx) * 100));
  const colorStyle = color ? `background:${color};` : "";
  return `<div class="stat-item">
    <div class="stat-label"><span>${label}</span><b>${val || 0}</b></div>
    <div class="bar-track ${cls}"><div class="bar-fill" style="width:${pct}%;${colorStyle}"></div></div>
  </div>`;
}

function gradeBadge(g) {
  return `<span style="display:inline-block;padding:1px 7px;border-radius:8px;font-size:11px;font-weight:700;background:#775C56;color:#F8F4E8">${g.grade}級·${g.name}</span>`;
}

function succubusStatsHtml(s) {
  return `<div class="stat-grid">
    ${statItem("好感", s.affection, "bar-affection", 300)}
    ${statItem("服從", s.obedience, "bar-obedience", 300)}
    ${statItem("魅惑", s.charm, "bar-charm", 300, "#E39BB6")}
    ${statItem("體能", s.stamina, "bar-stamina", 300, "#8FC7B8")}
    ${statItem("壓力", s.stress, "bar-stress", 100)}
    ${statItem("飢餓", s.hunger, "bar-hunger", 100)}
  </div>`;
}

function gearStatusTag(s) {
  if (isLeashReady(s)) return '<span class="tag tag-safe">已繫妥可牽引</span>';
  if (s.collar || s.leash) return '<span class="tag tag-muted">配件未成套</span>';
  return "";
}

function renderSuccubi() {
  const box = document.getElementById("succubi-list");
  if (!S.succubi.length) {
    box.innerHTML = `<div class="card"><p style="color:var(--ink-soft);font-size:13.5px">你的名下尚無魅魔。夜色很靜，只差一雙屬於你的眼睛。</p></div>`;
    return;
  }
  box.innerHTML = S.succubi.map(s => {
    const perm = s.contract === "permanent";
    const g = succubusGrade(s);
    const defTag = s.defect ? `<span class="tag tag-risk">${escapeHtml(s.defect.name)}</span>` : "";
    const presTag = s.present ? '<span class="tag tag-safe">在身邊</span>' : `<span class="tag tag-muted">不在${s.place ? "・" + escapeHtml(s.place) : ""}</span>`;
    return `<div class="succubus-card" onclick="openSuccubusDetail('${s.id}')">
      <div class="succubus-top">
        <div class="avatar">${escapeHtml(s.name.charAt(0))}</div>
        <div>
          <div class="succubus-name">${escapeHtml(s.name)} ${gradeBadge(g)} ${perm ? '<span class="tag tag-safe">永久契約</span>' : '<span class="tag tag-muted">暫時契約</span>'} ${presTag}</div>
          <div class="succubus-sub">${escapeHtml(s.raceName)} · ${escapeHtml(s.personalityName)} ${defTag} ${gearStatusTag(s)}</div>
        </div>
      </div>
      ${succubusStatsHtml(s)}
      <div class="succubus-actions">
        ${perm ? "" : `<button class="btn" onclick="event.stopPropagation(); openSellFlow('${s.id}')">契約轉讓</button>`}
        ${perm ? "" : `<button class="btn" onclick="event.stopPropagation(); openContractFlow('${s.id}')">簽訂永久契約</button>`}
      </div>
    </div>`;
  }).join("");
}

function gearPickerRow(suc, kind, label) {
  const curId = suc[kind];
  const cur = curId ? getGearDef(curId) : null;
  const owned = Object.keys(S.gear || {}).filter(id => S.gear[id] > 0 && gearKind(id) === kind);
  const opts = owned.map(id => {
    const g = getGearDef(id);
    return `<button class="btn" style="margin:2px" onclick="doEquipGear('${suc.id}','${id}')">${escapeHtml(g.name)}（${g.material}·${g.look}·${g.weight}）</button>`;
  }).join("");
  const curText = cur ? `${escapeHtml(cur.name)}（${cur.material}·${cur.look}·${cur.weight}）` : "未配戴";
  const unBtn = cur ? `<button class="btn" style="margin:2px" onclick="doUnequipGear('${suc.id}','${kind}')">卸下</button>` : "";
  return `<div class="row"><b>${label}</b>　${curText} ${unBtn}
    <div style="margin-top:6px">${opts || '<span style="font-size:12.5px;color:var(--ink-soft)">（背包內無其他' + label + '）</span>'}</div>
  </div>`;
}

function openSuccubusDetail(id) {
  const s = getSuccubus(id);
  if (!s) return;
  document.getElementById("succubus-title").textContent = s.name;
  const perm = s.contract === "permanent";
  const g = succubusGrade(s);
  const score = succubusGradeScore(s);
  const riskTag = s.risk ? `<span class="tag ${s.risk === "低風險" ? "tag-safe" : "tag-risk"}">${s.risk}</span>` : "";
  const presTag = s.present ? '<span class="tag tag-safe">在身邊</span>' : `<span class="tag tag-muted">不在${s.place ? "・" + escapeHtml(s.place) : ""}</span>`;
  document.getElementById("succubus-body").innerHTML = `
    <div class="candidate-detail">
      <div class="row"><b>${escapeHtml(s.name)}</b>　${gradeBadge(g)}　<span class="tag ${perm ? "tag-safe" : "tag-muted"}">${perm ? "永久契約" : "暫時契約"}</span> ${presTag} ${riskTag}</div>
      <div class="row"><b>等級</b>　${g.grade} 級 · ${g.name}（綜合 ${score}）　${escapeHtml(g.desc)}</div>
      <div class="row"><b>種族</b>　${escapeHtml(s.raceName)}　${escapeHtml(s.raceDesc || "")}</div>
      <div class="row"><b>個性</b>　${escapeHtml(s.personalityName)}　${escapeHtml(s.personalityDesc || "")}</div>
      <div class="row"><b>說話風格</b>　${escapeHtml(s.speechStyle || "")}</div>
      <div class="row"><b>外貌</b>　${escapeHtml(s.appearance || "")}</div>
      <div class="row"><b>氣味</b>　${escapeHtml(s.scent || "")}</div>
      ${s.defect ? `<div class="row"><b>缺陷</b>　<span class="tag tag-risk">${escapeHtml(s.defect.name)}</span>　${escapeHtml(s.defect.desc || "")}</div>` : ""}
      ${s.background ? `<div class="row"><b>來歷</b>　${escapeHtml(s.background)}</div>` : ""}
      ${succubusStatsHtml(s)}
      <div class="row"><button class="btn" onclick="openStatGuide()">屬性說明（六個數值怎麼加減）</button></div>
      <div class="row" style="margin-top:6px"><b>配件</b>　${gearStatusTag(s)}</div>
      ${gearPickerRow(s, "collar", "項圈")}
      ${gearPickerRow(s, "leash", "牽引繩")}
    </div>`;
  openModal("modal-succubus");
}

function doEquipGear(sucId, gearId) {
  if (equipGear(sucId, gearId)) { saveGame(); openSuccubusDetail(sucId); renderAll(); showToast("已配戴。"); }
  else showToast("配戴失敗。");
}
function doUnequipGear(sucId, kind) {
  if (unequipGear(sucId, kind)) { saveGame(); openSuccubusDetail(sucId); renderAll(); showToast("已卸下。"); }
}

/* ---------- 屬性說明 ---------- */
function openStatGuide() {
  const body = document.getElementById("help-body");
  if (!body) return;
  body.innerHTML = (STAT_GUIDE || []).map(g => `
    <div class="row" style="display:block;margin-bottom:12px">
      <div style="font-weight:700;color:${g.color}">${g.name}</div>
      <div style="font-size:12.5px;color:var(--ink-soft);margin-top:2px">▲ 提升：${g.up.join("、")}</div>
      <div style="font-size:12.5px;color:var(--ink-soft)">▼ 下降：${g.down.join("、")}</div>
    </div>`).join("") + `
    <div class="row" style="display:block;margin-top:8px;font-size:12.5px;color:var(--ink-soft)">
      綜合等級（S~F）＝ 平均(魅惑, 服從, 體能)。等級越高，賣價越高；拍賣會只收 A／S 級。
    </div>`;
  openModal("modal-help");
}

/* ---------- 背包 ---------- */
function renderInventory() {
  const box = document.getElementById("inventory-list");
  const counts = {};
  S.inventory.forEach(id => counts[id] = (counts[id] || 0) + 1);
  const itemHtml = Object.keys(counts).map(id => {
    const it = getItem(id);
    if (!it) return "";
    const isCodex = it.category === "高階";
    return `<div class="item-card ${isCodex ? "codex" : ""}">
      <div class="item-head"><span class="item-name">${escapeHtml(it.name)} ×${counts[id]}</span><span class="tag ${isCodex ? "tag-risk" : "tag-muted"}">${escapeHtml(it.category)}</span></div>
      <div class="item-desc">${escapeHtml(it.desc)}</div>
      <div class="item-effects">${effText(it.effects)}${it.satiates ? "　（飽足）" : ""}</div>
    </div>`;
  }).join("");

  const gear = S.gear || {};
  const gearIds = Object.keys(gear).filter(id => gear[id] > 0);
  const gearHtml = gearIds.map(id => {
    const g = getGearDef(id);
    if (!g) return "";
    const kind = gearKind(id) === "collar" ? "項圈" : "牽引繩";
    return `<div class="item-card">
      <div class="item-head"><span class="item-name">${escapeHtml(g.name)} ×${gear[id]}</span><span class="tag tag-muted">${kind}</span></div>
      <div class="item-desc">材質 ${escapeHtml(g.material)}　外型 ${escapeHtml(g.look)}　重量 ${escapeHtml(g.weight)}${g.forbidden ? "　<span class='tag tag-risk'>禁忌</span>" : ""}</div>
      <div class="item-effects">每日配戴：${effText(g.wear)}</div>
    </div>`;
  }).join("");

  if (!itemHtml && !gearHtml) {
    box.innerHTML = `<div class="card"><p style="color:var(--ink-soft);font-size:13.5px">背包空空如也。緋夜的道具與配件，可到商店裡尋。</p></div>`;
    return;
  }
  box.innerHTML = itemHtml + (gearHtml ? `<div class="panel-head" style="margin-top:8px"><b>配件</b></div>${gearHtml}` : "");
}

/* ---------- 房產 ---------- */
function renderProperty() {
  const box = document.getElementById("property-list");
  box.innerHTML = DISTRICTS.map(d => {
    const rankReq = districtRankReq(d.id);
    const locked = S.master.rank < rankReq;
    const openCls = (!locked && S.currentDistrictId === d.id) ? " open" : "";
    const badge = locked
      ? `<span class="tag tag-risk">需 ${getRank(rankReq).name}</span>`
      : (d.isHigh ? '<span class="tag tag-safe">高級街區</span>' : '');
    return `<div class="district-block${openCls}" data-district="${d.id}">
      <div class="district-head" onclick="toggleDistrict('${d.id}')">
        <div><div class="name">${escapeHtml(d.name)} ${badge}</div><div class="desc">${escapeHtml(d.desc)}</div></div>
      </div>
      <div class="district-body">
        ${locked
          ? `<div style="font-size:12.5px;color:var(--ink-soft)">你的名望尚不足以踏足此地，需晉升至【${getRank(rankReq).name}】。</div>`
          : d.houses.map(h => {
              const owned = S.ownedHouses.includes(h.id);
              const current = S.currentHouseId === h.id;
              return `<div class="house-row">
                <div class="info"><div class="name">${escapeHtml(h.name)} ${current ? '<span class="tag tag-safe">現居</span>' : ""}</div><div class="desc">${escapeHtml(h.desc)}</div></div>
                ${current ? "" : owned ? `<button class="btn" onclick="handleMoveHouse('${h.id}')">遷入</button>` : `<button class="btn btn-accent" onclick="handleBuyHouse('${h.id}')">${h.price} 金 購入</button>`}
              </div>`;
            }).join("")}
      </div>
    </div>`;
  }).join("");
}

/* ---------- 市場 ---------- */
function openMarketChoiceModal() {
  document.getElementById("market-title").textContent = "緋夜市場";
  const hasSuc = !!S.hasPurchased;
  const blackBtn = hasSuc
    ? `<button class="btn" onclick="openMarket('blackmarket')">暗巷黑市 <span class="tag tag-risk">高風險</span></button>`
    : `<button class="btn" disabled>暗巷黑市 <span class="tag tag-risk">未開放</span></button>`;
  const note = hasSuc ? "" : `<p style="font-size:12.5px;color:var(--ink-soft)">初入緋夜，暗巷黑市還不對你敞開。先購得第一隻魅魔，才有人為你引路。</p>`;
  document.getElementById("market-body").innerHTML = `
    <div class="market-intro">今夜，你要踏入哪一扇門？</div>
    <button class="btn" onclick="openMarket('official')">官方契約市場 <span class="tag tag-safe">低風險</span></button>
    ${blackBtn}
    ${note}`;
  openModal("modal-market");
}

function renderMarket() {
  const info = MARKET_INFO[S.market.type];
  if (!info) return;
  document.getElementById("market-title").textContent = info.name;
  document.getElementById("market-body").innerHTML = `
    <div class="market-intro">${escapeHtml(info.desc)}　<span class="tag ${info.type === "official" ? "tag-safe" : "tag-risk"}">${info.riskLabel}</span></div>
    ${S.market.candidates.map(c => {
      const g = candidateGrade(c);
      return `
      <div class="market-card ${info.type}" onclick="inspectCandidate('${c.id}')">
        <div class="top"><span class="name">${escapeHtml(c.name)}　${gradeBadge(g)}</span><span class="price">${c.price} 金</span></div>
        <div class="meta">${escapeHtml(c.raceName)} · ${escapeHtml(c.personalityName)} · <span class="tag ${c.risk === "低風險" ? "tag-safe" : "tag-risk"}">${c.risk}</span></div>
        <div class="background">${escapeHtml(c.background)}</div>
      </div>`;
    }).join("")}`;
  openModal("modal-market");
}

function renderCandidateDetail(c) {
  const body = document.getElementById("market-body");
  const g = candidateGrade(c);
  const seed = c.statSeed || {};
  body.innerHTML = `
    <div class="candidate-detail">
      <div class="row"><b>${escapeHtml(c.name)}</b>　${gradeBadge(g)}　<span class="tag ${c.risk === "低風險" ? "tag-safe" : "tag-risk"}">${c.risk}</span></div>
      <div class="row"><b>外貌</b>　${escapeHtml(c.appearance)}</div>
      <div class="row"><b>氣味</b>　${escapeHtml(c.scent)}</div>
      <div class="row"><b>種族</b>　${escapeHtml(c.raceName)}　${escapeHtml(c.raceDesc)}</div>
      <div class="row"><b>個性</b>　${escapeHtml(c.personalityName)}　${escapeHtml(c.personalityDesc)}</div>
      ${c.defect ? `<div class="row"><b>缺陷</b>　<span class="tag tag-risk">${escapeHtml(c.defect.name)}</span>　${escapeHtml(c.defect.desc)}</div>` : ""}
      <div class="row"><b>來歷</b>　${escapeHtml(c.background)}</div>
      <div class="row"><b>潛質</b>　好感${seed.affection || 0}　服從${seed.obedience || 0}　魅惑${seed.charm || 0}　體能${seed.stamina || 0}　壓力${seed.stress || 0}　飢餓${seed.hunger || 0}</div>
      <div class="row"><b>價格</b>　${c.price} 金</div>
      <button class="btn btn-accent" onclick="showConfirm('${c.id}')">決定購買</button>
      <button class="btn" onclick="renderMarket()">返回清單</button>
    </div>`;
}

function showConfirmModal(c) {
  document.getElementById("confirm-title").textContent = "契約確認";
  document.getElementById("confirm-body").innerHTML = `
    <p style="font-size:14px">你確定要以 <b style="color:var(--accent-warn)">${c.price} 金</b> 簽下 ${escapeHtml(c.name)} 嗎？</p>
    <p style="font-size:12.5px;color:var(--ink-soft)">${escapeHtml(c.risk)} · ${escapeHtml(c.raceName)} · ${escapeHtml(c.personalityName)}</p>`;
  document.getElementById("confirm-actions").innerHTML = `
    <button class="btn" onclick="closeModal('modal-confirm')">再想想</button>
    <button class="btn btn-accent" onclick="confirmPurchase()">確定締約</button>`;
  openModal("modal-confirm");
}

/* ---------- 道具商店 ---------- */
let currentShopType = "official";

function openShopChoice() {
  document.getElementById("shop-title").textContent = "道具商店";
  document.getElementById("shop-body").innerHTML = `
    <div class="market-intro">今夜，你要推開哪一扇鋪門？</div>
    <button class="btn" onclick="openShop('official')">官方道具行 <span class="tag tag-safe">正規 · 入門補品</span></button>
    <button class="btn" onclick="openShop('blackmarket')">暗巷黑市道具鋪 <span class="tag tag-risk">違禁 · 高階</span></button>`;
  openModal("modal-shop");
}

function openShop(type) {
  currentShopType = type;
  const info = SHOP_INFO[type];
  if (!info) return;
  document.getElementById("shop-title").textContent = info.name;
  renderShop(type);
  openModal("modal-shop");
}

function renderShop(type) {
  const info = SHOP_INFO[type];
  const list = shopItems(type);
  const body = document.getElementById("shop-body");

  const itemsHtml = list.map(it => {
    const rank = getRank(it.rankReq);
    const rankText = it.rankReq <= 1 ? "入門" : `解鎖 ${rank.name}`;
    const locked = S.master.rank < it.rankReq;
    const poor = S.master.gold < it.price;
    const owned = hasItem(it.id) ? ' <span class="tag tag-safe">已持有</span>' : "";
    const btnLabel = locked ? "階級不足" : (poor ? "金幣不足" : "購買");
    return `<div class="market-card ${type === "blackmarket" ? "blackmarket" : "official"}">
      <div class="top"><span class="name">${escapeHtml(it.name)}${owned}</span><span class="price">${it.price} 金</span></div>
      <div class="meta"><span class="tag ${type === "blackmarket" ? "tag-risk" : "tag-muted"}">${escapeHtml(it.category)}</span> · ${rankText}${locked ? ' <span class="tag tag-risk">階級不足</span>' : ""}</div>
      <div class="background">${escapeHtml(it.desc)}</div>
      <div class="meta">${effText(it.effects)}${it.satiates ? "　（飽足）" : ""}</div>
      <button class="btn ${(locked || poor) ? "" : "btn-accent"}" onclick="handleBuyItem('${it.id}')" ${(locked || poor) ? "disabled" : ""}>${btnLabel}</button>
    </div>`;
  }).join("");

  body.innerHTML = `
    <div class="market-intro">${escapeHtml(info.desc)}　<span class="tag ${type === "blackmarket" ? "tag-risk" : "tag-safe"}">${info.riskLabel}</span></div>
    <button class="btn" onclick="openShopChoice()">返回選擇</button>
    ${itemsHtml}`;
}

function handleBuyItem(itemId) {
  if (buyItem(itemId)) {
    renderShop(currentShopType);
    renderInventory();
    renderStatusBar();
    showToast(`已購入「${getItem(itemId).name}」。`);
    if (typeof saveGame === "function") saveGame();
  }
}

/* ---------- 項圈／牽引繩商店 ---------- */
let currentCollarShopType = "official";

function openCollarShopChoice() {
  document.getElementById("collar-title").textContent = "項圈商店";
  document.getElementById("collar-body").innerHTML = `
    <div class="market-intro">牽引她，需要一副合適的項圈與牽繩。</div>
    <button class="btn" onclick="openCollarShop('official')">官方項圈行 <span class="tag tag-safe">正規 · 皮匠與銀匠</span></button>
    <button class="btn" onclick="openCollarShop('blackmarket')">暗巷禁具鋪 <span class="tag tag-risk">違禁 · 禁忌款</span></button>
    <p style="font-size:12.5px;color:var(--ink-soft)">購買後，請到「魅魔 → 點擊角色 → 配件」為她配戴。一隻魅魔需 1 個項圈 + 1 條牽引繩才能成套牽引，多隻魅魔請多備幾套。</p>`;
  openModal("modal-collar");
}

function openCollarShop(type) {
  currentCollarShopType = type;
  const info = COLLAR_INFO[type];
  if (!info) return;
  document.getElementById("collar-title").textContent = info.name;
  renderCollarShop(type);
  openModal("modal-collar");
}

function renderCollarShop(type) {
  const info = COLLAR_INFO[type];
  const list = collarShopItems(type);
  const body = document.getElementById("collar-body");
  const cards = list.map(g => {
    const kind = gearKind(g.id) === "collar" ? "項圈" : "牽引繩";
    const rank = getRank(g.rankReq || 1);
    const rankText = (g.rankReq || 1) <= 1 ? "入門" : `解鎖 ${rank.name}`;
    const locked = S.master.rank < (g.rankReq || 1);
    const poor = S.master.gold < g.price;
    const btnLabel = locked ? "階級不足" : (poor ? "金幣不足" : "購買");
    return `<div class="market-card ${type === "blackmarket" ? "blackmarket" : "official"}">
      <div class="top"><span class="name">${escapeHtml(g.name)}${g.forbidden ? ' <span class="tag tag-risk">禁忌</span>' : ""}</span><span class="price">${g.price} 金</span></div>
      <div class="meta"><span class="tag tag-muted">${kind}</span> · 材質 ${escapeHtml(g.material)} · 外型 ${escapeHtml(g.look)} · 重量 ${escapeHtml(g.weight)} · ${rankText}</div>
      <div class="background">${escapeHtml(g.desc)}</div>
      <div class="meta">每日配戴：${effText(g.wear)}</div>
      <button class="btn ${(locked || poor) ? "" : "btn-accent"}" onclick="handleBuyGear('${g.id}')" ${(locked || poor) ? "disabled" : ""}>${btnLabel}</button>
    </div>`;
  }).join("");
  body.innerHTML = `
    <div class="market-intro">${escapeHtml(info.desc)}　<span class="tag ${type === "blackmarket" ? "tag-risk" : "tag-safe"}">${info.riskLabel}</span></div>
    <button class="btn" onclick="openCollarShopChoice()">返回選擇</button>
    ${cards}`;
}

function handleBuyGear(gearId) {
  if (buyGear(gearId)) {
    renderCollarShop(currentCollarShopType);
    renderInventory();
    renderStatusBar();
    showToast(`已購入「${getGearDef(gearId).name}」。`);
    if (typeof saveGame === "function") saveGame();
  }
}

/* ---------- 出售 ---------- */
function openSellFlow(succubusId) {
  const suc = getSuccubus(succubusId);
  if (!suc) return;
  if (suc.contract === "permanent") { showToast("她已締下永久之契，不能再轉讓。"); return; }
  const g = succubusGrade(suc);
  document.getElementById("sell-title").textContent = "契約轉讓 · " + suc.name + "（" + g.grade + "級）";
  document.getElementById("sell-body").innerHTML = `
    <div class="market-intro">你想將 ${escapeHtml(suc.name)} 轉往何處？</div>
    <button class="btn" onclick="prepareSellAndRender('${succubusId}','official')">官方契約廳 <span class="tag tag-safe">低風險 · 收價低</span></button>
    <button class="btn" onclick="prepareSellAndRender('${succubusId}','blackmarket')">暗巷黑市 <span class="tag tag-risk">高風險 · 收價高</span></button>
    <button class="btn" onclick="prepareSellAndRender('${succubusId}','auction')">拍賣會 <span class="tag tag-safe">最高價 · 限 A／S 級</span></button>`;
  openModal("modal-sell");
}

function prepareSellAndRender(succubusId, channel) {
  const st = prepareSell(succubusId, channel);
  if (!st) { closeModal("modal-sell"); renderAll(); return; }
  renderSellState(st);
}

function renderSellState(st) {
  const body = document.getElementById("sell-body");
  const suc = getSuccubus(st.succubusId);
  if (st.weird) {
    body.innerHTML = `
      <div class="candidate-detail">
        <div class="row" style="color:var(--accent-warn);font-weight:700">—— 有人攔下了你的去路 ——</div>
        <div class="row"><b>${escapeHtml(st.weird.name)}</b></div>
        <div class="row">${escapeHtml(st.weird.flavor)}</div>
        <div class="row"><b>開價</b>　${st.price} 金</div>
        <div class="row" style="font-size:12.5px;color:var(--ink-soft)">${escapeHtml(st.weird.consequenceText)}</div>
        <div class="modal-actions" style="padding:0;border:none">
          <button class="btn" onclick="refuseSell()">不賣</button>
          <button class="btn btn-accent" onclick="acceptSell()">賣了</button>
        </div>
      </div>`;
  } else {
    const note = st.channel === "auction" ? `（拍賣會抽成 ${Math.round(AUCTION_INFO.commission * 100)}%）` : "";
    const channelDesc = st.channel === "official" ? "官方契約廳手續正規，估價保守。" : st.channel === "blackmarket" ? "暗巷掮客開出的價碼。" : "燈海中央，競價落槌。";
    body.innerHTML = `
      <div class="candidate-detail">
        <div class="row"><b>${escapeHtml(suc ? suc.name : "")}</b> 的轉讓</div>
        <div class="row">${channelDesc}</div>
        <div class="row"><b>成交價</b>　${st.price} 金 ${note}</div>
        <div class="modal-actions" style="padding:0;border:none">
          <button class="btn" onclick="closeModal('modal-sell')">再想想</button>
          <button class="btn btn-accent" onclick="acceptSell()">確定轉讓</button>
        </div>
      </div>`;
  }
}

function acceptSell() {
  const ok = executeSell();
  closeModal("modal-sell");
  renderAll();
  showToast(ok ? "契約已轉讓。" : "交易未能完成。");
}

function refuseSell() {
  if (S.sellState && S.sellState.weird) {
    pushLog("system", "你搖搖頭，攏緊了披風，牽著她離開那雙不安分的目光。");
  }
  S.sellState = null;
  closeModal("modal-sell");
  renderAll();
}

/* ---------- 永久契約 ---------- */
function openContractFlow(succubusId) {
  const suc = getSuccubus(succubusId);
  if (!suc) return;
  const title = document.querySelector("#modal-contract .modal-head h2");
  if (title) title.textContent = "永久契約 · " + suc.name;
  const eligible = suc.affection >= CONTRACT_INFO.permanentAffectionReq;
  const affordable = S.master.gold >= CONTRACT_INFO.permanentCost;
  document.getElementById("contract-body").innerHTML = `
    <div class="candidate-detail">
      <div class="row">${escapeHtml(CONTRACT_INFO.permanentDesc)}</div>
      <div class="row"><b>締約條件</b>　好感 ≥ ${CONTRACT_INFO.permanentAffectionReq}（目前 ${suc.affection}）</div>
      <div class="row"><b>締約之禮</b>　${CONTRACT_INFO.permanentCost} 金</div>
      <div class="row"><b>永恆回報</b>　${escapeHtml(CONTRACT_INFO.bonusesDesc)}</div>
      <div class="modal-actions" style="padding:0;border:none">
        <button class="btn" onclick="closeModal('modal-contract')">再想想</button>
        <button class="btn btn-accent" onclick="doSignContract('${succubusId}')" ${(eligible && affordable) ? "" : "disabled"}>以血為誓</button>
      </div>
    </div>`;
  openModal("modal-contract");
}

function doSignContract(succubusId) {
  const ok = signPermanentContract(succubusId);
  closeModal("modal-contract");
  renderAll();
  showToast(ok ? "永久之契，落定。" : "締約未成。");
}
