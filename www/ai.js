/* ============================================================
   《緋夜飼育錄》AI 與保底敘事 ai.js
   ============================================================ */

const API_SETTINGS_KEY = "ck_api_settings_v1";
const DIRECTIVES_KEY = "ck_directives_v1";
const API_DEFAULTS = { key: "", url: "", model: "", thinking: false, reasoningEffort: "high", temperature: 0.9, topP: 1.0 };

function getApiSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(API_SETTINGS_KEY) || "{}");
    return Object.assign({}, API_DEFAULTS, s);
  } catch (e) {
    return Object.assign({}, API_DEFAULTS);
  }
}

function persistApiSettings(cfg) { localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(cfg || {})); }

/* 長期指令（ps. 指令） */
function getDirectives() {
  try { return JSON.parse(localStorage.getItem(DIRECTIVES_KEY) || "[]"); }
  catch (e) { return []; }
}
function setDirectives(arr) { localStorage.setItem(DIRECTIVES_KEY, JSON.stringify(arr || [])); }

function normalizeApiUrl(url) {
  let u = String(url || "").trim();
  if (!u) return "";
  u = u.replace(/\/+$/, "");
  if (/chat\/completions/i.test(u)) return u;
  return u + "/chat/completions";
}

function toNum(v, d) { const n = parseFloat(v); return isNaN(n) ? d : n; }

function aiDiag(msg) {
  const full = "［AI］" + msg;
  try {
    if (typeof appendStoryMessage === "function") appendStoryMessage("system", full);
    else if (typeof pushLog === "function") pushLog("system", full);
  } catch (_) {}
}

