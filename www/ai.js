// www/ai.js - AI 敘事大腦、Prompt 組裝、選項生成與指令解析

// 1. 組裝 System Prompt (大腦核心規則)
function buildSystemPrompt() {
    const curRank = MASTER_RANKS.find(r => r.rank === S.master.rank) || MASTER_RANKS[0];
    const curDistrict = DISTRICTS.find(d => d.id === S.currentDistrictId) || DISTRICTS[0];
    const curHouse = curDistrict.houses.find(h => h.id === S.currentHouseId) || curDistrict.houses[0];
    const styleInfo = MASTER_STYLES[S.master.style] || MASTER_STYLES.dom;

    let succubiContext = "目前尚無飼育中的魅魔。";
    if (S.succubi.length > 0) {
        succubiContext = S.succubi.map(s => {
            const relRate = calcRelRate(s);
            return `【魅魔: ${s.name}】
- 種族: ${s.race.name} (${s.race.traitDesc})
- 個性: ${s.personality.name} (${s.personality.desc}) [好感成長倍率: ${relRate}x]
- 缺陷: ${s.defect.name} (${s.defect.desc})
- 外貌與氣味: ${s.appearance} / ${s.scent}
- 四維狀態: 好感度 ${s.relation}/100, 服從度 ${s.obedience}/100, 壓力 ${s.stress}/100, 飢餓度 ${s.hunger}/100`;
        }).join("\n\n");
    }

    const customPersona = S.master.persona && S.master.persona.trim() !== "" 
        ? S.master.persona.trim() 
        : "未額外填寫（依預設見習調教師演繹）。";

    return `你是文字冒險遊戲《緋夜飼育錄》的敘事導演兼系統核心。請嚴格遵守以下所有規則：

【當前世界情境】
- 時間: 第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}
- 主控階級: Rank ${S.master.rank} (${curRank.title}), 體力 ${S.master.hp}/${S.master.maxHp}, 金幣 ${S.master.gold} G
- 當前所在地: ${curDistrict.name} · 住所「${curHouse.name}」
- 歷史摘要: ${S.summary}
- 核心事實: ${S.facts.join("；")}

【主控（玩家）專屬人設與風格】
- 訓練風格: 【${styleInfo.name}】—— ${styleInfo.desc}
- 自訂背景人設 (最高優先級事實):
  "${customPersona}"
*請在描寫主控的眼神、言語、肢體動作時，徹底貫徹上述人設與訓練風格！*

【魅魔身心狀況】
${succubiContext}

【文風與氛圍雙軌原則】
1. 日常市井：在街區走動、採購商討、生活交談時，呈現下城區暗黑奇幻的市井生活氣息。
2. 親密與調教：牽涉拘束、懲罰、使用情趣器具或調教時，轉為極致高張力、感官細膩、呼吸急促的 15+/18+ 氛圍。
3. 【紅線禁令】：絕對禁止使用直接、粗俗無禮的生殖器官名詞，必須改用優雅香豔的文學修辭（如：幽密深處、泥濘花徑、嫣紅頂端、滾燙熱鐵、脆弱軟肉等）。
4. 【禁止一見鍾情】：魅魔在好感度未滿 55 之前，必須展現性格防線與冷漠/傲嬌；不可毫無鋪墊輕易順從投懷送抱。

【四維數值在劇情的具體表現】
- 服從度(Obedience)：低服從時眼神抗拒、咬唇不肯求饒；高服從時下意識屈膝垂首呈上脆弱處、順應命令。
- 壓力(Stress)：高壓力時手指劇烈發抖、眼眶泛紅含淚、對輕微碰觸產生驚弓之鳥般的過度戰慄。
- 飢餓度(Hunger)：純血魅魔極度飢渴時，會失去理智被本能支配，血瞳發亮、主動撲向主控索求精華體液。
- 【緋夜禁典·極刑】重器痛感：若劇情涉及異形巨型玉棒、螺旋絞骨夾、雙首律動儀等禁典器具，必須生動刻畫撕裂劇痛、充血紅腫、肌理痙攣與理智被徹底衝垮的殘酷壓迫感。

【時間推進規則（場景制）】
- 同一場景挑選、對話試穿、連續互動過程中，絕對不要跳過時段（保持 advance_time: false）。
- 只有當一段完整事件結束（例如：結束調教就寢、買完離開商店、跨街區移動）時，才將 advance_time 設為 true。

【輸出規範】
你必須在輸出最後附上且僅附上一個合法的 JSON 區塊（使用 \`\`\`json ... \`\`\` 包裹），且必須包含 3 個為玩家準備的情境推進選項（choices），格式如下：
\`\`\`json
{
  "narrative": "劇情故事本體描述，長度約 250~450 字...",
  "choices": [
    "選項1（例如：拿起軟鞣散尾短鞭，給予適度責罰立下規矩）",
    "選項2（例如：溫和遞出低階安撫蜜餞，撫平她眼底的驚慌）",
    "選項3（例如：冷眼轉身，動身前往下城區黑市物色新器具）"
  ],
  "advance_time": false,
  "buy_item_id": null,
  "use_item_id": null,
  "buy_succubus": false,
  "succubus_race": null,
  "target_succubus_id": null,
  "stat_changes": {
    "relation": 0,
    "obedience": 0,
    "stress": 0,
    "hunger": 0,
    "master_hp": 0,
    "gold": 0
  },
  "new_fact": null
}
\`\`\``;
}

