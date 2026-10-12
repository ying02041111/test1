// www/ui.js - 介面渲染、Tab 分頁切換與三層房產折疊

// 1. 分頁切換
function switchTab(tabId) {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add("active");

    const btnIndex = ["tab-story", "tab-succubi", "tab-items", "tab-housing"].indexOf(tabId);
    if (btnIndex >= 0) {
        document.querySelectorAll(".tab-btn")[btnIndex].classList.add("active");
    }

    // 切換時即時重整內容
    renderAll();
}

// 2. 頂部狀態列刷新
function renderHeader() {
    const curRank = MASTER_RANKS.find(r => r.rank === S.master.rank) || MASTER_RANKS[0];
    document.getElementById("display-time").innerText = `第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}`;
    document.getElementById("master-rank").innerText = `Rank ${curRank.rank} ${curRank.title}`;
    document.getElementById("master-hp").innerText = `${S.master.hp}/${S.master.maxHp}`;
    document.getElementById("master-gold").innerText = `${S.master.gold} G`;
    document.getElementById("master-exp").innerText = `${S.master.exp} EXP`;
}

// 3. 魅魔狀態卡片渲染 (展示四維數值與缺陷反差)
function renderSuccubi() {
    const container = document.getElementById("succubi-container");
    if (!container) return;

    if (S.succubi.length === 0) {
        container.innerHTML = `<div class="msg-box msg-system">當前未飼育任何魅魔。可於劇情中前往黑市尋覓契約對象。</div>`;
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
                    <span class="card-badge ${isPure ? 'plus' : ''}">${s.race.name}</span>
                </div>
                <span class="card-badge">${s.personality.name} (成長: ${relRate}x)</span>
            </div>
            <div style="font-size:0.8rem; color:#7d4040; margin-bottom:6px;">
                <div><strong>特質:</strong> ${s.appearance} | ${s.scent}</div>
                <div><strong>缺陷:</strong> ${s.defect.name} - ${s.defect.desc}</div>
                <div><strong>食性:</strong> ${s.race.traitDesc}</div>
            </div>
            <div class="stat-bars">
                <div class="bar-item"><span>好感度:</span><strong>${s.relation}/100</strong></div>
                <div class="bar-item"><span>服從度:</span><strong>${s.obedience}/100</strong></div>
                <div class="bar-item"><span>精神壓力:</span><strong style="${s.stress > 60 ? 'color:var(--danger-color)' : ''}">${s.stress}/100</strong></div>
                <div class="bar-item"><span>飢餓度:</span><strong style="${s.hunger > 60 ? 'color:var(--danger-color)' : ''}">${s.hunger}/100</strong></div>
            </div>
        </div>`;
    }).join("");
}

// 4. 背包道具清單渲染 (顯示街區特產與 Plus 禁忌痛感)
function renderInventory() {
    const container = document.getElementById("inventory-container");
    if (!container) return;

    const ownedKeys = Object.keys(S.inventory).filter(k => S.inventory[k] > 0);
    if (ownedKeys.length === 0) {
        container.innerHTML = `<div class="msg-box msg-system">隨身背包空無一物。可在各街區市場透過劇情購入。</div>`;
        return;
    }

    container.innerHTML = ownedKeys.map(k => {
        const item = ITEMS[k];
        if (!item) return "";
        const isPlus = item.reqRank >= 2;
        const canUse = S.master.rank >= item.reqRank;

        return `
        <div class="game-card">
            <div class="card-header">
                <div>
                    <span class="card-title">${item.name}</span>
                    <span class="card-badge ${isPlus ? 'plus' : ''}">持有: ${S.inventory[k]}</span>
                </div>
                <span class="card-badge ${canUse ? '' : 'plus'}">門檻: Rank ${item.reqRank}</span>
            </div>
            <div style="font-size:0.82rem; color:#6b3a3a; margin-bottom:8px; line-height:1.4;">
                ${item.desc}
            </div>
            <button class="btn-primary" style="padding:4px 10px; font-size:0.8rem; width:100%;" 
                onclick="handleUseItemClick('${item.id}')">
                ${canUse ? '於此時段使用道具' : '階級不足 (無法駕馭)'}
            </button>
        </div>`;
    }).join("");
}

// 5. 房產系統 (街區 ＞ 房屋 ＞ 詳情 三層折疊)
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
                    <span style="color:var(--text-accent);">容量: ${h.capacity} 人 ▾</span>
                </div>
                <div id="details-${h.id}" class="house-details" style="display:none;">
                    <p style="margin-bottom:4px;">${h.desc}</p>
                    <p>舒適度: ${h.comfort} | 日租金: ${h.rent} G | 購價: ${h.price} G</p>
                    <div style="margin-top:6px; display:flex; gap:6px;">
                        ${!isOwned ? `<button class="btn-primary" style="font-size:0.75rem; padding:3px 8px;" onclick="handleBuyHouse('${d.id}','${h.id}')">出資購入 (${h.price} G)</button>` : ''}
                        ${isOwned && !isCurrentHome ? `<button class="btn-primary" style="font-size:0.75rem; padding:3px 8px;" onclick="handleMoveHouse('${d.id}','${h.id}')">搬遷至此</button>` : ''}
                    </div>
                </div>
            </div>`;
        }).join("");

        return `
        <div class="district-group">
            <div class="district-header" onclick="toggleDistrict('district-houses-${d.id}')">
                <span>${d.name} ${isCurrentDistrict ? '【當前所在區】' : ''}</span>
                <span>展開房產 ▾</span>
            </div>
            <div id="district-houses-${d.id}" style="display: ${isCurrentDistrict ? 'block' : 'none'};">
                <div style="padding:6px 10px; font-size:0.76rem; background:#fff7e6; color:#855454;">
                    ${d.desc}
                </div>
                ${housesHtml}
            </div>
        </div>`;
    }).join("");
}

// 展開/收合輔助函式
function toggleDistrict(elemId) {
    const el = document.getElementById(elemId);
    if (el) el.style.display = (el.style.display === "none") ? "block" : "none";
}

function toggleDetails(elemId) {
    const el = document.getElementById(elemId);
    if (el) el.style.display = (el.style.display === "none") ? "block" : "none";
}

// 全域刷新
function renderAll() {
    renderHeader();
    renderSuccubi();
    renderInventory();
    renderHousing();
}

// 追加劇情對話 Bubble
function appendStoryMessage(type, text) {
    const logBox = document.getElementById("story-log");
    if (!logBox) return;

    const div = document.createElement("div");
    div.className = `msg-box msg-${type}`;
    div.innerText = text;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}