/* 送出：thinking 直接放 body（等同 SDK 的 extra_body）；不支援就自動拿掉重試 */
async function sendChat(url, cfg, messages, maxTokens) {
  const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key };
  const on = !!cfg.thinking;

  const base = {
    model: cfg.model || "gpt-4o-mini",
    temperature: toNum(cfg.temperature, 0.9),
    top_p: toNum(cfg.topP, 1.0),
    messages: messages
  };
  if (maxTokens) base.max_tokens = maxTokens;

  const body = Object.assign({}, base, { thinking: { type: on ? "enabled" : "disabled" } });
  if (on) body.reasoning_effort = cfg.reasoningEffort || "high";

  let res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const res2 = await fetch(url, { method: "POST", headers, body: JSON.stringify(base) });
    if (res2.ok || res2.status !== res.status) return res2;
  }
  return res;
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

  const dirs = getDirectives();
  const directiveText = dirs.length ? dirs.map((d, i) => `${i + 1}. ${d}`).join("\n") : "（無）";
  const factsText = (S.facts && S.facts.length) ? "\n【玩家已知事實】" + S.facts.join("；") : "";

  return `你是《緋夜飼育錄》的敘事引擎，一款成人向（18+ 氛圍）魅魔飼育文字遊戲的旁白。
你「只能」輸出一個合法的 JSON 物件。回應的第一個字元必須是 {，最後一個字元必須是 }。
不要輸出任何思考過程、解釋或 markdown 程式碼框。JSON 內字串的換行一律用 \n 表示。

【務必精簡】
- 整段回覆盡量短：narrative 2~4 句，choices 2~3 個（每個 25 字內），commands 能省則省。
- 順序固定：narrative → choices → commands，確保篇幅有限時敘事與選項也能寫完。

【輸出格式】
{"narrative":"…","choices":["…","…"],"commands":[]}

【時間與地點】
當前時間：${nowText}；地點：${locName}。
- 敘事開頭用一行場景（時間·地點），必須與上列完全一致。

【文風】
- 感官化、文學化、露骨暗示但絕不粗俗，不寫直白的生殖器名詞。
- 以第二人稱「你」展開。
- 對白要標註說話者與語氣：名字：（語氣）「對白」，例如 緋音：（小聲）「……嗯。」
- 親密場景可寫肌膚、體溫、氣味、顫抖、壓抑的喘息。

【對話與環境的比例（重要）】
- 以「對白」為骨幹：讓角色多說話、多互動，對白要佔敘事的主要篇幅。
- 環境描述點到為止即可，比一般寫法再精簡約兩三成，不要長篇寫景。
- 例外：若該角色設定為「沉默寡言」，才可以對白稀少、改以動作與氛圍為主。

【玩家輸入的判讀（重要）】
- 玩家直接輸入的文字，預設是「對話」（角色在對你說話）。
- 若輸入含括號（…），括號內是「動作」。
- 不論是對話、動作、或兩者同時，你都要回應：針對玩家的話給出對白回應，並把動作確實執行、讓場景前進（例如「走吧（前往市集）」→ 要回應那句話，並讓場景真的移動到市集）。先後順序不拘。

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
當前風格氣質：${style.name}——${style.desc}。讓語氣貼合，但文中與選項中不得出現「${style.name}」或「風格」等字眼。

【魅魔現況】
${succText}
- 好感低於 55 時，她必須保有防線與距離，不可一見鍾情、不可瞬間順從。
- 四維（好感/服從/壓力/飢餓）都要在劇情中有所體現。

【玩家背包（僅可引用下列道具，嚴禁提及未擁有的器具）】
${itemText}
- 選項或敘事若要動用道具，只能使用上列物品的「名字」，並以隱晦方式描述；嚴禁出現「情趣玩具」等詞。

【玩家主控】
階級：${rank.name}；自訂人設：${personaText}。

【選項規則】
- 生成 2~3 個選項，一律是「對話」或「動作」的短句。
- 不要寫主控的內心感受或情緒描寫，少用「我」。
- 選項要貼合當前情境，避免重複。

【指令】
- commands 可選填：{"type":"stat","succubusId":"...","delta":{"affection":0,"obedience":0,"stress":0,"hunger":0}}、{"type":"item","itemId":"...","succubusId":"..."}、{"type":"time","phases":1}、{"type":"gold","amount":0}、{"type":"hp","amount":0}、{"type":"exp","amount":0}。
- 數值變動幅度宜小（單項 -5 ~ +5）。使用道具時 itemId 必須在上列背包中。

【長期指令（務必長期遵守，直到玩家下指令撤除）】
${directiveText}
${factsText}`;
}

/* ---------- JSON 寬鬆解析（含截斷修補） ---------- */
function extractJsonObj(t) {
  const start = t.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const ch = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) return t.slice(start, i + 1); }
    }
  }
  return null;
}

function escapeCtrlInStrings(raw) {
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (inStr) {
      if (esc) { out += ch; esc = false; continue; }
      if (ch === "\\") { out += ch; esc = true; continue; }
      if (ch === '"') { out += ch; inStr = false; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
    } else {
      if (ch === '"') inStr = true;
      out += ch;
    }
  }
  return out;
}

