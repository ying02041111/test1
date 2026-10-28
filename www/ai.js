/* ============================================================
   《緋夜飼育錄》AI 與保底敘事 ai.js
   ============================================================ */

const API_SETTINGS_KEY = "ck_api_settings_v1";
const DIRECTIVES_KEY = "ck_directives_v1";
const API_DEFAULTS = { key: "", url: "", model: "", thinking: false, reasoningEffort: "high", temperature: 0.9, topP: 1.0, showTokens: true };

function getApiSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(API_SETTINGS_KEY) || "{}");
    return Object.assign({}, API_DEFAULTS, s);
  } catch (e) {
    return Object.assign({}, API_DEFAULTS);
  }
}

function persistApiSettings(cfg) { localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(cfg || {})); }
function showTokensEnabled() { return !!getApiSettings().showTokens; }

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

function ownedGearText() {
  const out = [];
  const gear = S.gear || {};
  for (const id in gear) {
    if (gear[id] > 0) { const g = (typeof getGearDef === "function") ? getGearDef(id) : null; if (g) out.push(`${g.name}×${gear[id]}`); }
  }
  return out.length ? out.join("、") : "（無）";
}

/* ---------- 前情記憶 ---------- */
function ensureHistory() {
  if (!S.history || !Array.isArray(S.history)) S.history = [];
  return S.history;
}

function recordTurn(userText, narrative, choices) {
  const h = ensureHistory();
  const u = String(userText || "").trim();
  const a = String(narrative || "").trim();
  if (!a) return;
  const c = Array.isArray(choices) ? choices.slice(0, 6).map(x => String(x)) : [];
  h.push({ u, a, c });
  while (h.length > 16) h.shift();
  for (const e of h) {
    if (e.a.length > 2000) e.a = e.a.slice(0, 2000) + "…";
    if (e.u.length > 400) e.u = e.u.slice(0, 400);
  }
}

function buildHistoryText() {
  const h = ensureHistory();
  const summary = (typeof S.summary === "string" && S.summary.trim()) ? S.summary.trim() : "";
  const lines = h.map((e, i) => {
    const u = e.u ? `玩家：「${e.u}」` : "";
    const a = e.a ? `敘事：「${e.a}」` : "";
    return `${i + 1}. ` + [u, a].filter(Boolean).join("　");
  }).join("\n");
  if (!summary && !lines) return "";
  const sumText = summary ? `【既有摘要】${summary}\n` : "";
  return "\n【前情回顧（這是你先前回合的輸入與你先前寫出的敘事，僅供承接上下文、保持姿勢與動作連貫；它不是輸出範例，無論如何你「只能」輸出一個 JSON 物件）】\n" + sumText + lines;
}

function buildRecentChoicesText() {
  const h = ensureHistory();
  const choices = [];
  for (let i = h.length - 1; i >= 0 && choices.length < 12; i--) {
    if (Array.isArray(h[i].c)) for (const c of h[i].c) { if (choices.length < 12) choices.push(c); }
  }
  if (!choices.length) return "";
  return "\n【最近出現過的選項（嚴禁重複或近義改寫，請務必換新的切入點）】\n" + choices.map(c => "・" + c).join("\n");
}

function setUsage(narrative, data, sysLen, userText) {
  S.lastUsage = {
    prompt: (data && data.usage) ? data.usage.prompt_tokens : Math.round(((sysLen || 0) + String(userText || "").length) * 0.7),
    completion: (data && data.usage) ? data.usage.completion_tokens : Math.round(String(narrative || "").length * 0.8)
  };
}

