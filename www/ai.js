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

/* ---------- 前情記憶（上下文連貫） ---------- */
function ensureHistory() {
  if (!S.history || !Array.isArray(S.history)) S.history = [];
  return S.history;
}

function recordTurn(userText, narrative) {
  const h = ensureHistory();
  const u = String(userText || "").trim();
  const a = String(narrative || "").trim();
  if (!a) return;
  h.push({ u, a });
  while (h.length > 8) h.shift();
  for (const e of h) {
    if (e.a.length > 1500) e.a = e.a.slice(0, 1500) + "…";
    if (e.u.length > 400) e.u = e.u.slice(0, 400);
  }
}

/* 把前情拼成一段「前情回顧」文字，塞進系統提示（不要用 assistant 訊息夾帶，免得 AI 模仿純文字忘了 JSON） */
function buildHistoryText() {
  const h = ensureHistory();
  if (!h.length) return "";
  const lines = h.map((e, i) => {
    const u = e.u ? `玩家：「${e.u}」` : "";
    const a = e.a ? `敘事：「${e.a}」` : "";
    return `${i + 1}. ` + [u, a].filter(Boolean).join("　");
  }).join("\n");
  return "\n【前情回顧（這是你先前回合的輸入與你先前寫出的敘事，僅供承接上下文、保持姿勢與動作連貫；它不是輸出範例，無論如何你「只能」輸出一個 JSON 物件）】\n" + lines;
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
        const pres = s.present ? "在身邊" : ("不在" + (s.place ? `（${s.place}）` : ""));
        return `[${s.id}] ${s.name}（${s.raceName}｜${s.personalityName}｜${contract}｜${pres}｜好感${s.affection} 服從${s.obedience} 壓力${s.stress} 飢餓${s.hunger}${def}）`;
      }).join("；")
    : "（名下尚無魅魔）";

  const itemText = ownedItemNames().length ? ownedItemNames().join("、") : "（無）";
  const personaText = m.persona ? m.persona : "（未設定，請自行揣摩主人形象）";

  const dirs = getDirectives();
  const directiveText = dirs.length ? dirs.map((d, i) => `${i + 1}. ${d}`).join("\n") : "（無）";
  const factsText = (S.facts && S.facts.length) ? "\n【玩家已知事實】" + S.facts.join("；") : "";
  const historyText = buildHistoryText();

  return `你是《緋夜飼育錄》的敘事引擎，一款成人向（18+ 氛圍）魅魔飼育文字遊戲的旁白。
你「只能」輸出一個合法的 JSON 物件。回應的第一個字元必須是 {，最後一個字元必須是 }。
不要輸出任何思考過程、解釋或 markdown 程式碼框。JSON 內字串的換行一律用 \n 表示。

【務必精簡】
- 整段回覆盡量短：narrative 2~4 句，choices 2~3 個（每個 25 字內），commands 能省則省。
- 順序固定：narrative → choices → commands。

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
- 環境描述點到為止，比一般寫法再精簡約兩三成。
- 例外：若該角色設定為「沉默寡言」，才可以對白稀少。

【玩家輸入的判讀（重要）】
- 玩家直接輸入的文字，預設是「對話」。
- 若輸入含括號（…），括號內是「動作」。
- 不論是對話、動作、或兩者同時，你都要回應：針對玩家的話給出對白回應，並把動作確實執行、讓場景前進。先後順序不拘。

【人物在場與位置（極重要，務必嚴格遵守）】
${succText}
- 標記為「在身邊」的角色，才可以出現在當前場景、說話、動作。
- 標記為「不在」的角色，絕對不可出現在當前場景、不可說話、不可動作、不可被你一起帶走（除非劇情演出你們重逢）。
- 場景與人物的上下位置要前後連貫：誰在哪裡、誰被留下，都要承接前文，不可讓角色憑空移動或突然出現。
- 若劇情使她離開、被你留下、分頭行動、或重逢，請在 commands 送出：
  {"type":"presence","succubusId":"<上面 [] 內的 id>","present":false,"place":"房裡"}
  （重逢時送 "present":true）

【承接前情（極重要，務必嚴格遵守）】
- 「前情回顧」中最後一則敘事，就是「此刻正在發生的畫面」。你必須嚴格承接它的姿勢、動作與進行中的事，不得與之矛盾、不得無故重置。
- 例：上一則她「跪在你腳邊、把蒼白的手腕伸到你唇前」——那麼這一則開頭，她仍跪著、手腕仍伸著，除非玩家這次輸入明確叫她站起或收手。
- 例：前文是「她把純血的手腕給你吸食」，玩家說「吃吧」——那是繼續飲她的血：寫你低頭含住她的手腕、血的氣味與滋味，而不是憑空端出食物。
- 不要讓角色無緣無故站起、換姿勢、離場，除非有明確的劇情原因，或玩家這次輸入直接促成。

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

【四維如何影響她的態度（務必在對白與舉止中體現）】
- 好感：高 → 親暱、主動、依戀；低 → 疏離、戒備、客套。
- 服從：高 → 順從、聽話、服軟；低 → 頂撞、抗拒、陽奉陰違。
- 壓力：高 → 緊繃、易怒、顫抖、哽咽；低 → 放鬆、慵懶、有餘裕。
- 飢餓：高 → 渙散、渴求、主動索求；低 → 從容、節制。
同一句話，會因這四項高低而有截然不同的語氣與反應。
- 好感低於 55 時，她必須保有防線與距離，不可一見鍾情、不可瞬間順從。

【玩家背包（僅可引用下列道具，嚴禁提及未擁有的器具）】
${itemText}
- 選項或敘事若要動用道具，只能使用上列物品的「名字」，並以隱晦方式描述；嚴禁出現「情趣玩具」等詞。

【玩家主控】
階級：${rank.name}；自訂人設：${personaText}。

【選項規則】
- 生成 2~3 個選項，一律是「對話」或「動作」的短句。
- 不要寫主控的內心感受或情緒描寫，少用「我」。
- 選項要貼合當前情境與她的狀態，避免重複。

【指令】
- commands 可選填：
  {"type":"stat","succubusId":"...","delta":{"affection":0,"obedience":0,"stress":0,"hunger":0}}
  {"type":"item","itemId":"...","succubusId":"..."}
  {"type":"presence","succubusId":"...","present":true/false,"place":"..."}
  {"type":"time","phases":1}　{"type":"gold","amount":0}　{"type":"hp","amount":0}　{"type":"exp","amount":0}
- succubusId 請使用上面 [ ] 內的 id。數值變動幅度宜小（單項 -5 ~ +5）。使用道具時 itemId 必須在上列背包中。

【長期指令（務必長期遵守，直到玩家下指令撤除）】
${directiveText}
${historyText}
${factsText}`;
}

