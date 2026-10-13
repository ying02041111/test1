// www/main.js - 遊戲入口啟動、選項點擊推進、輸入監聽與 API 設定視窗

document.addEventListener("DOMContentLoaded", () => {
    initGame();
});

function initGame() {
    const hasData = loadGame();
    if (!hasData) {
        appendStoryMessage("system", "緋紅夜幕降臨。命運的契約在此展開。");
        appendStoryMessage("narrative", "你帶著微薄的積蓄踏入了薄霧下城區。潮濕微涼的陰暗閣樓裡，只有一盞油燈搖曳著昏暗火光。作為初來乍到的見習飼育員，你必須在這座罪惡都市中建立屬於自己的支配領地。");
        // 初始化開局推進選項
        S.currentChoices = [
            "動身前往下城區暗巷黑市，物色被拘束的魅魔奴隸",
            "在陰暗閣樓內清點隨身攜帶的蜜餞與舒緩草茶",
            "鎖緊房門閉目休憩，儲備接下來所需的體力"
        ];
        saveGame();
    } else {
        appendStoryMessage("system", "進度載入成功。歡迎回到緋夜飼育錄。");
        S.logs.slice(-3).forEach(log => appendStoryMessage("system", log));
    }

    renderAll();
}

// 1. 玩家點擊動態選項推進劇情
async function handleChoiceClick(choiceText) {
    await executeProgression(choiceText);
}

// 2. 玩家在輸入框打字發送推進劇情
async function handleSendAction() {
    const inputEl = document.getElementById("player-input");
    const userText = inputEl.value.trim();
    if (!userText) return;

    inputEl.value = "";
    await executeProgression(userText);
}

// 核心推進流程 (發送給 AI 並結算)
async function executeProgression(actionText) {
    const inputEl = document.getElementById("player-input");
    const sendBtn = document.getElementById("btn-send");
    const choiceBox = document.getElementById("story-choices");

    // 介面鎖定
    if (inputEl) inputEl.disabled = true;
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerText = "推進中...";
    }
    if (choiceBox) {
        choiceBox.style.opacity = "0.5";
        choiceBox.style.pointerEvents = "none";
    }

    // 顯示玩家行為
    appendStoryMessage("player", actionText);

    try {
        const result = await callStoryAI(actionText);

        if (result && result.narrative) {
            appendStoryMessage("narrative", result.narrative);
        }

        if (result && result.commands) {
            processAICommands(result.commands);
        }
    } catch (e) {
        console.error("推進異常:", e);
        appendStoryMessage("system", "【系統】意識產生微幅震盪，請重試。");
    } finally {
        if (inputEl) {
            inputEl.disabled = false;
            inputEl.focus();
        }
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerText = "行動";
        }
        if (choiceBox) {
            choiceBox.style.opacity = "1";
            choiceBox.style.pointerEvents = "auto";
        }
        renderAll();
    }
}

// 3. 主控風格切換
function handleStyleChange() {
    const sel = document.getElementById("master-style-select");
    if (!sel) return;
    S.master.style = sel.value;
    saveGame();
    pushLog(`訓育風格已切換為：${MASTER_STYLES[sel.value].name}`);
}

// 4. 自訂人設保存 (焦點移開時自動保存)
function handlePersonaBlur() {
    const personaEl = document.getElementById("master-custom-persona");
    if (!personaEl) return;
    S.master.persona = personaEl.value;
    saveGame();
}

// 5. API 彈出視窗操作
function openApiModal() {
    const modal = document.getElementById("api-modal");
    if (!modal) return;

    document.getElementById("cfg-api-key").value = localStorage.getItem("ck_api_key") || "";
    document.getElementById("cfg-api-url").value = localStorage.getItem("ck_api_url") || "https://api.openai.com/v1/chat/completions";
    document.getElementById("cfg-api-model").value = localStorage.getItem("ck_api_model") || "gpt-4o-mini";

    modal.style.display = "flex";
}

function closeApiModal() {
    const modal = document.getElementById("api-modal");
    if (modal) modal.style.display = "none";
}

function saveApiSettings() {
    const key = document.getElementById("cfg-api-key").value.trim();
    const url = document.getElementById("cfg-api-url").value.trim();
    const model = document.getElementById("cfg-api-model").value.trim();

    localStorage.setItem("ck_api_key", key);
    localStorage.setItem("ck_api_url", url || "https://api.openai.com/v1/chat/completions");
    localStorage.setItem("ck_api_model", model || "gpt-4o-mini");

    alert("AI 模型連線設定已成功保存！");
    closeApiModal();
}

// 6. 房產購買
function handleBuyHouse(districtId, houseId) {
    const district = DISTRICTS.find(d => d.id === districtId);
    const house = district.houses.find(h => h.id === houseId);
    if (!house) return;

    if (S.master.gold >= house.price) {
        S.master.gold -= house.price;
        S.ownedHouses.push(house.id);
        pushLog(`出資購置了「${district.name} - ${house.name}」！`);
        addMasterExp(50);
        renderAll();
        alert(`成功購得 ${house.name}！可在房產介面點擊搬遷。`);
    } else {
        alert(`金幣不足！購置需要 ${house.price} G。`);
    }
}

// 7. 搬遷居所
function handleMoveHouse(districtId, houseId) {
    S.currentDistrictId = districtId;
    S.currentHouseId = houseId;
    pushLog(`居所已正式搬遷至「${houseId}」。`);
    renderAll();
    alert("已成功搬遷至新居所！");
}