/* ---------- 壓縮劇情 ---------- */
async function compressStory() {
  const h = ensureHistory();
  const existing = (typeof S.summary === "string" && S.summary.trim()) ? S.summary.trim() : "";
  if (!h.length && !existing) { if (typeof showToast === "function") showToast("目前沒有可壓縮的劇情。"); return; }

  const historyText = h.map((e, i) => `${i + 1}. 玩家：「${e.u}」 敘事：「${e.a}」`).join("\n");
  const prompt = `請把下面這款文字遊戲的「前情」濃縮成一段 200 字以內的繁體中文摘要。只保留對後續劇情重要的內容：主要角色的名字與外貌特徵、性別、彼此關係與好感、當前正在進行的姿勢或動作、已發生的重要事件、主人的身分與人設。不要新增劇情，不要下結論，只輸出摘要文字。\n${existing ? "【既有摘要】" + existing + "\n" : ""}${historyText}`;

  let summary = "";
  const cfg = getApiSettings();
  if (cfg.url && cfg.key) {
    try {
      const url = normalizeApiUrl(cfg.url);
      const res = await sendChat(url, cfg, [
        { role: "system", content: "你是文字遊戲的劇情摘要助手，只輸出摘要文字，不要 JSON、不要解釋。" },
        { role: "user", content: prompt }
      ], 600);
      if (res.ok) {
        const data = await res.json();
        const choice = data && data.choices && data.choices[0];
        const msg = choice && choice.message;
        summary = (msg && (msg.content || msg.reasoning_content || "")) || "";
      }
    } catch (e) {}
  }

  if (!summary || !summary.trim()) {
    summary = h.slice(-4).map(e => e.a).join(" ").slice(0, 240);
  }

  S.summary = String(summary).trim().slice(0, 400);
  while (h.length > 2) h.shift();

  if (typeof saveGame === "function") saveGame();
  if (typeof appendStoryMessage === "function") appendStoryMessage("system", "［壓縮完成］前情已濃縮為摘要，後續 token 用量將大幅下降。");
  if (typeof renderAll === "function") renderAll();
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
        const bg = s.background ? `｜來歷:${s.background}` : "";
        const g = (typeof succubusGrade === "function") ? succubusGrade(s) : { grade: "?", name: "" };
        const speech = s.speechStyle || (((PERSONALITIES || []).find(p => p.id === s.personality) || {}).speech || "");
        const food = s.foodDesc || s.raceDesc || "";
        const gender = s.gender === "男" ? "男" : "女";
        const facets = (s.facets && s.facets.length) ? `｜側寫:${s.facets.join("；")}` : "";
        const gearNames = [];
        if (s.collar && typeof getGearDef === "function") { const c = getGearDef(s.collar); if (c) gearNames.push(c.name); }
        if (s.leash && typeof getGearDef === "function") { const l = getGearDef(s.leash); if (l) gearNames.push(l.name); }
        const gearText = gearNames.length ? `｜配戴:${gearNames.join("、")}` : "";
        return `[${s.id}] ${s.name}（${gender}·${s.raceName}｜${s.personalityName}｜${g.grade}級·${g.name}｜${contract}｜${pres}${bg}${facets}｜好感${s.affection} 服從${s.obedience} 魅惑${s.charm || 0} 體能${s.stamina || 0} 壓力${s.stress} 飢餓${s.hunger}${def}${gearText}）\n　　食性：${food}\n　　外貌：${s.appearance}\n　　氣味：${s.scent}\n　　個性：${s.personalityDesc}\n　　說話風格（必須前後一致）：${speech}`;
      }).join("\n")
    : "（名下尚無魅魔）";

  const itemText = ownedItemNames().length ? ownedItemNames().join("、") : "（無）";
  const gearText = ownedGearText();
  const personaText = m.persona ? m.persona : "（未設定，請自行揣摩主人形象）";

  const modeText = S.dayMode === "rest" ? "休息日" : "訓練日";
  const partyNames = (S.party || []).map(id => { const s = getSuccubus(id); return s ? s.name : ""; }).filter(Boolean);
  const partyText = S.dayMode === "rest" ? (partyNames.length ? `今天你帶了：${partyNames.join("、")}。` : "今天你獨自出門，沒有帶任何魅魔。") : "";

  const dirs = getDirectives();
  const directiveText = dirs.length ? dirs.map((d, i) => `${i + 1}. ${d}`).join("\n") : "（無）";
  const factsText = (S.facts && S.facts.length) ? "\n【玩家已知事實】" + S.facts.join("；") : "";
  const historyText = buildHistoryText();
  const recentChoicesText = buildRecentChoicesText();

  return `你是《緋夜飼育錄》的敘事引擎，一款成人向（18+ 氛圍）魅魔飼育文字遊戲的旁白。
你「只能」輸出一個合法的 JSON 物件。回應的第一個字元必須是 {，最後一個字元必須是 }。
不要輸出任何思考過程、解釋或 markdown 程式碼框。JSON 內字串的換行一律用 \n 表示。

【輸出格式】
{"narrative":"…","choices":["…","…"],"commands":[]}
順序固定：narrative → choices → commands。

【篇幅】
- narrative 約 4~8 句（可到 400 字），把前因後果寫清楚，讓場景推進合理。
- choices 3~4 個（每個 30 字內）。

【落筆前自檢（務必執行）】
輸出 JSON 前，先在心裡確認：①時間／地點是否延續上一則？②他（她）此刻的姿勢、動作、衣物狀態是否承接前情？③反應是否符合當前六維與人設？④選項是否與「最近出現過的選項」重複？確認無誤再輸出。

【時間與地點】
當前時間：${nowText}；地點：${locName}。
- 敘事開頭用一行場景（時間·地點），必須與上列完全一致。

【今日模式（務必遵守）】
今天是${modeText}。${partyText}
- 訓練日：以調教、訓練、規矩養成為主，穿插日常對話與生活瑣事。訓練的動作維持「細緻」描寫（逐擊、逐動、逐階段）。
- 休息日：不進行調教訓練；以出門、逛街、旅遊、約會、休閒為主。外出的移動、逛街、採買等日常動作用「大節拍」推進（約粗兩成，別拆成瑣碎小動作）。
- 只有你「帶了」的魅魔才在身邊；其餘留在家，不可憑空出現在外頭。

【邏輯連貫（極重要）】
- 事件要有因果：每個反應都要能從「前情」與「狀態」推導出來，不可天外飛來一筆。
- 場景要有進退：不要一句話就跳到無關的新場景。
- 承接前情回顧中最後一則敘事的姿勢與動作，除非玩家輸入明確改變它。

【文風與生理描寫】
- 感官化、文學化、露骨暗示但不粗俗，不寫直白的生殖器名詞。
- 以第二人稱「你」展開。對白標註說話者與語氣：名字：（語氣）「對白」。
- 多寫「生理反應」：呼吸紊亂、體溫與顫抖、皮膚泛紅或起雞皮疙瘩、眼淚與汗、肌肉緊繃與發軟、吞嚥與喉音、指尖蜷曲、腰腹收縮、濕潤發燙等，讓身體替角色說話。
- 「環境」與「氣味」的描寫要節制：環境點到為止即可；氣味偶爾（例如貼近、親密時）一句帶過就好，不要每回都提。

【玩家輸入的判讀】
- 玩家直接輸入的文字，預設是「對話」；若含括號（…），括號內是「動作」。
- 不論是對話、動作或兩者，都要回應：給出對白回應，並把動作確實執行、讓場景前進。

【角色資料與一致性（防 OOC）】
${succText}
- 外貌、氣味、個性、說話風格、食性、性別皆為固定設定，務必前後一致。
- 男性魅魔一律用「他」、女性用「她」，稱呼你為「主人」。
- 食性會影響行為：純血渴求你的體液、狐魅嗜甜討食、夢魘需你陪睡。餵食時依食性來演。
- 等級（S~F）反映身價與歷練：越高越從容，越低越生澀。

【性格立體感（重要，勿卡單一標籤）】
- 每個角色的「側寫」是藏在表面下的另一面（軟肋、小習慣、矛盾）。請在互動中「偶爾」流露，讓角色有層次。
- 不要每句都往同一個梗靠（例如不要一直重複「怕被丟掉」）；讓角色有時倔強、有時柔軟、有時反差。

【六維如何「實際」體現（極重要，不可只在語氣上）】
- 好感 affection（0–200）：0–49 疏離戒備；50–99 放下戒心；100–159 明顯親暱、主動靠近；160–200 深情依戀。好感 <55 時必守防線。
- 服從 obedience（0–200）：0–49 桀驁不遜、陽奉陰違；50–99 嘴上不服、半推半就；100–159 多半聽話，會耍嘴皮子但最後照做；160–200 乖巧順從、主動聽命。→ 高服從時即使嘴上嘟囔，行動也必須「照做」；低服從時要有違抗、拖延。
- 魅惑 charm（0–200）：0–49 生澀；50–99 偶爾勾人；100–159 媚意成形；160–200 一眼奪魂。
- 體能 stamina（0–200）：0–49 孱弱易喘；50–99 勉強；100–159 耐力不錯；160–200 精力旺盛、久戰不潰。
- 壓力 stress（0–100）：0–29 放鬆；30–59 微緊繃；60–79 明顯緊繃易怒；80–100 瀕臨崩潰。
- 飢餓 hunger（0–100）：0–29 飽足從容；30–59 微餓；60–79 明顯渴求；80–100 渙散、主動索求。

【訓練的結算（極重要）】
- 「一整套動作」＝有明確起訖的調教流程（如「鞭打 10 下」「完整綁縛一輪」「連續服從 5 道指令」）。
- 進行中的每一擊、每個小動作，都不給服從，只描寫反應。
- 整套完成時，才送一次 train 指令：服從 +10~30（輕 10~15／中 16~23／重 24~30），並依難度附帶 exp（5~25）與 hp（-3~-12）。
- 範例：{"type":"train","succubusId":"<id>","obedience":20,"stress":10,"stamina":-4,"exp":14,"hp":-6}
- 運動／體能訓練（跑步、拉伸、體操）也算一套動作，完成後體能 stamina +10~30（用 train 的 stamina 欄）。
- 不要用 stat 改服從；服從一律用 train。休息日不可發送 train。

【時間推進（重要）】
- 完成一整套較重的行動（一輪調教、一次出門、長談、親密）→ 推 1 個時段。
- 小睡／短暫休息：可推 1 個時段、回少量體力（hp +5~8），但「不可跨夜」——除非當下已是深夜，否則不要讓時間進入隔天。
- 過夜（睡到隔天早晨）才跨日。

【主控體力消耗】
- 完成一整套行動會消耗主控體力：出門購物／奔波 hp -2~5；劇烈或長途 -6~10；一整套調教見 train 的 hp。
- 體力低於 30 時，描寫你的疲態（喘息、手抖），進展也會變慢。

【魅惑的提升管道】
- 魅惑靠「撩撥、親密、情慾沉淪」類互動上升，或用魅惑類道具（魅惑濃縮原液、舊城迷香、凝神香薰油）。
- 這類情境可在 train 帶 charm（+3~8），或用 stat 給 charm（+3~10）。

【支線與零工】
- 休息日出門時，可隨機觸發支線事件（市場奇遇、迷路的旅人、神秘委託等）。
- 玩家可打零工賺外快（跑腿、看店、搬運、護送）。完成一次零工，用指令結算：{"type":"gold","amount":8~25}、{"type":"hp","amount":-2~-5}、{"type":"exp","amount":3~8}。

【人物在場與位置（極重要，務必嚴格遵守）】
- 標記為「在身邊」的角色，才可以出現在當前場景、說話、動作。
- 標記為「不在」的角色，絕對不可出現在當前場景、不可說話、不可動作、不可被你一起帶走（除非劇情演出你們重逢）。
- 若劇情使角色離開、被留下、分頭行動、或重逢，請在 commands 送出：
  {"type":"presence","succubusId":"<上面 [] 內的 id>","present":false,"place":"房裡"}
  （重逢時送 "present":true）

【承接前情（極重要，務必嚴格遵守）】
- 「前情回顧」中最後一則敘事，就是「此刻正在發生的畫面」。必須嚴格承接姿勢、動作與進行中的事，不得無故重置。
- 例：上一則他（她）「跪在你腳邊、把蒼白的手腕伸到你唇前」——這一則開頭仍維持原狀，除非玩家輸入明確改變。
- 例：前文是「把手腕給你吸食」，玩家說「吃吧」——那是繼續飲血，而不是憑空端出食物。

【寫作範例（僅格式參考，勿照抄內容）】
── 第 9 日 · 午後 · 霓虹港 ──
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

【玩家背包（僅可引用下列道具，嚴禁提及未擁有的器具）】
${itemText}
- 選項或敘事若要動用道具，只能使用上列物品的「名字」，並以隱晦方式描述；嚴禁出現「情趣玩具」等詞。

【項圈與牽引繩（未配戴、放在包裡的）】
${gearText}
- 已配戴的配件列在角色資料的「配戴」欄；若繫著項圈／牽繩，可被你牽著同行。
- 不可擅自讓角色戴上未購入或未配戴的配件。

【玩家主控】
階級：${rank.name}；自訂人設：${personaText}。

【選項規則】
- 生成 3~4 個選項，一律是「對話」或「動作」的短句。
- 不可與「最近出現過的選項」重複或近義改寫；每回合換新的切入點。
- 貼合當前情境與狀態，兼顧不同走向（溫柔／強硬／挑逗／生活）。

【指令】
- commands 可選填：
  {"type":"train","succubusId":"...","obedience":10~30,"charm":0,"stamina":0,"stress":0,"hunger":0,"exp":5~25,"hp":-3~-12}
  {"type":"stat","succubusId":"...","delta":{"affection":0,"charm":0,"stamina":0,"stress":0,"hunger":0}}　（stat 不應改服從）
  {"type":"item","itemId":"...","succubusId":"..."}
  {"type":"feed","succubusId":"..."}　（吃飽了 → 飢餓歸零）
  {"type":"presence","succubusId":"...","present":true/false,"place":"..."}
  {"type":"time","phases":1}　{"type":"gold","amount":0}　{"type":"hp","amount":0}　{"type":"exp","amount":0}
- succubusId 請使用上面 [ ] 內的 id。數值變動幅度宜小。使用道具時 itemId 必須在上列背包中。
- 只要劇情演出吃飽、飽足、飲血止飢，就送 feed 指令讓飢餓歸零。

【長期指令（務必長期遵守，直到玩家下指令撤除）】
${directiveText}
${historyText}
${recentChoicesText}
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

function salvagePlainNarrative(t) {
  let s = String(t || "").trim();
  if (!s) return null;
  s = s.replace(/^\s*──[^\n]*?──[ \t]*\n?/, "").trim();
  const cut = s.search(/你想怎麼做|你要怎麼做|接下來怎麼做|你想如何做/);
  if (cut !== -1) s = s.slice(0, cut).trim();
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
  if (result && typeof result.narrative === "string") recordTurn(userText, result.narrative, result.choices);
  return result;
}

async function callStoryAI(userText) {
  const cfg = getApiSettings();
  const sysContent = buildSystemPrompt();

  if (!cfg.url || !cfg.key) {
    aiDiag("尚未設定 API（缺 Key 或 URL），改用離線模式。");
    const r = mockNarrativeResponse(userText);
    setUsage(r.narrative, null, sysContent.length, userText);
    return finishTurn(userText, r);
  }

  const url = normalizeApiUrl(cfg.url);
  const messages = [
    { role: "system", content: sysContent },
    { role: "user", content: userText }
  ];

  let res;
  try {
    res = await sendChat(url, cfg, messages, 2000);
  } catch (e) {
    aiDiag("連線失敗（網路或跨域）：" + (e && e.message ? e.message : e));
    const r = mockNarrativeResponse(userText);
    setUsage(r.narrative, null, sysContent.length, userText);
    return finishTurn(userText, r);
  }

  if (!res.ok) {
    let t = "";
    try { t = await res.text(); } catch (_) {}
    aiDiag(`回應錯誤 ${res.status}（${url}）：${(t || "").slice(0, 140)}`);
    const r = mockNarrativeResponse(userText);
    setUsage(r.narrative, null, sysContent.length, userText);
    return finishTurn(userText, r);
  }

  let data;
  try { data = await res.json(); }
  catch (e) {
    aiDiag("回應不是 JSON。");
    const r = mockNarrativeResponse(userText);
    setUsage(r.narrative, null, sysContent.length, userText);
    return finishTurn(userText, r);
  }

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
    setUsage(parsed.narrative, data, sysContent.length, userText);
    return finishTurn(userText, parsed);
  }

  const rawC = String(content || "").trim();
  let info = "AI 回覆無法解析";
  if (finish) info += `（finish=${finish}）`;
  info += rawC ? "：" + rawC.slice(0, 200) : "：正文為空";
  if (!rawC && think) info += `（只有思考內容，請確認已關閉思考）`;
  aiDiag(info);
  const r = mockNarrativeResponse(userText);
  setUsage(r.narrative, null, sysContent.length, userText);
  return finishTurn(userText, r);
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
    "尾巴無精打采地垂著。\n{name}：（帶著鼻音）「你身上的味道……好香。」"
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
    "{name} 仰起臉看你。\n{name}：（笑）「今天想我了嗎？」"
  ],
  permanent: [
    "頸間的契約痕隱隱發燙。\n{name}：（篤定）「我一直都在。」",
    "{name} 安靜地偎在你懷裡。\n{name}：（低語）「別走。」"
  ],
  default: [
    "{name} 待在你身旁。\n{name}：（看著你）「怎麼了？」",
    "你與 {name} 之間的距離很近。\n{name}：（輕聲）「說吧。」"
  ]
};

const BASE_CHOICES = [
  "「過來。」你朝他（她）抬了抬下巴。",
  "「今晚想吃點什麼？」你問。",
  "伸手托起下顎，逼直視你。",
  "「把外衣脫了。」你低聲。",
  "繞到身後，指尖擦過後頸。",
  "「轉過去。」你淡淡地命令。",
  "湊近耳畔：「你身上的味道，很好聞。」",
  "牽起手腕，輕輕一拉。",
  "「叫我的名字。」",
  "退後一步，等主動靠過來。",
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

/* 購買後：從契約所把角色帶離 */
function purchaseReaction(suc) {
  const where = (suc && suc.origin === "blackmarket") ? "燈紅暗巷・黑市" : "高塔區・契約廳";
  const head = `── 第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]} · ${where} ──`;
  const body = fill(
    "契約落定，{name} 被契約所的人領到你面前，規規矩矩地站定，微微垂著眼。\n" +
    "你把契約收進懷裡，牽起他（她），一步步走出契約所——從今往後，他便跟著你了。\n" +
    "{name}：（低聲）「……主人。」",
    suc
  );
  recordTurn("（契約成立，你帶他離開契約所）", head + "\n" + body, buildMockChoices(suc));
  return { narrative: head + "\n" + body, choices: buildMockChoices(suc), commands: [] };
}
