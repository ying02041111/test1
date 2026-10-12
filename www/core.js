// www/core.js - 核心遊戲狀態管理與計算邏輯

const SAVE_KEY = "ck_save_v4";

// 初始全域狀態
let S = {
    master: {
        hp: 100,
        maxHp: 100,
        gold: 800,
        exp: 0,
        rank: 1
    },
    day: 1,
    subPhase: 0, // 0: 清晨, 1: 午後, 2: 傍晚, 3: 深夜
    currentDistrictId: "d_slums",
    currentHouseId: "h_attic",
    ownedHouses: ["h_attic"],
    succubi: [],
    inventory: {
        snack: 2,
        tea: 1
    },
    logs: [],
    summary: "剛抵達薄霧下城區的陰暗閣樓，作為見習飼育員邁出第一步。",
    facts: ["目前落腳於下城區陰暗閣樓。"]
};

const SUBPHASE_NAMES = ["清晨", "午後", "傍晚", "深夜"];

// 1. 好感度增長倍率計算 (傲嬌/冷酷在 55 點觸發 1.6x 暴衝)
function calcRelRate(succubus) {
    const pers = PERSONALITIES.find(p => p.id === succubus.personality.id) || PERSONALITIES[0];
    if (succubus.relation >= 55) {
        return pers.contrastRate; // 突破防線後 1.6x
    }
    return pers.initialRate; // 55 以前防備森嚴 (0.4x)
}

// 2. 主控經驗值與階級晉升
function addMasterExp(amount) {
    S.master.exp += amount;
    checkMasterRank();
}

function checkMasterRank() {
    let targetRankIndex = 0;
    for (let i = MASTER_RANKS.length - 1; i >= 0; i--) {
        if (S.master.exp >= MASTER_RANKS[i].reqExp) {
            targetRankIndex = i;
            break;
        }
    }
    const newRank = MASTER_RANKS[targetRankIndex].rank;
    if (newRank > S.master.rank) {
        S.master.rank = newRank;
        const rankInfo = MASTER_RANKS[targetRankIndex];
        pushLog(`【階級突破】主控獲得認可，正式晉升為「${rankInfo.title}」(Rank ${newRank})！`);
    }
}

// 3. 道具使用機制 (含等級防呆驗證與效果套用)
function useItemOnSuccubus(itemId, succubusId) {
    const item = ITEMS[itemId];
    if (!item) return { success: false, msg: "查無此道具。" };

    // 檢查背包
    if (!S.inventory[itemId] || S.inventory[itemId] <= 0) {
        return { success: false, msg: `背包中沒有「${item.name}」。` };
    }

    // 階級驗證：新手不可偷用高等級道具
    if (S.master.rank < item.reqRank) {
        return { 
            success: false, 
            msg: `【階級不足】「${item.name}」需要 Rank ${item.reqRank} 才能駕馭！你目前僅為 Rank ${S.master.rank}。` 
        };
    }

    // 尋找目標魅魔 (部分道具不需魅魔，例如補茶)
    let target = null;
    if (succubusId) {
        target = S.succubi.find(s => s.id === succubusId);
    } else if (S.succubi.length > 0) {
        target = S.succubi[0];
    }

    // 扣除道具數量
    S.inventory[itemId]--;
    if (S.inventory[itemId] <= 0) delete S.inventory[itemId];

    // 套用效果
    const eff = item.effect;
    if (eff.masterHp) S.master.hp = Math.min(S.master.maxHp, S.master.hp + eff.masterHp);
    if (eff.masterHpFull) S.master.hp = S.master.maxHp;

    if (target) {
        if (eff.relation) {
            const mult = calcRelRate(target);
            target.relation = Math.max(0, Math.min(100, Math.round(target.relation + eff.relation * mult)));
        }
        if (eff.obedience) target.obedience = Math.max(0, Math.min(100, target.obedience + eff.obedience));
        if (eff.stress) target.stress = Math.max(0, Math.min(100, target.stress + eff.stress));
        if (eff.hunger) target.hunger = Math.max(0, Math.min(100, target.hunger + eff.hunger));
    }

    if (eff.exp) addMasterExp(eff.exp);

    pushLog(`使用了「${item.name}」${target ? `，作用於 ${target.name}` : ""}。`);
    saveGame();
    return { success: true, msg: `成功使用「${item.name}」！` };
}

