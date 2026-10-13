// www/ui.js - 介面渲染、Tab 底部導航、主控人設面板與三層折疊

// 1. 底部導航切換
function switchTab(tabId) {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add("active");

    const tabMap = ["tab-story", "tab-succubi", "tab-master", "tab-items", "tab-housing"];
    const btnIndex = tabMap.indexOf(tabId);
    if (btnIndex >= 0) {
        const navItems = document.querySelectorAll(".nav-item");
        if (navItems[btnIndex]) navItems[btnIndex].classList.add("active");
    }

    renderAll();
}

// 2. 頂部極簡狀態列渲染
function renderHeader() {
    const timeEl = document.getElementById("display-time");
    const goldEl = document.getElementById("display-quick-gold");
    if (timeEl) timeEl.innerText = `第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}`;
    if (goldEl) goldEl.innerText = `${S.master.gold} G`;
}

// 3. 劇情選項區塊渲染 (主要推進途徑)
function renderStoryChoices() {
    const box = document.getElementById("story-choices");
    if (!box) return;

    if (!Array.isArray(S.currentChoices) || S.currentChoices.length === 0) {
        S.currentChoices = [
            "審視當前處境，規劃下一步行動",
            "前往街區市集尋訪調教道具",
            "與居所中的魅魔展開訓育"
        ];
    }

    box.innerHTML = S.currentChoices.map((choiceText, idx) => `
        <button class="choice-btn" onclick="handleChoiceClick('${escapeHtml(choiceText)}')">
            ${idx + 1}. ${choiceText}
        </button>
    `).join("");
}

// 4. 魅魔狀態分頁渲染
function renderSuccubi() {
    const container = document.getElementById("succubi-container");
    if (!container) return;

    if (S.succubi.length === 0) {
        container.innerHTML = `<div class="msg-box msg-system">當前未飼育任何魅魔。可透過劇情對話或推進選項前往黑市尋覓契約對象。</div>`;
        return;
    }

    container.innerHTML = S.succubi.map(s => {
        const relRate = calcRelRate(s);
        const isPure = s.race.id === "pureblood";

        return `
        <div class="game-card">
            <div class="card-header">
                <div>
                    <span class="card-title">${s.name}</span>
                    <span class="card-badge ${isPure ? '' : 'mint'}">${s.race.name}</span>
                </div>
                <span class="card-badge mint">${s.personality.name} (好感率: ${relRate}x)</span>
            </div>
            <div style="font-size:0.82rem; margin-bottom:8px; line-height:1.5;">
                <div><strong>外貌氣味:</strong> ${s.appearance} | ${s.scent}</div>
                <div><strong>潛在缺陷:</strong> ${s.defect.name} (${s.defect.desc})</div>
                <div><strong>食性需求:</strong> ${s.race.traitDesc}</div>
            </div>
            <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:6px; font-size:0.8rem; background:var(--bg-main); padding:8px; border-radius:6px;">
                <div>好感度: <strong>${s.relation}/100</strong></div>
                <div>服從度: <strong>${s.obedience}/100</strong></div>
                <div>精神壓力: <strong style="${s.stress > 60 ? 'color:#c02727;' : ''}">${s.stress}/100</strong></div>
                <div>飢渴程度: <strong style="${s.hunger > 60 ? 'color:#c02727;' : ''}">${s.hunger}/100</strong></div>
            </div>
        </div>`;
    }).join("");
}

// 5. 主控專屬檔案分頁渲染 (風格 + 人設 + 階級經驗)
function renderMasterPanel() {
    const curRank = MASTER_RANKS.find(r => r.rank === S.master.rank) || MASTER_RANKS[0];
    const titleEl = document.getElementById("master-title");
    const hpBadge = document.getElementById("master-hp-badge");
    const expText = document.getElementById("master-exp-text");
    const expBar = document.getElementById("master-exp-bar");
    const styleSel = document.getElementById("master-style-select");
    const personaText = document.getElementById("master-custom-persona");

    if (titleEl) titleEl.innerText = `${curRank.title} (Rank ${curRank.rank})`;
    if (hpBadge) hpBadge.innerText = `體力: ${S.master.hp}/${S.master.maxHp}`;

    if (expText && expBar) {
        if (curRank.rank >= 5) {
            expText.innerText = `${S.master.exp} EXP (最高階級)`;
            expBar.style.width = "100%";
        } else {
            const nextReq = curRank.nextExp;
            const curBase = curRank.reqExp;
            const progress = Math.min(100, Math.max(0, Math.round(((S.master.exp - curBase) / (nextReq - curBase)) * 100)));
            expText.innerText = `${S.master.exp} / ${nextReq} EXP`;
            expBar.style.width = `${progress}%`;
        }
    }

    if (styleSel) styleSel.value = S.master.style || "dom";
    if (personaText) personaText.value = S.master.persona || "";
}

