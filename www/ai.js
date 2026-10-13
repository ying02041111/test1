/* ============================================================
   《緋夜飼育錄》AI 與保底敘事 ai.js
   ============================================================ */

const API_SETTINGS_KEY = "ck_api_settings_v1";

function getApiSettings() {
  try { return JSON.parse(localStorage.getItem(API_SETTINGS_KEY) || "{}"); }
  catch (e) { return {}; }
}

function persistApiSettings(cfg) {
  localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(cfg || {}));
}

/* 自動補全端點：填 Base URL 或完整位址都能用 */
function normalizeApiUrl(url) {
  let u = String(url || "").trim();
  if (!u) return "";
  u = u.replace(/\/+$/, "");
  if (/chat\/completions/i.test(u)) return u;   // 已含端點（含查詢參數也放行）
  return u + "/chat/completions";               // 視為 Base URL，自動補上
}

function ownedItemNames() {
  return S.inventory.map(id => { const it = getItem(id); return it ? it.name : ""; }).filter(Boolean);
}

/* ---------- 系統 Prompt ---------- */
function buildSystemPrompt() {
  const m = S.master;
  const style = MASTER_STYLES.find(x => x.id === m.style) || MASTER_STYLES[0];
  const rank = getRank(m.rank);
  const district = getDistrict(S.currentDistrictId);
  const house = getHouse(S.currentHouseId);

  const succText = S.succubi.length
    ? S.succubi.map(s => {
        const contract = s.contract === "permanent" ? "永久契約" : "暫時契約";
        const def = s.defect ? `｜缺陷:${s.defect.name}` : "";
        return `${s.name}（${s.raceName}｜${s.personalityName}｜${contract}｜好感${s.affection} 服從${s.obedience} 壓力${s.stress} 飢餓${s.hunger}${def}）`;
      }).join("；")
    : "（名下尚無魅魔）";

  const itemText = ownedItemNames().length ? ownedItemNames().join("、") : "（無）";
  const personaText = m.persona ? m.persona : "（未設定，請自行揣摩主人形象）";
  const factsText = (S.facts && S.facts.length) ? "\n【玩家已知事實】" + S.facts.join("；") : "";

  return `你是《緋夜飼育錄》的敘事引擎，一款成人向（18+ 氛圍）魅魔飼育文字遊戲的旁白。你只輸出一個合法 JSON 物件，不要輸出任何解釋、前綴或 markdown 程式碼框。

【輸出格式】
{"narrative":"2~4 句中文敘事","choices":["選項1","選項2","選項3"],"commands":[]}

【文風】
- 感官化、文學化、露骨暗示但絕不粗俗；用比喻與留白勾出情慾，不寫直白的生殖器名詞。
- 視情境在「日常」與「親密調教 18+」之間切換；親密場景可寫肌膚、體溫、氣味、顫抖、壓抑的喘息。
- 敘事以第二人稱「你」展開，聚焦玩家的感知與慾望。

【調教風格（僅作語氣背景，絕不直接點名）】
當前風格氣質：${style.name}——${style.desc}。讓敘事與選項的「語氣」貼合這份氣質，但文中與選項中一律不得出現「${style.name}」或「風格」等字眼，更不可寫「用OO風格訓誡」之類的話。

【魅魔現況】
${succText}
- 好感低於 55 時，她必須保有防線與距離，不可一見鍾情、不可瞬間順從。
- 四維（好感/服從/壓力/飢餓）都要在劇情中有所體現。

【玩家背包（僅可引用下列道具，嚴禁提及未擁有的器具）】
${itemText}
- 選項或敘事若要動用道具，只能使用上列物品的「名字」，並以隱晦方式描述其用途；嚴禁出現「情趣玩具」等詞。

【玩家主控】
階級：${rank.name}；所在：${district ? district.name : "緋夜"}・${house ? house.name : ""}；自訂人設：${personaText}。

【選項規則】
- 生成 2~3 個選項，必須是第一人稱內心獨白、感性、暗示性的句子，嚴禁選單式口吻（如「前往市場」「使用道具」）。
- 選項要貼合當前情境與她此刻的狀態，避免每次重複同樣的話。

【指令】
- commands 可選填，用於結算數值：{"type":"stat","succubusId":"...","delta":{"affection":0,"obedience":0,"stress":0,"hunger":0}}、{"type":"item","itemId":"...","succubusId":"..."}、{"type":"time","phases":1}、{"type":"gold","amount":0}、{"type":"hp","amount":0}、{"type":"exp","amount":0}。
- 數值變動幅度宜小（單項 -5 ~ +5 之間）。使用道具時 itemId 必須在上列背包中。
${factsText}`;
}