// 4. 魅魔生成機制 (已修復 DEFECTS 缺失)
function rollSuccubus(raceKey = null) {
    const raceKeys = Object.keys(RACES);
    const chosenRace = RACES[raceKey || raceKeys[Math.floor(Math.random() * raceKeys.length)]];
    const pers = PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];
    const defect = DEFECTS[Math.floor(Math.random() * DEFECTS.length)];
    const app = APPEARANCES[Math.floor(Math.random() * APPEARANCES.length)];
    const scent = SCENTS[Math.floor(Math.random() * SCENTS.length)];
    
    const names = ["莉莉絲", "愛麗拉", "維拉", "克蘿伊", "賽拉菲娜", "莫妮卡", "妮可", "蕾拉"];
    const name = names[Math.floor(Math.random() * names.length)];

    return {
        id: "suc_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
        name: name,
        race: chosenRace,
        personality: pers,
        defect: defect,
        appearance: app,
        scent: scent,
        relation: 10,
        obedience: 20,
        stress: 15,
        hunger: 20
    };
}

// 5. 時間推進機制 (僅在完整事件完成時推進，非逐句推進)
function advanceTime(phases = 1) {
    for (let i = 0; i < phases; i++) {
        S.subPhase++;
        if (S.subPhase > 3) {
            S.subPhase = 0;
            S.day++;
            triggerDailySettlement();
        }
    }
    // 時間流逝自然回氣
    S.master.hp = Math.min(S.master.maxHp, S.master.hp + 5 * phases);
    saveGame();
}

// 每日結算（房租、純血體液消耗、糧食）
function triggerDailySettlement() {
    pushLog(`=== 第 ${S.day} 日開始 ===`);

    // 扣除房租
    let totalRent = 0;
    DISTRICTS.forEach(d => {
        d.houses.forEach(h => {
            if (S.ownedHouses.includes(h.id)) totalRent += h.rent;
        });
    });

    if (S.master.gold >= totalRent) {
        S.master.gold -= totalRent;
        pushLog(`支付房租日常維護費 ${totalRent} G。`);
    } else {
        pushLog(`【破產警報】無法支付房租 (${totalRent} G)！魅魔生活環境惡化，壓力暴增。`);
        S.succubi.forEach(s => s.stress = Math.min(100, s.stress + 25));
    }

    // 餵食與純血汲取
    const rankInfo = MASTER_RANKS.find(r => r.rank === S.master.rank) || MASTER_RANKS[0];
    const discount = rankInfo.staminaDiscount;

    S.succubi.forEach(s => {
        s.hunger = Math.min(100, s.hunger + 30);
        if (s.race.id === "pureblood") {
            // 純血魅魔：扣主角體力
            const baseStamina = FOODS.fluids.costStamina;
            const finalStamina = Math.max(5, Math.round(baseStamina * (1 - discount)));
            if (S.master.hp >= finalStamina) {
                S.master.hp -= finalStamina;
                s.hunger = Math.max(0, s.hunger - FOODS.fluids.hungerRecover);
                pushLog(`${s.name} (純血) 汲取了你的體液，消耗體力 ${finalStamina} 點。`);
            } else {
                s.stress = Math.min(100, s.stress + 35);
                s.relation = Math.max(0, s.relation - 8);
                pushLog(`【飢渴狂亂】主角體力耗盡，無法滿足 ${s.name} 的體液吸食！她正瀕臨暴走。`);
            }
        } else {
            // 雜血/一般魅魔：扣糧食金幣
            if (S.master.gold >= FOODS.normal.costGold) {
                S.master.gold -= FOODS.normal.costGold;
                s.hunger = Math.max(0, s.hunger - FOODS.normal.hungerRecover);
            } else {
                s.stress = Math.min(100, s.stress + 20);
                pushLog(`金幣耗盡無法購糧，${s.name} 陷入飢餓虛弱。`);
            }
        }
    });
}

// 6. 存檔與讀檔
function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(S));
    } catch (e) {
        console.error("存檔失敗:", e);
    }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
            S = JSON.parse(raw);
            checkMasterRank();
            return true;
        }
    } catch (e) {
        console.error("讀檔失敗:", e);
    }
    return false;
}

function resetGame() {
    localStorage.removeItem(SAVE_KEY);
    location.reload();
}

function pushLog(text) {
    S.logs.push(`[${SUBPHASE_NAMES[S.subPhase]}] ${text}`);
    if (S.logs.length > 60) S.logs.shift();
}
