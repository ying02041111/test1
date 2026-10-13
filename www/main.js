/* ============================================================
   《緋夜飼育錄》主流程 main.js（防呆版）
   ============================================================ */

function $(id) { return document.getElementById(id); }

function showErrorBox(msg) {
  try {
    const old = $("err-box");
    if (old) old.remove();
    const box = document.createElement("div");
    box.id = "err-box";
    box.style.cssText = "position:fixed;left:8px;right:8px;bottom:8px;z-index:99999;background:#5C4741;color:#fff;padding:12px 14px;border-radius:10px;font-size:12px;line-height:1.5;word-break:break-all;box-shadow:0 4px 20px rgba(0,0,0,.3);";
    box.textContent = "錯誤：" + msg;
    document.body.appendChild(box);
  } catch (_) {}
}

window.addEventListener("error", function (e) { showErrorBox(e.message || "未知錯誤"); });
window.addEventListener("unhandledrejection", function (e) {
  const r = e.reason;
  showErrorBox("非同步錯誤：" + (r && r.message ? r.message : String(r)));
});

function init() {
  try {
    ensureState();
    const loaded = loadGame();
    if (!loaded) {
      S = defaultState();
      GAME_INTRO.forEach(line => appendStoryMessage("system", line));
      S.currentChoices = [
        "踏進高塔契約廳，去挑一雙屬於你的眼睛。",
        "先踱到緋夜舊城的街頭，聽聽今晚的風聲。"
      ];
      S.started = true;
    }
    bindEvents();
    renderAll();
  } catch (e) {
    showErrorBox("初始化失敗：" + (e.message || e));
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-btn").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => closeModal(b.dataset.close)));
  document.querySelectorAll(".modal-overlay").forEach(o => o.addEventListener("click", e => { if (e.target === o) closeModal(o.id); }));

  const send = $("btn-send"); if (send) send.addEventListener("click", handleSendAction);
  const input = $("story-input-field"); if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") handleSendAction(); });

  const cl = $("choice-list"); if (cl) cl.addEventListener("click", e => {
    const btn = e.target.closest(".choice-btn");
    if (!btn) return;
    const i = parseInt(btn.dataset.i, 10);
    if (S.currentChoices[i] != null) handleChoiceClick(S.currentChoices[i]);
  });

  const styleSel = $("master-style"); if (styleSel) styleSel.addEventListener("change", e => { S.master.style = e.target.value; saveGame(); });
  const persona = $("master-persona"); if (persona) persona.addEventListener("input", e => { S.master.persona = e.target.value; });

  const bm = $("btn-open-market"); if (bm) bm.addEventListener("click", openMarketChoiceModal);
  const bs = $("btn-open-shop"); if (bs) bs.addEventListener("click", openShopChoice);
  const ba = $("btn-open-api"); if (ba) ba.addEventListener("click", openApiModal);
  const bas = $("btn-api-save"); if (bas) bas.addEventListener("click", saveApiSettings);
  const bat = $("btn-api-test"); if (bat) bat.addEventListener("click", doTestApi);
  const br = $("btn-reset"); if (br) br.addEventListener("click", openResetConfirm);

  const t = $("api-temperature"); const tv = $("temp-val");
  if (t) t.addEventListener("input", () => { if (tv) tv.textContent = t.value; });
  const tp = $("api-topp"); const tpv = $("topp-val");
  if (tp) tp.addEventListener("input", () => { if (tpv) tpv.textContent = tp.value; });

  window.addEventListener("beforeunload", saveGame);
}

/* ---------- 輸入 ---------- */
function handleSendAction() {
  const field = $("story-input-field");
  if (!field) return;
  const text = field.value.trim();
  if (!text) return;
  field.value = "";

  if (handlePsCommand(text)) return; // ps. 指令：不當作對話

  appendStoryMessage("player", text);
  proceed(text);
}

function handleChoiceClick(text) {
  appendStoryMessage("player", text);
  proceed(text);
}

/* ps. 開頭＝給 AI 的長期指令 */
function handlePsCommand(text) {
  const body = text.replace(/^\s*ps\s*[.。．:：,，]?\s*/i, "");
  if (body === text) return false; // 不是 ps. 開頭

  if (!body) { appendStoryMessage("system", "［指令］請在 ps. 後面寫下內容。"); return true; }

  const list = getDirectives();

  if (/刪除|移除|清除|取消|去掉/.test(body)) {
    if (/全部|所有|一切|清空/.test(body) || /^清除$/.test(body)) {
      setDirectives([]);
      appendStoryMessage("system", "［指令］已清除所有長期指令。");
    } else {
      const last = list.pop();
      setDirectives(list);
      appendStoryMessage("system", last ? `［指令］已刪除：${last}` : "［指令］目前沒有可刪除的長期指令。");
    }
  } else {
    list.push(body);
    setDirectives(list);
    appendStoryMessage("system", `［指令］已加入長期指令：${body}`);
  }
  return true;
}

/* 導覽關鍵字：開對應視窗，但「不中斷 AI 對白回應」 */
function triggerNav(text) {
  if (!text) return;
  if (/道具店|商店|道具行/.test(text)) { openShopChoice(); return; }
  if (/契約廳|官方契約|官方市場/.test(text)) { openMarket("official"); return; }
  if (/黑市|暗巷/.test(text)) { openMarket("blackmarket"); return; }
}

function maybeUseItemByText(text) {
  if (!text) return null;
  for (const id of S.inventory.slice()) {
    const it = getItem(id);
    if (it && text.includes(it.name)) return id;
  }
  return null;
}

async function proceed(text) {
  try {
    triggerNav(text); // 動作（前往商店…）照做，但不影響下面的對白回應

    const itemId = maybeUseItemByText(text);
    if (itemId) consumeItemByStory(itemId);

    showThinking();
    const result = await callStoryAI(text);
    hideThinking();
    processAICommands(result);

    if (!S.currentChoices || !S.currentChoices.length) {
      S.currentChoices = buildMockChoices(currentSuccubus());
      renderChoices();
    }
    saveGame();
  } catch (e) {
    hideThinking();
    showErrorBox("劇情處理失敗：" + (e.message || e));
  }
}

/* ---------- 房產 ---------- */
function handleBuyHouse(houseId) {
  const house = getHouse(houseId);
  if (!house) return;
  const d = DISTRICTS.find(x => x.houses.some(h => h.id === houseId));
  const rankReq = d ? (typeof districtRankReq === "function" ? districtRankReq(d.id) : 1) : 1;
  if (S.master.rank < rankReq) { showToast(`需先晉升至【${getRank(rankReq).name}】才能進入${d ? d.name : ""}。`); return; }
  if (S.master.gold < house.price) { showToast("你的錢袋不夠沉。"); return; }
  S.master.gold -= house.price;
  S.ownedHouses.push(houseId);
  S.currentHouseId = houseId;
  S.currentDistrictId = d ? d.id : S.currentDistrictId;
  pushLog("system", `你購下了「${house.name}」，領地又添了一處。`);
  renderAll();
  saveGame();
}

function handleMoveHouse(houseId) {
  const house = getHouse(houseId);
  if (!house || !S.ownedHouses.includes(houseId)) return;
  const d = DISTRICTS.find(x => x.houses.some(h => h.id === houseId));
  const rankReq = d ? (typeof districtRankReq === "function" ? districtRankReq(d.id) : 1) : 1;
  if (S.master.rank < rankReq) { showToast(`需先晉升至【${getRank(rankReq).name}】才能進入${d ? d.name : ""}。`); return; }
  S.currentHouseId = houseId;
  S.currentDistrictId = d ? d.id : S.currentDistrictId;
  pushLog("system", `你遷入了「${house.name}」。`);
  renderAll();
  saveGame();
}

function toggleDistrict(id) {
  const el = document.querySelector(`.district-block[data-district="${id}"]`);
  if (el) el.classList.toggle("open");
}

/* ---------- 重新開始 ---------- */
function openResetConfirm() {
  const title = $("confirm-title"); if (title) title.textContent = "重新開始";
  const body = $("confirm-body");
  if (body) body.innerHTML = `
    <p style="font-size:14px">你確定要抹去所有進度，重新開始嗎？</p>
    <p style="font-size:12.5px;color:var(--ink-soft)">此舉將刪除存檔，且無法復原。</p>`;
  const actions = $("confirm-actions");
  if (actions) actions.innerHTML = `
    <button class="btn" onclick="closeModal('modal-confirm')">取消</button>
    <button class="btn btn-danger" onclick="doResetGame()">確定刪除</button>`;
  openModal("modal-confirm");
}

function doResetGame() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  closeModal("modal-confirm");
  S = defaultState();
  GAME_INTRO.forEach(line => appendStoryMessage("system", line));
  S.currentChoices = [
    "踏進高塔契約廳，去挑一雙屬於你的眼睛。",
    "先踱到緋夜舊城的街頭，聽聽今晚的風聲。"
  ];
  S.started = true;
  renderAll();
  switchTab("story");
  showToast("已重新開始。");
}