// 2. 指令解析與狀態結算 (Process AI Commands)
function processAICommands(cmd) {
    if (!cmd) return;

    // 儲存動態推進選項
    if (Array.isArray(cmd.choices) && cmd.choices.length > 0) {
        S.currentChoices = cmd.choices;
    } else {
        S.currentChoices = ["靜觀其變，審視當前處境", "邁步上前，進行下一步訓育", "暫作休整，思索後續對策"];
    }

    // 1. 購買道具
    if (cmd.buy_item_id && ITEMS[cmd.buy_item_id]) {
        const it = ITEMS[cmd.buy_item_id];
        if (S.master.gold >= it.price) {
            S.master.gold -= it.price;
            S.inventory[it.id] = (S.inventory[it.id] || 0) + 1;
            pushLog(`購入了「${it.name}」，花費 ${it.price} G。`);
        } else {
            pushLog(`【金幣不足】無法購入「${it.name}」！`);
        }
    }

    // 2. 劇情觸發使用道具
    if (cmd.use_item_id) {
        consumeItemByStory(cmd.use_item_id, cmd.target_succubus_id);
    }

    // 3. 購買/契約魅魔
    if (cmd.buy_succubus) {
        const curDistrict = DISTRICTS.find(d => d.id === S.currentDistrictId);
        const curHouse = curDistrict.houses.find(h => h.id === S.currentHouseId);
        if (S.succubi.length < curHouse.capacity) {
            const newSuc = rollSuccubus(cmd.succubus_race);
            S.succubi.push(newSuc);
            pushLog(`【契約結成】你將「${newSuc.name}」(${newSuc.race.name}) 帶回了居所！`);
            addMasterExp(30);
        } else {
            pushLog(`【居所已滿】居所收容上限為 ${curHouse.capacity}，無法收納更多魅魔！`);
        }
    }

    // 4. 自然數值浮動
    if (cmd.stat_changes) {
        const sc = cmd.stat_changes;
        if (sc.gold) S.master.gold += sc.gold;
        if (sc.master_hp) S.master.hp = Math.max(0, Math.min(S.master.maxHp, S.master.hp + sc.master_hp));

        if (S.succubi.length > 0) {
            let target = S.succubi[0];
            if (cmd.target_succubus_id) {
                target = S.succubi.find(s => s.id === cmd.target_succubus_id) || target;
            }
            if (sc.relation) {
                const mult = calcRelRate(target);
                target.relation = Math.max(0, Math.min(100, Math.round(target.relation + sc.relation * mult)));
            }
            if (sc.obedience) target.obedience = Math.max(0, Math.min(100, target.obedience + sc.obedience));
            if (sc.stress) target.stress = Math.max(0, Math.min(100, target.stress + sc.stress));
            if (sc.hunger) target.hunger = Math.max(0, Math.min(100, target.hunger + sc.hunger));
        }
    }

    // 5. 新劇情錨點
    if (cmd.new_fact && !S.facts.includes(cmd.new_fact)) {
        S.facts.push(cmd.new_fact);
        if (S.facts.length > 8) S.facts.shift();
    }

    // 6. 場景時段推進判定
    if (cmd.advance_time === true) {
        advanceTime(1);
    } else {
        saveGame();
    }
}