// 6. 背包分頁渲染 (嚴格落實：名字 / 文案 / 數值變動 三段式規範，純鑑賞無直接使用按鈕)
function renderInventory() {
    const container = document.getElementById("inventory-container");
    if (!container) return;

    const ownedKeys = Object.keys(S.inventory).filter(k => S.inventory[k] > 0);
    if (ownedKeys.length === 0) {
        container.innerHTML = `<div class="msg-box msg-system">隨身背包空無一物。可在劇情推展中於各街區黑市購入。</div>`;
        return;
    }

    container.innerHTML = ownedKeys.map(k => {
        const item = ITEMS[k];
        if (!item) return "";
        const isForbidden = item.reqRank >= 2;

        return `
        <div class="game-card">
            <div class="card-header">
                <span class="card-title">${item.name}</span>
                <span class="card-badge ${isForbidden ? '' : 'mint'}">持有: ${S.inventory[k]}</span>
            </div>
            <!-- 三段式標準結構 -->
            <div class="item-text-block">
                ${item.desc}
            </div>
            <div class="item-stat-badge">
                <strong>數值變動：</strong>${item.statDesc}
            </div>
        </div>`;
    }).join("");
}

// 7. 領地房產渲染 (街區 ＞ 房屋 ＞ 詳情 三層折疊)
function renderHousing() {
    const container = document.getElementById("housing-container");
    if (!container) return;

    container.innerHTML = DISTRICTS.map(d => {
        const isCurrentDistrict = S.currentDistrictId === d.id;

        const housesHtml = d.houses.map(h => {
            const isOwned = S.ownedHouses.includes(h.id);
            const isCurrentHome = S.currentHouseId === h.id;

            return `
            <div class="house-item">
                <div class="house-header" onclick="toggleDetails('details-${h.id}')">
                    <span>${h.name} ${isCurrentHome ? '【現居】' : isOwned ? '【已擁有】' : ''}</span>
                    <span style="font-weight:bold;">容量: ${h.capacity} 人 ▾</span>
                </div>
                <div id="details-${h.id}" class="house-details" style="display:none;">
                    <p style="margin-bottom:4px;">${h.desc}</p>
                    <p style="color:var(--text-main);">舒適度: ${h.comfort} | 日租金: ${h.rent} G | 售價: ${h.price} G</p>
                    <div style="margin-top:8px; display:flex; gap:8px;">
                        ${!isOwned ? `<button class="btn-action" style="font-size:0.75rem; padding:4px 10px;" onclick="handleBuyHouse('${d.id}','${h.id}')">出資購置 (${h.price} G)</button>` : ''}
                        ${isOwned && !isCurrentHome ? `<button class="btn-action" style="font-size:0.75rem; padding:4px 10px;" onclick="handleMoveHouse('${d.id}','${h.id}')">搬遷入住</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join("");

        return `
        <div class="district-group">
            <div class="district-header" onclick="toggleDistrict('district-houses-${d.id}')">
                <span>${d.name} ${isCurrentDistrict ? '【當前所在】' : ''}</span>
                <span>展開房產 ▾</span>
            </div>
            <div id="district-houses-${d.id}" style="display: ${isCurrentDistrict ? 'block' : 'none'};">
                <div style="padding:8px 12px; font-size:0.78rem; background:var(--bg-main);">
                    ${d.desc}
                </div>
                ${housesHtml}
            </div>
        </div>`;
    }).join("");
}

// 輔助展開折疊
function toggleDistrict(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = (el.style.display === "none") ? "block" : "none";
}

function toggleDetails(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = (el.style.display === "none") ? "block" : "none";
}

// 全域刷新
function renderAll() {
    renderHeader();
    renderStoryChoices();
    renderSuccubi();
    renderMasterPanel();
    renderInventory();
    renderHousing();
}

// 追加劇情訊息
function appendStoryMessage(type, text) {
    const logBox = document.getElementById("story-log");
    if (!logBox) return;

    const div = document.createElement("div");
    div.className = `msg-box msg-${type}`;
    div.innerText = text;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

function escapeHtml(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