/* ---------- API 設定 ---------- */
function openApiModal() {
  const cfg = getApiSettings();
  const k = $("api-key"); if (k) k.value = cfg.key || "";
  const u = $("api-url"); if (u) u.value = cfg.url || "";
  const m = $("api-model"); if (m) m.value = cfg.model || "";
  const th = $("api-thinking"); if (th) th.checked = !!cfg.thinking;

  const temp = (cfg.temperature != null && cfg.temperature !== "") ? cfg.temperature : 0.9;
  const topp = (cfg.topP != null && cfg.topP !== "") ? cfg.topP : 1.0;
  const t = $("api-temperature"); if (t) t.value = temp;
  const tv = $("temp-val"); if (tv) tv.textContent = temp;
  const tp = $("api-topp"); if (tp) tp.value = topp;
  const tpv = $("topp-val"); if (tpv) tpv.textContent = topp;

  const box = $("api-test-result");
  if (box) { box.className = "api-test-result"; box.textContent = ""; }
  openModal("modal-api");
}

function readApiForm() {
  const g = id => { const el = $(id); return el ? el.value.trim() : ""; };
  const chk = id => { const el = $(id); return el ? el.checked : false; };
  return {
    key: g("api-key"),
    url: g("api-url"),
    model: g("api-model"),
    thinking: chk("api-thinking"),
    temperature: g("api-temperature") || "0.9",
    topP: g("api-topp") || "1.0"
  };
}

function saveApiSettings() {
  persistApiSettings(readApiForm());
  closeModal("modal-api");
  showToast("API 設定已存妥。");
}

async function doTestApi() {
  const box = $("api-test-result");
  if (box) { box.className = "api-test-result"; box.textContent = "測試中……"; }
  persistApiSettings(readApiForm());
  try {
    const r = await testApiConnection();
    if (box) { box.className = "api-test-result " + (r.ok ? "ok" : "fail"); box.textContent = r.msg; }
  } catch (e) {
    if (box) { box.className = "api-test-result fail"; box.textContent = "測試出錯：" + (e.message || e); }
  }
}

/* ---------- 啟動 ---------- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