// 3. 呼叫大模型 API (直連設定面板所填數值)
async function callStoryAI(userText) {
    const sysPrompt = buildSystemPrompt();

    const apiUrl = localStorage.getItem("ck_api_url") || "https://api.openai.com/v1/chat/completions";
    const apiKey = localStorage.getItem("ck_api_key") || "";
    const model = localStorage.getItem("ck_api_model") || "gpt-4o-mini";

    // 若未填 Key，回傳情境模擬保底
    if (!apiKey) {
        return mockNarrativeResponse(userText);
    }

    const payload = {
        model: model,
        messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userText }
        ],
        temperature: 0.8
    };

    try {
        const resp = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!resp.ok) {
            throw new Error(`API 請求異常: HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const rawContent = data.choices[0].message.content;
        return parseAIResponse(rawContent);
    } catch (err) {
        console.warn("AI 端點連線失敗，啟用保底邏輯:", err);
        return mockNarrativeResponse(userText);
    }
}

// 解析 JSON 與劇情本體
function parseAIResponse(raw) {
    let narrative = raw;
    let commands = null;

    const jsonMatch = raw.match(/```json([\s\S]*?)```/);
    if (jsonMatch) {
        try {
            commands = JSON.parse(jsonMatch[1].trim());
            if (commands.narrative) {
                narrative = commands.narrative;
            } else {
                narrative = raw.replace(/```json[\s\S]*?```/, "").trim();
            }
        } catch (e) {
            console.error("JSON 解析失敗:", e);
        }
    }

    return { narrative, commands };
}

// 本地模擬保底回覆
function mockNarrativeResponse(input) {
    const curSuc = S.succubi[0];
    let reply = `薄霧籠罩的下城區散發著微涼濕氣。你依據自己的規劃沉著注視眼前的一切。`;
    let choices = ["前往黑市打探純血魅魔消息", "整頓陰暗閣樓的拘束器具", "靜坐調息，儲備體力"];
    let cmd = { advance_time: false, choices };

    if (input.includes("魅魔") || (input.includes("買") && S.succubi.length === 0)) {
        reply = `你在黑市隱蔽的暗棚中簽下了奴隸契約。一名被沉重鐵鏈拘束的純血魅魔被送到了你的面前，她用冰冷而防備的眼神盯著你，頸邊散發出甜膩的熟透蜜桃香氣。`;
        choices = ["冷聲喝令她跪下受檢", "遞出安撫蜜餞試探其反應", "將她帶回閣樓鎖入靜室"];
        cmd = { buy_succubus: true, succubus_race: "pureblood", stat_changes: { gold: -300 }, choices };
    } else if (curSuc) {
        reply = `你步步逼近 ${curSuc.name}。她看見你靠近，身子下意識繃緊，雙眸帶著 ${curSuc.personality.name} 的防備與倔強，緊咬下唇注視著你的一舉一動。`;
        choices = [`以【${MASTER_STYLES[S.master.style].name}】風格訓誡她`, "拿出隨身攜帶的情趣器具", "詢問她當前對主人的態度"];
        cmd = { stat_changes: { obedience: 2, stress: 3 }, choices };
    }

    return { narrative: reply, commands: cmd };
}
