/* ============================================================
   《緋夜飼育錄》主流程與事件綁定 main.js
   ============================================================ */

function init() {
  ensureState();
  const loaded = loadGame();
  if (!loaded) {
    S = defaultState();
    GAME_INTRO.forEach(line => appendStoryMessage("system", line));
    S.currentChoices = [
      "踏進高塔契約廳，去挑一雙屬於你的眼睛。",
      "鑽進暗巷黑市，賭一把低價的誘惑。",
      "先踱到緋夜舊城的街頭，聽聽今晚的風聲。"
    ];
    S.started = true;
  }
  bindEvents();
  renderAll();
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach(b => {
    b.addEventListener("click", () => switchTab(b.dataset.tab));
  });

  document.querySelectorAll("[data-close]").forEach(b => {
    b.addEventListener("click", () => closeModal(b.dataset.close));
  });

  document.querySelectorAll(".modal-overlay").forEach(o => {
    o.addEventListener("click", e => { if (e.target === o) closeModal(o.id); });
  });

  document.getElementById("btn-send").addEventListener("click", handleSendAction);
  document.getElementById("story-input-field").addEventListener("keydown", e => { if (e.key === "Enter") handleSendAction(); });

  document.getElementById("choice-list").addEventListener("click", e => {
    const btn = e.target.closest(".choice-btn");
    if (!btn) return;
    const i = parseInt(btn.dataset.i, 10);
    if (S.currentChoices[i] != null) handleChoiceClick(S.currentChoices[i]);
  });

  document.getElementById("master-style").addEventListener("change", e => { S.master.style = e.target.value; saveGame(); });
  document.getElementById("master-persona").addEventListener("input", e => { S.master.persona = e.target.value; });

  document.getElementById("btn-open-market").addEventListener("click", openMarketChoiceModal);
  document.getElementById("btn-open-shop").addEventListener("click", openShopChoice);
  document.getElementById("btn-open-api").addEventListener("click", openApiModal);
  document.getElementById("btn-api-save").addEventListener("click", saveApiSettings);
  document.getElementById("btn-api-test").addEventListener("click", doTestApi);

  window.addEventListener("beforeunload", saveGame);
}

/* ---------- 互動 ---------- */
function handleSendAction() {
  const field = document.getElementById("story-input-field");
  const text = field.value.trim();
  if (!text) return;
  field.value = "";
  appendStoryMessage("player", text);
  proceed(text);
}

function handleChoiceClick(text) {
  appendStoryMessage("player", text);
  proceed(text);
}

/* 若玩家的動作提到「已持有」的道具名，立即結算使用效果 */
function maybeUseItemByText(text) {
  if (!text) return null;
  for (const id of S.inventory.slice()) {
    const it = getItem(id);
    if (it && text.includes(it.name)) return id;
  }
  return null;
}

async function proceed(text) {
  if (detectNav(text)) return;

  const itemId = maybeUseItemByText(text);
  if (itemId) consumeItemByStory(itemId);

  const result = await callStoryAI(text);
  processAICommands(result);

  if (!S.currentChoices || !S.currentChoices.length) {
    const fallback = mockNarrativeResponse(text);
    if (fallback.narrative) appendStoryMessage("story", fallback.narrative);
    processAICommands({ commands: fallback.commands || [], choices: fallback.choices || [] });
  }
  saveGame();
}

function detectNav(text) {
  if (/道具店|商店|道具行/.test(text)) { openShopChoice(); return true; }
  if (/契約廳|官方契約|官方市場/.test(text)) { openMarket("official"); return true; }
  if (/黑市|暗巷/.test(text)) { openMarket("blackmarket"); return true; }
  return false;
}

/* ---------- 房產 ---------- */
function handleBuyHouse(houseId) {
  const house = getHouse(houseId);
  if (!house) return;
  if (S.master.gold < house.price) { showToast("你的錢袋不夠沉。"); return; }
  S.master.gold -= house.price;
  S.ownedHouses.push(houseId);
  S.currentHouseId = houseId;
  const d = DISTRICTS.find(x => x.houses.some(h => h.id === houseId));
  S.currentDistrictId = d ? d.id : S.currentDistrictId;
  pushLog("system", `你購下了「${house.name}」，領地又添了一處。`);
  renderAll();
  saveGame();
}

function handleMoveHouse(houseId) {
  const house = getHouse(houseId);
  if (!house || !S.ownedHouses.includes(houseId)) return;
  S.currentHouseId = houseId;
  const d = DISTRICTS.find(x => x.houses.some(h => h.id === houseId));
  S.currentDistrictId = d ? d.id : S.currentDistrictId;
  pushLog("system", `你遷入了「${house.name}」。`);
  renderAll();
  saveGame();
}

function toggleDistrict(id) {
  const el = document.querySelector(`.district-block[data-district="${id}"]`);
  if (el) el.classList.toggle("open");
}

/* ---------- API 設定 ---------- */
function openApiModal() {
  const cfg = getApiSettings();
  document.getElementById("api-key").value = cfg.key || "";
  document.getElementById("api-url").value = cfg.url || "";
  document.getElementById("api-model").value = cfg.model || "";
  const box = document.getElementById("api-test-result");
  box.className = "api-test-result";
  box.textContent = "";
  openModal("modal-api");
}

function saveApiSettings() {
  const cfg = {
    key: document.getElementById("api-key").value.trim(),
    url: document.getElementById("api-url").value.trim(),
    model: document.getElementById("api-model").value.trim()
  };
  persistApiSettings(cfg);
  closeModal("modal-api");
  showToast("API 設定已存妥。");
}

async function doTestApi() {
  const box = document.getElementById("api-test-result");
  box.className = "api-test-result";
  box.textContent = "測試中……";
  const cfg = {
    key: document.getElementById("api-key").value.trim(),
    url: document.getElementById("api-url").value.trim(),
    model: document.getElementById("api-model").value.trim()
  };
  persistApiSettings(cfg);
  const r = await testApiConnection();
  box.className = "api-test-result " + (r.ok ? "ok" : "fail");
  box.textContent = r.msg;
}

/* ---------- 啟動 ---------- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
