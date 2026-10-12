// www/main.js - 遊戲入口啟動、玩家交互監聽與流程控制

document.addEventListener("DOMContentLoaded", () => {
    initGame();
});

function initGame() {
    const hasData = loadGame();
    if (!hasData) {
        // 全新遊戲初始化開局劇情
        appendStoryMessage("system", "緋紅夜幕降臨。命運的輪盤開始轉動。");
        appendStoryMessage("narrative", "你帶著微薄的積蓄抵達了薄霧下城區。陰暗的閣樓裡只有微弱的燭火跳動。作為剛通過審核的見習飼育員，你現在可以前往黑市物色魅魔，或在房間內規劃往後的馴育之路。");
        saveGame();
    } else {
        appendStoryMessage("system", "進度載入成功。歡迎回到緋夜飼育錄。");
        // 回放最後三條日誌
        S.logs.slice(-3).forEach(log => appendStoryMessage("system", log));
    }

    renderAll();
}

// 玩家發送行動指令
async function handleSendAction() {
    const inputEl = document.getElementById("player-input");
    const sendBtn = document.getElementById("btn-send");
    const userText = inputEl.value.trim();
    if (!userText) return;

    // 清空並禁用輸入
    inputEl.value = "";
    inputEl.disabled = true;
    sendBtn.disabled = true;
    sendBtn.innerText = "推進中...";

    // 顯示玩家話語
    appendStoryMessage("player", userText);

    try {
        // 呼叫 AI 敘事大腦
        const result = await callStoryAI(userText);
        
        // 渲染敘事文字
        if (result && result.narrative) {
            appendStoryMessage("narrative", result.narrative);
        }

        // 執行底層命令（扣款、加好感、道具、時間推進等）
        if (result && result.commands) {
            processAICommands(result.commands);
        }
    } catch (e) {
        console.error("行動處理失敗:", e);
        appendStoryMessage("system", "【系統】思維產生紊亂，請稍後再試。");
    } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        sendBtn.innerText = "行動";
        inputEl.focus();
        renderAll();
    }
}

// 道具點擊使用
function handleUseItemClick(itemId) {
    const res = useItemOnSuccubus(itemId);
    alert(res.msg);
    renderAll();
}

// 房產購買
function handleBuyHouse(districtId, houseId) {
    const district = DISTRICTS.find(d => d.id === districtId);
    const house = district.houses.find(h => h.id === houseId);
    if (!house) return;

    if (S.master.gold >= house.price) {
        S.master.gold -= house.price;
        S.ownedHouses.push(house.id);
        pushLog(`購置了「${district.name} - ${house.name}」！`);
        addMasterExp(50);
        renderAll();
        alert(`成功購得 ${house.name}！`);
    } else {
        alert(`金幣不足！需要 ${house.price} G。`);
    }
}

// 搬遷住所
function handleMoveHouse(districtId, houseId) {
    S.currentDistrictId = districtId;
    S.currentHouseId = houseId;
    pushLog(`搬遷至「${houseId}」。`);
    renderAll();
    alert("已搬遷至新住所！");
}