/* ---------- JSON 解析 ---------- */
function parseAIJson(text) {
  if (!text) return null;
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("{"), end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch (e) { return null; }
}

/* ---------- 呼叫外部 AI ---------- */
async function callStoryAI(userText) {
  const cfg = getApiSettings();
  if (!cfg.url || !cfg.key) return mockNarrativeResponse(userText);
  const url = normalizeApiUrl(cfg.url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini",
        temperature: 0.9,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: userText }
        ]
      })
    });
    if (!res.ok) return mockNarrativeResponse(userText);
    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "";
    const parsed = parseAIJson(content);
    return parsed || mockNarrativeResponse(userText);
  } catch (e) {
    return mockNarrativeResponse(userText);
  }
}

/* ---------- 連線測試 ---------- */
async function testApiConnection() {
  const cfg = getApiSettings();
  if (!cfg.url || !cfg.key) return { ok: false, msg: "請先填妥 API Key 與 URL。" };
  const url = normalizeApiUrl(cfg.url);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
      body: JSON.stringify({ model: cfg.model || "gpt-4o-mini", messages: [{ role: "user", content: "ping" }], max_tokens: 1 })
    });
    if (res.ok) return { ok: true, msg: "連線成功，夜路已通。" };

    const txt = await res.text();
    let hint = "";
    if (res.status === 404) hint = "（404＝找不到端點：URL 路徑不對，通常是少了 /chat/completions）";
    else if (res.status === 401) hint = "（401＝API Key 無效或未授權）";
    else if (res.status === 429) hint = "（429＝請求太頻繁或額度不足）";
    else if (res.status === 400) hint = "（400＝請求格式或模型名稱可能有誤）";
    return { ok: false, msg: `連線失敗：${res.status}${hint} ${(txt || "").slice(0, 90)}` };
  } catch (e) {
    return { ok: false, msg: "連線失敗（無法觸及伺服器）：" + e.message };
  }
}

/* ---------- 保底敘事（動態、不重複） ---------- */
const MOCK_SCENES = {
  noSuccubus: [
    "你的房裡空蕩蕩的，只有燭火在牆上搖。飼育員的手，總得有誰來捧住。緋夜的市場今夜還亮著燈。",
    "夜風從窗縫漏進來，帶著燈紅街若有似無的香。你還沒有一隻屬於自己的魅魔，這份寂靜，該被打破了。"
  ],
  hungerHigh: [
    "{name} 偎在你腳邊，腹部傳出一聲細細的響。她的眼睛濕漉漉地望向你，飢餓把她的驕傲磨得發軟，連{personalityName}的性子都快要潰堤。",
    "{name} 的尾尖無精打采地垂著，鼻尖朝你的方向一下一下地嗅。她的飢餓像一簇悶燒的火，把她{appearance}都蒸出了薄薄的緋色。"
  ],
  stressHigh: [
    "{name} 的肩膀繃得像張滿的弓，{scent}裡混進了一絲焦躁。她避開你的視線，可緊抿的唇卻藏不住顫抖。",
    "你走近時，{name} 的背脊肉眼可見地僵了一下。她的壓力已經快把最後一點溫順都壓碎了，像一頭隨時會受驚的困獸。"
  ],
  guarded: [
    "{name} 與你之間隔著一臂的距離，像一道看不見的防線。她的{personalityName}仍倔強地豎著刺，眼裡的戒備還沒化開。",
    "{name} 沒有靠近，只拿那雙眼睛冷冷地望你。她的好感尚未越過那道檻，你越前進一步，她就越往後縮一寸。"
  ],
  intimate: [
    "{name} 主動蹭進你的掌心，{scent}細細地纏上你的呼吸。破冰之後，她的親暱像融化的蜜，黏稠又燙人。",
    "她仰起臉，{appearance}。此刻的她不再設防，眼裡的柔軟幾乎要把你溺進去。"
  ],
  permanent: [
    "她頸間的契約痕隱隱發燙。永久之契已將她與你的命數綁在一起，她望向你時，眼底沉著一種只有歸處才有的篤定。",
    "她安靜地偎在你懷裡，呼吸與你的心跳同頻。自那一夜以血為誓，她看你的眼神，便再沒有離開過。"
  ],
  default: [
    "夜色在窗外漫開，{name} 就這麼待在你身旁，{scent}若有似無地撩撥著你的神經。",
    "你與 {name} 之間的空氣微微發燙，{personalityName}的她，此刻正用一種你讀不透的眼神看著你。"
  ]
};

