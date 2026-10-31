/* ============================================================
   《緋夜飼育錄》介面渲染 ui.js
   ============================================================ */

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add("open"); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove("open"); }

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function renderAll() {
  renderStatusBar();
  renderStoryLog();
  renderChoices();
  renderSuccubi();
  renderMaster();
}

function renderStatusBar() {
  const m = S.master;
  const dayEl = document.getElementById("stat-day");
  if (dayEl) {
    dayEl.textContent = `第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}`;
    dayEl.style.cursor = "pointer";
    dayEl.title = "點擊可手動調整時間";
    dayEl.onclick = openTimeAdjustModal;
  }
  document.getElementById("stat-gold").textContent = `${m.gold} 金`;
  document.getElementById("stat-rank").textContent = getRank(m.rank).name;
}

function openTimeAdjustModal() {
  document.getElementById("confirm-title").textContent = "手動調整時間";
  document.getElementById("confirm-body").innerHTML = `
    <div class="field">
      <label>天數 (Day)</label>
      <input id="input-adj-day" type="number" min="1" value="${S.day}" style="width:100%;padding:8px">
    </div>
    <div class="field" style="margin-top:10px">
      <label>時段</label>
      <select id="select-adj-phase" style="width:100%;padding:8px">
        ${SUBPHASE_NAMES.map((name, i) => `<option value="${i}" ${S.subPhase === i ? "selected" : ""}>${name}</option>`).join("")}
      </select>
    </div>`;
  
  document.getElementById("confirm-actions").innerHTML = `
    <button class="btn" onclick="closeModal('modal-confirm')">取消</button>
    <button class="btn btn-accent" onclick="applyTimeAdjustment()">修改</button>`;
  
  openModal("modal-confirm");
}

function applyTimeAdjustment() {
  const d = parseInt(document.getElementById("input-adj-day").value, 10);
  const p = parseInt(document.getElementById("select-adj-phase").value, 10);
  if (!isNaN(d) && d > 0) S.day = d;
  if (!isNaN(p) && p >= 0) S.subPhase = p;
  
  closeModal("modal-confirm");
  pushLog("system", `［系統］已手動將時間調整為：第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}`);
  renderAll();
  saveGame();
}

function openJobModal() {
  document.getElementById("help-body").innerHTML = JOBS.map(j => `
    <div class="item-card" style="margin-bottom:10px;padding:10px;border:1px solid #ccc;border-radius:8px">
      <div style="display:flex;justify-content:space-between;font-weight:bold">
        <span>${j.name}</span>
        <span style="color:#d9989a">+${j.goldEarn} 金</span>
      </div>
      <div style="font-size:12px;color:#666;margin:4px 0">${j.desc}</div>
      <div style="font-size:11px;color:#888">消耗體力：${j.hpCost} | 時間：1 時段</div>
      <button class="btn btn-accent" style="margin-top:6px;width:100%" onclick="closeModal('modal-help'); executeJob('${j.id}');">前往工作</button>
    </div>
  `).join("");
  openModal("modal-help");
}

function executeJob(jobId) {
  const job = JOBS.find(j => j.id === jobId);
  if (!job) return;
  if (S.master.hp < job.hpCost) {
    showToast("體力不足，無法完成工作。");
    return;
  }
  S.master.hp = Math.max(0, S.master.hp - job.hpCost);
  S.master.gold += job.goldEarn;
  notifyGoldChange(job.goldEarn, `打工報酬：${job.name}`);
  advanceTime(1);
  renderAll();
  saveGame();
}

function renderStoryLog() {
  const log = document.getElementById("story-log");
  if (!log) return;
  log.innerHTML = (S.logs || []).map(l => `<div class="msg msg-${l.type}">${escapeHtml(l.text)}</div>`).join("");
  log.scrollTop = log.scrollHeight;
}

function renderChoices() {
  const box = document.getElementById("choice-list");
  if (!S.currentChoices || !S.currentChoices.length) return;
  box.innerHTML = S.currentChoices.map((c, i) => `<button class="choice-btn" data-i="${i}">${escapeHtml(c)}</button>`).join("");
}

/* 魅魔卡片：性格名稱直接以純顏色標籤顯示 */
function renderSuccubi() {
  const box = document.getElementById("succubi-list");
  if (!box) return;
  box.innerHTML = S.succubi.map(s => {
    const pDef = getPersonalityDef(s.personality);
    return `<div class="succubus-card" style="border:1px solid #ccc;padding:10px;margin-bottom:8px;border-radius:8px">
      <div style="font-weight:bold">${escapeHtml(s.name)} 
        <span class="tag ${pDef.categoryTag}">${escapeHtml(pDef.name)}</span>
      </div>
      <div style="font-size:12px;color:#666;margin-top:4px">好感 ${s.affection} | 服從 ${s.obedience} | 飢餓 ${s.hunger}</div>
    </div>`;
  }).join("");
}

function renderMaster() {
  const m = S.master;
  const hpEl = document.getElementById("master-hp");
  if (hpEl) hpEl.textContent = m.hp;
  const goldEl = document.getElementById("master-gold");
  if (goldEl) goldEl.textContent = m.gold;
}
