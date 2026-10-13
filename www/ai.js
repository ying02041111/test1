/* ============================================================
   《緋夜飼育錄》AI 與保底敘事 ai.js
   ============================================================ */

const API_SETTINGS_KEY = "ck_api_settings_v1";
const API_DEFAULTS = { key: "", url: "", model: "", thinking: false, temperature: 0.9, topP: 1.0 };

function getApiSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(API_SETTINGS_KEY) || "{}");
    return Object.assign({}, API_DEFAULTS, s);
  } catch (e) {
    return Object.assign({}, API_DEFAULTS);
  }
}

function persistApiSettings(cfg) { localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(cfg || {})); }

function normalizeApiUrl(url) {
  let u = String(url || "").trim();
  if (!u) return "";
  u = u.replace(/\/+$/, "");
  if (/chat\/completions/i.test(u)) return u;
  return u + "/chat/completions";
}

function toNum(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }

/* 診斷：把 AI 失敗原因顯示在劇情裡 */
function aiDiag(msg) {
  const full = "［AI］" + msg;
  try {
    if (typeof appendStoryMessage === "function") appendStoryMessage("system", full);
    else if (typeof pushLog === "function") pushLog("system", full);
  } catch (_) {}
}

function buildRequestBody(cfg, userText, maxTokens) {
  const body = {
    model: cfg.model || "gpt-4o-mini",
    temperature: toNum(cfg.temperature, 0.9),
    top_p: toNum(cfg.topP, 1.0),
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userText }
    ]
  };
  if (maxTokens) body.max_tokens = maxTokens;
  if (cfg.thinking) body.thinking = { type: "enabled" };
  return body;
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
  const locName = (district ? district.name : "緋夜") + (house ? "・" + house.name : "");
  const nowText = `第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}`;

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
{"narrative":"…","choices":["…","…"],"commands":[]}

【時間與地點】
當前時間：${nowText}；地點：${locName}。
- 敘事開頭可用一行場景（時間·地點），但時間地點必須與上列完全一致，不可自行另寫日期或別的地名。
- 地點要有具體描述：街景、光線、氣味、聲響，例如「海風裹著鹹濕的氣味，混著早市攤販的香」。

【文風】
- 感官化、文學化、露骨暗示但絕不粗俗，不寫直白的生殖器名詞。
- 以第二人稱「你」展開，聚焦玩家的言語與動作。
- 對白要標註說話者與語氣：名字：（語氣）「對白」，例如 緋音：（小聲）「……嗯。」
- 親密場景可寫肌膚、體溫、氣味、顫抖、壓抑的喘息；日常場景則寫環境與互動。

【寫作範例（僅格式參考，勿照抄內容）】
── 第 9 日 · 上午 · 霓虹港 ──
「先洗個澡，再帶你出去。」你低聲說。
緋音的眼睛亮起來，又紅了臉，小聲應道：
緋音：（小聲）「……嗯。」
你想怎麼做？
A. 「嗯，一起。」你脫去外衣，走進水汽裡。
B. 「你先洗，我在外面等你。」
C. 走過去，從背後環住她，替她揉洗髮絲。
D. 「轉過來，我幫你洗。」你低聲。

【調教風格（僅作語氣背景，絕不直接點名）】
當前風格氣質：${style.name}——${style.desc}。讓敘事與選項的「語氣」貼合這份氣質，但文中與選項中一律不得出現「${style.name}」或「風格」等字眼。

【魅魔現況】
${succText}
- 好感低於 55 時，她必須保有防線與距離，不可一見鍾情、不可瞬間順從。
- 四維（好感/服從/壓力/飢餓）都要在劇情中有所體現。

【玩家背包（僅可引用下列道具，嚴禁提及未擁有的器具）】
${itemText}
- 選項或敘事若要動用道具，只能使用上列物品的「名字」，並以隱晦方式描述其用途；嚴禁出現「情趣玩具」等詞。

【玩家主控】
階級：${rank.name}；自訂人設：${personaText}。

【選項規則】
- 生成 2~3 個選項，一律是「對話」或「動作」的短句，例如「「過來。」你低聲。」或「伸手托起她的下顎。」
- 不要寫主控的內心感受或情緒描寫，少用「我」；對話中必要的「我」可用。
- 選項要貼合當前情境與她此刻的狀態，避免重複。

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
  if (!cfg.url || !cfg.key) {
    aiDiag("尚未設定 API（缺 Key 或 URL），改用離線模式。");
    return mockNarrativeResponse(userText);
  }

  const url = normalizeApiUrl(cfg.url);
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
      body: JSON.stringify(buildRequestBody(cfg, userText, 700))
    });
  } catch (e) {
    aiDiag("連線失敗（網路或跨域）：" + (e && e.message ? e.message : e));
    return mockNarrativeResponse(userText);
  }

  if (!res.ok) {
    let t = "";
    try { t = await res.text(); } catch (_) {}
    aiDiag(`回應錯誤 ${res.status}（${url}）：${(t || "").slice(0, 140)}`);
    return mockNarrativeResponse(userText);
  }

  let data;
  try { data = await res.json(); }
  catch (e) { aiDiag("回應不是 JSON。"); return mockNarrativeResponse(userText); }

  const msg = data && data.choices && data.choices[0] && data.choices[0].message;
  const content = msg ? (msg.content || "") : "";
  const parsed = parseAIJson(content);
  if (!parsed) {
    aiDiag("回覆無法解析成 JSON：" + (content || "").slice(0, 120));
    return mockNarrativeResponse(userText);
  }
  return parsed;
}