const BASE_CHOICES = [
  "靠近她，托起她的下顎，逼她直視你的眼睛",
  "慢條斯理地繞到她身後，指尖若有似無地擦過她的頸側",
  "俯下身，在她耳畔低語，說你會等她自己求",
  "解下她的髮，讓那一頭長髮散落在你的膝上",
  "用拇指摩挲她的唇，感受她顫抖的呼吸",
  "把她的下巴抬得更高些，審視她眼底的倔強",
  "不說話，只是靜靜地凝視她，讓沉默把空氣熬得發燙",
  "牽起她的手，貼上你自己的心口",
  "勾起她的一綹髮絲，湊到鼻尖輕嗅",
  "退後一步，看她會不會主動追過來"
];

let mockCounter = 0;

function fill(tpl, suc) {
  if (!suc) return tpl;
  return tpl
    .replace(/\{name\}/g, suc.name)
    .replace(/\{raceName\}/g, suc.raceName)
    .replace(/\{personalityName\}/g, suc.personalityName)
    .replace(/\{scent\}/g, suc.scent)
    .replace(/\{appearance\}/g, suc.appearance);
}

function buildMockChoices(suc) {
  if (!suc) {
    const arr = [
      "踏進高塔契約廳，去挑一雙屬於你的眼睛。",
      "先踱到緋夜舊城的街頭，聽聽今晚的風聲。"
    ];
    if (S.hasPurchased) arr.splice(1, 0, "鑽進暗巷黑市，賭一把低價的誘惑。");
    return arr;
  }
  const arr = [];
  const shuffled = BASE_CHOICES.slice().sort(() => Math.random() - 0.5);
  arr.push(shuffled[0], shuffled[1]);

  for (const id of S.inventory) {
    const it = getItem(id);
    if (it && it.choiceHint && Math.random() < 0.5 && !arr.includes(it.choiceHint)) {
      arr.push(`取出「${it.name}」，${it.choiceHint}`);
      if (arr.length >= 4) break;
    }
  }
  while (arr.length < 2) arr.push(BASE_CHOICES[arr.length % BASE_CHOICES.length]);
  return arr.slice(0, 4);
}

function mockNarrativeResponse(input) {
  const suc = currentSuccubus();
  let scene = "default";
  if (!suc) scene = "noSuccubus";
  else if (suc.contract === "permanent" && Math.random() < 0.4) scene = "permanent";
  else if (suc.hunger > 60) scene = "hungerHigh";
  else if (suc.stress > 65) scene = "stressHigh";
  else if (suc.affection < 55) scene = "guarded";
  else scene = "intimate";

  const pool = MOCK_SCENES[scene] || MOCK_SCENES.default;
  const narrative = fill(pool[mockCounter++ % pool.length], suc);
  const choices = buildMockChoices(suc);

  const commands = [];
  if (suc && Math.random() < 0.6) {
    commands.push({
      type: "stat", succubusId: suc.id,
      delta: { affection: randInt(-1, 2), stress: randInt(-1, 2), hunger: randInt(0, 2) }
    });
  }
  return { narrative, choices, commands };
}

function purchaseReaction(suc) {
  const narrative = fill("契約落定的那一夜，{name} 被領進你的住處。她的{appearance}。你與她的第一個夜晚，才正要開始。", suc);
  return { narrative, choices: buildMockChoices(suc), commands: [] };
}
