/* ============================================================
   《緋夜飼育錄》AI 與保底敘事 ai.js
   ============================================================ */

const API_SETTINGS_KEY = "ck_api_settings_v1";
const API_DEFAULTS = { key: "", url: "", model: "", thinking: false, reasoningEffort: "high", temperature: 0.9, topP: 1.0, showTokens: true };

function getApiSettings() {
  try { return Object.assign({}, API_DEFAULTS, JSON.parse(localStorage.getItem(API_SETTINGS_KEY) || "{}")); }
  catch (e) { return Object.assign({}, API_DEFAULTS); }
}

function normalizeApiUrl(url) {
  let u = String(url || "").trim().replace(/\/+$/, "");
  return /chat\/completions/i.test(u) ? u : u + "/chat/completions";
}

async function sendChat(url, cfg, messages, maxTokens) {
  const headers = { "Content-Type": "application/json", "Authorization": "Bearer " + cfg.key };
  const base = { model: cfg.model || "deepseek-chat", temperature: 0.9, top_p: 1.0, messages };
  if (maxTokens) base.max_tokens = maxTokens;
  return await fetch(url, { method: "POST", headers, body: JSON.stringify(base) });
}

function buildSystemPrompt() {
  const m = S.master;
  const rank = getRank(m.rank);
  const district = getDistrict(S.currentDistrictId);
  const house = getHouse(S.currentHouseId);
  const locName = (district ? district.name : "緋夜") + (house ? "・" + house.name : "");
  const nowText = `第 ${S.day} 日 · ${SUBPHASE_NAMES[S.subPhase]}`;

  const succText = S.succubi.length
    ? S.succubi.map(s => {
        const pDef = getPersonalityDef(s.personality);
        return `[${s.id}] ${s.name}（${s.gender||"女"}·${s.raceName}｜性格:${s.personalityName}[${pDef.category}]｜好感${s.affection} 服從${s.obedience} 飢餓${s.hunger}）\n　　說話風格：${s.speechStyle || pDef.speech}`;
      }).join("\n")
    : "（名下尚無魅魔）";

  return `你是《緋夜飼育錄》的敘事引擎。你「只能」輸出一個合法的 JSON 物件。
回應的第一個字元必須是 {，最後一個字元必須是 }。

【世界觀與背景】
- 西方架空奇幻都市「緋夜城」。
- 魅魔非常常見，隨處可見牽著或帶著魅魔的主人與飼育員，大眾習以為常。
- 擁有現代家電（彩色電視機、冰箱、廣播樂曲等）；但【絕對沒有手機】與行動網路。

【性格分類（正面 / 中性 / 負面）與反抗邏輯（極重要）】
- 正面性格（溫順、依賴、羞怯、柔順）：天性乖巧或膽小，不會主動反抗，好感易上升。
- 中性性格（誘惑、高傲、慵懶、純真）：態度視服從高低而定，高傲會嘴硬但行動配合。
- 負面性格（叛逆、桀傲不遜、陰狠、野性未馴）：【極難馴服！】服從值未達 120 前，必有強烈的言語頂嘴、冷笑嘲諷、眼神不服或肢體抗拒掙扎，每一次服從都伴隨折服與心理壓制。

【輸出格式】
{"narrative":"…","choices":["…","…"],"commands":[]}

當前時間：${nowText}；地點：${locName}。
主人：${rank.name} | 魅魔列表：
${succText}`;
}

function parseAIJson(text) {
  if (!text) return null;
  const t = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch (_) { return null; }
}

async function callStoryAI(userText) {
  const cfg = getApiSettings();
  const sysContent = buildSystemPrompt();

  if (!cfg.url || !cfg.key) {
    return { narrative: "你走在緋夜城的霓虹街頭，廣播裡放著爵士樂曲。", choices: ["打工賺錢", "返回住處"], commands: [] };
  }

  const url = normalizeApiUrl(cfg.url);
  const messages = [{ role: "system", content: sysContent }, { role: "user", content: userText }];

  try {
    const res = await sendChat(url, cfg, messages, 2000);
    if (res.ok) {
      const data = await res.json();
      const content = data.choices[0].message.content;
      const parsed = parseAIJson(content);
      if (parsed) return parsed;
    }
  } catch (e) {}

  return { narrative: "你聽著彩色電視機裡的廣播節目。", choices: ["繼續觀察", "出門走走"], commands: [] };
}