/* ---------- 連線測試 ---------- */
async function testApiConnection() {
  const cfg = getApiSettings();
  if (!cfg.url || !cfg.key) return { ok: false, msg: "請先填妥 API Key 與 URL。" };
  const url = normalizeApiUrl(cfg.url);
  try {
    const body = {
      model: cfg.model || "gpt-4o-mini",
      temperature: toNum(cfg.temperature, 0.9),
      top_p: toNum(cfg.topP, 1.0),
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }]
    };
    if (cfg.thinking) body.thinking = { type: "enabled" };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key },
      body: JSON.stringify(body)
    });
    if (res.ok) return { ok: true, msg: "連線成功，夜路已通（" + url + "）。" };

    const txt = await res.text();
    let hint = "";
    if (res.status === 404) hint = "（404＝找不到端點：URL 路徑不對）";
    else if (res.status === 401) hint = "（401＝API Key 無效或未授權）";
    else if (res.status === 429) hint = "（429＝請求太頻繁或額度不足）";
    else if (res.status === 400) hint = "（400＝模型名稱或參數有誤，可先把深度思考關掉試試）";
    return { ok: false, msg: `連線失敗：${res.status}${hint} ${(txt || "").slice(0, 90)}` };
  } catch (e) {
    return { ok: false, msg: "連線失敗（無法觸及伺服器）：" + e.message };
  }
}

/* ---------- 保底敘事 ---------- */
const MOCK_SCENES = {
  noSuccubus: [
    "你的住處還空蕩蕩的，窗外的燈紅街隱約傳來笑聲與樂聲。緋夜的市場今夜還亮著燈。是該去挑一雙屬於自己的眼睛了。",
    "夜風從窗縫漏進來，混著舊城石牆的潮氣與遠處攤販的油香。你還沒有一隻屬於自己的魅魔，這份寂靜，該被打破了。"
  ],
  hungerHigh: [
    "{name} 偎在你腳邊，腹部傳出一聲細響。她抬眼望你，眼裡濕漉漉的。\n{name}：（小聲）「主人……我餓了。」",
    "她的尾尖無精打采地垂著，鼻尖朝你的方向一下一下地嗅。\n{name}：（帶著鼻音）「你身上的味道……好香。」"
  ],
  stressHigh: [
    "{name} 的肩膀繃得像張滿的弓。她避開你的視線，緊抿的唇卻藏不住顫抖。",
    "你走近時，{name} 的背脊僵了一下，像一頭受驚的困獸。\n{name}：（低聲）「……別過來。」"
  ],
  guarded: [
    "{name} 與你隔著一臂的距離，像一道看不見的防線。她眼裡的戒備還沒化開。",
    "她沒有靠近，只拿那雙眼睛冷冷地望你。你越前進一步，她就越往後縮一寸。"
  ],
  intimate: [
    "{name} 主動蹭進你的掌心，{scent}纏上你的呼吸。破冰之後，她的親暱像融化的蜜。",
    "她仰起臉，{appearance}。此刻的她不再設防，眼裡的柔軟幾乎要把你溺進去。"
  ],
  permanent: [
    "她頸間的契約痕隱隱發燙。永久之契已將她與你的命數綁在一起，她望向你時，眼底沉著只有歸處才有的篤定。",
    "她安靜地偎在你懷裡，呼吸與你的心跳同頻。自那一夜以血為誓，她看你的眼神，便再沒有離開過。"
  ],
  default: [
    "夜色在窗外漫開，{name} 就這麼待在你身旁，{scent}若有似無地撩撥著你的神經。",
    "你與 {name} 之間的空氣微微發燙。她正用一種你讀不透的眼神看著你。"
  ]
};

const BASE_CHOICES = [
  "「過來。」你朝她抬了抬下巴。",
  "「今晚想吃點什麼？」你問她。",
  "伸手托起她的下顎，逼她直視你。",
  "「把外衣脫了。」你低聲。",
  "繞到她身後，指尖擦過她的後頸。",
  "「轉過去。」你淡淡地命令。",
  "湊近她耳畔：「你身上的味道，很好聞。」",
  "牽起她的手腕，輕輕一拉。",
  "「叫我的名字。」",
  "退後一步，等她主動靠過來。",
  "「過來坐下。」你拍了拍身旁的位置。",
  "「說說看，你今晚想要什麼。」"
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