/* ---------- JSON 寬鬆解析 ---------- */
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

/* 純文字救援：AI 偶爾忘了 JSON、直接吐正文時，把正文當敘事用，別整段丟掉 */
function salvagePlainNarrative(t) {
  let s = String(t || "").trim();
  if (!s) return null;
  // 去掉開頭的場景行「── … ──」（遊戲會自己補）
  s = s.replace(/^\s*──[^\n]*?──[ \t]*\n?/, "").trim();
  // 若結尾是「你想怎麼做？」等選項提示，截斷於此
  const cut = s.search(/你想怎麼做|你要怎麼做|接下來怎麼做|你想如何做/);
  if (cut !== -1) s = s.slice(0, cut).trim();
  // 若某行開頭是 A. B. C. D. 選項，截斷於第一個這類行
  const lines = s.split("\n");
  const out = [];
  for (const ln of lines) {
    if (/^[A-Da-d][\.、．]\s/.test(ln.trim())) break;
    out.push(ln);
  }
  s = out.join("\n").trim();
  if (!s) return null;
  return { narrative: s, choices: [], commands: [] };
}

function parseAIJson(text) {
  if (!text) return null;
  const t = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const objText = extractJsonObj(t) || t;

  try { const j = JSON.parse(objText); if (j && (j.narrative || (Array.isArray(j.choices) && j.choices.length))) return j; } catch (_) {}
  try { const j = JSON.parse(escapeCtrlInStrings(objText)); if (j && (j.narrative || (Array.isArray(j.choices) && j.choices.length))) return j; } catch (_) {}

  const partial = salvagePartial(t);
  if (partial) return partial;
  return salvagePlainNarrative(t);
}

/* ---------- 呼叫外部 AI ---------- */
function finishTurn(userText, result) {
  if (result && typeof result.narrative === "string") recordTurn(userText, result.narrative);
  return result;
}

async function callStoryAI(userText) {
  const cfg = getApiSettings();

  if (!cfg.url || !cfg.key) {
    aiDiag("尚未設定 API（缺 Key 或 URL），改用離線模式。");
    return finishTurn(userText, mockNarrativeResponse(userText));
  }

  const url = normalizeApiUrl(cfg.url);
  const messages = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: userText }
  ];

  let res;
  try {
    res = await sendChat(url, cfg, messages);
  } catch (e) {
    aiDiag("連線失敗（網路或跨域）：" + (e && e.message ? e.message : e));
    return finishTurn(userText, mockNarrativeResponse(userText));
  }

  if (!res.ok) {
    let t = "";
    try { t = await res.text(); } catch (_) {}
    aiDiag(`回應錯誤 ${res.status}（${url}）：${(t || "").slice(0, 140)}`);
    return finishTurn(userText, mockNarrativeResponse(userText));
  }

  let data;
  try { data = await res.json(); }
  catch (e) { aiDiag("回應不是 JSON。"); return finishTurn(userText, mockNarrativeResponse(userText)); }

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
    return finishTurn(userText, parsed);
  }

  const rawC = String(content || "").trim();
  let info = "AI 回覆無法解析";
  if (finish) info += `（finish=${finish}）`;
  info += rawC ? "：" + rawC.slice(0, 200) : "：正文為空";
  if (!rawC && think) info += `（只有思考內容，請確認已關閉思考）`;
  aiDiag(info);
  return finishTurn(userText, mockNarrativeResponse(userText));
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
  else if (!suc.present) scene = "absent";
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

/* 購買後：從契約所把她帶離，時間對齊當前遊戲時間 */
function purchaseReaction(suc) {
  const where = (suc && suc.origin === "blackmarket") ? "燈紅暗巷・黑市" : "高塔區・契約廳";
  const head = `── 第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]} · ${where} ──`;
  const body = fill(
    "契約落定，{name} 被契約所的人領到你面前，規規矩矩地站定，微微垂著眼。\n" +
    "你把她的契約收進懷裡，牽起她，一步步走出契約所——從今往後，她便跟著你了。\n" +
    "{name}：（低聲）「……主人。」",
    suc
  );
  recordTurn("（契約成立，你帶她離開契約所）", head + "\n" + body);
  return { narrative: head + "\n" + body, choices: buildMockChoices(suc), commands: [] };
}