function salvagePartial(t) {
  const nm = t.match(/"narrative"\s*:\s*"([\s\S]*)/);
  if (!nm) return null;
  const raw = nm[1];
  let out = "", esc = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (esc) {
      if (ch === "n") out += "\n";
      else if (ch === "r") out += "\r";
      else if (ch === "t") out += "\t";
      else if (ch === '"') out += '"';
      else if (ch === "\\") out += "\\";
      else out += ch;
      esc = false;
      continue;
    }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') break;
    out += ch;
  }
  out = out.replace(/\s+$/, "");
  if (!out) return null;

  let choices = [];
  const cm = t.match(/"choices"\s*:\s*\[([\s\S]*)/);
  if (cm) {
    const arr = cm[1].match(/"((?:[^"\\]|\\.)*)"/g);
    if (arr) {
      choices = arr.map(s => s.slice(1, -1)
        .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
        .replace(/\\"/g, '"').replace(/\\\\/g, "\\")).filter(Boolean);
    }
  }
  return { narrative: out, choices: choices, commands: [] };
}

function parseAIJson(text) {
  if (!text) return null;
  const t = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const objText = extractJsonObj(t) || t;

  try { const j = JSON.parse(objText); if (j && (j.narrative || (Array.isArray(j.choices) && j.choices.length))) return j; } catch (_) {}
  try { const j = JSON.parse(escapeCtrlInStrings(objText)); if (j && (j.narrative || (Array.isArray(j.choices) && j.choices.length))) return j; } catch (_) {}

  return salvagePartial(t);
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
    res = await sendChat(url, cfg, [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userText }
    ]);
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

  const choice = data && data.choices && data.choices[0];
  const msg = choice && choice.message;
  const content = msg ? (msg.content || "") : "";
  const think = msg ? (msg.reasoning_content || msg.reasoning || "") : "";
  const finish = choice ? choice.finish_reason : "";

  let parsed = parseAIJson(content);
  if (!parsed && !String(content).trim() && think) parsed = parseAIJson(think);

  if (parsed) {
    if (!Array.isArray(parsed.choices) || !parsed.choices.length) {
      parsed.choices = buildMockChoices(currentSuccubus());
    }
    return parsed;
  }

  const rawC = String(content || "").trim();
  let info = "AI 回覆無法解析";
  if (finish) info += `（finish=${finish}）`;
  info += rawC ? "：" + rawC.slice(0, 200) : "：正文為空";
  if (!rawC && think) info += `（只有思考內容，請確認已關閉思考）`;
  aiDiag(info);
  return mockNarrativeResponse(userText);
}

/* ---------- 連線測試 ---------- */
async function testApiConnection() {
  const cfg = getApiSettings();
  if (!cfg.url || !cfg.key) return { ok: false, msg: "請先填妥 API Key 與 URL。" };
  const url = normalizeApiUrl(cfg.url);
  try {
    const res = await sendChat(url, cfg, [{ role: "user", content: "ping" }], 1);
    if (res.ok) return { ok: true, msg: "連線成功，夜路已通（" + url + "）。" };

    const txt = await res.text();
    let hint = "";
    if (res.status === 404) hint = "（404＝找不到端點：URL 路徑不對）";
    else if (res.status === 401) hint = "（401＝API Key 無效或未授權）";
    else if (res.status === 429) hint = "（429＝請求太頻繁或額度不足）";
    else if (res.status === 400) hint = "（400＝模型名稱或參數有誤）";
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
    "{name} 偎在你腳邊，腹部傳出一聲細響。\n{name}：（抬眼）「主人……我餓了。」",
    "她的尾巴無精打采地垂著。\n{name}：（帶著鼻音）「你身上的味道……好香。」"
  ],
  stressHigh: [
    "{name} 的肩膀繃得像張滿的弓。\n{name}：（別開臉）「……我沒事。」",
    "{name} 縮了縮肩，指尖絞在一起。\n{name}：（低聲）「……別過來。」"
  ],
  guarded: [
    "{name} 與你隔著一步的距離。\n{name}：（抬眼）「有什麼事？」",
    "{name} 沒靠近，只拿那雙眼睛冷冷地望你。\n{name}：「……」"
  ],
  intimate: [
    "{name} 蹭進你的掌心。\n{name}：（輕聲）「你回來了。」",
    "她仰起臉看你。\n{name}：（笑）「今天想我了嗎？」"
  ],
  permanent: [
    "她頸間的契約痕隱隱發燙。\n{name}：（篤定）「我一直都在。」",
    "她安靜地偎在你懷裡。\n{name}：（低語）「別走。」"
  ],
  default: [
    "{name} 待在你身旁。\n{name}：（看著你）「怎麼了？」",
    "你與 {name} 之間的距離很近。\n{name}：（輕聲）「說吧。」"
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
