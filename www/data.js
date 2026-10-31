/* ============================================================
   《緋夜飼育錄》資料庫 data.js
   ============================================================ */

const SUBPHASE_NAMES = ["早晨", "午後", "傍晚", "深夜"];

const STAT_CAPS = { affection: 200, obedience: 200, charm: 200, stamina: 200, stress: 100, hunger: 100 };

const SUCCUBUS_GRADES = [
  { grade: "F", name: "雛鳥",     minScore: 0,   priceMult: 1.0, desc: "尚在雛形，血氣與媚態都還生澀。" },
  { grade: "E", name: "生澀",     minScore: 40,  priceMult: 1.3, desc: "已能勾起眼神，卻還撐不起場面。" },
  { grade: "D", name: "熟練",     minScore: 70,  priceMult: 1.7, desc: "舉止有度，懂得看主人的眼色進退。" },
  { grade: "C", name: "優質",     minScore: 100, priceMult: 2.2, desc: "媚意成形，舉手投足皆勾人。" },
  { grade: "B", name: "上品",     minScore: 130, priceMult: 3.0, desc: "身價不凡，足以登上燈紅街的雅席。" },
  { grade: "A", name: "極品",     minScore: 160, priceMult: 4.5, desc: "百里挑一，連高塔貴族都要為之側目。" },
  { grade: "S", name: "緋夜之華", minScore: 185, priceMult: 7.0, desc: "緋夜百年難得的絕色，競價的燈海只為她亮。" }
];

const STAT_GUIDE = [
  { key: "affection", name: "好感", color: "#C98A9E",
    up: ["溫柔的對話、撫慰、陪伴", "餵食甜點與花草茶", "不帶痛楚的親密互動", "送禮、使用安撫類道具", "簽下永久契約後每日自然增長"],
    down: ["長時間冷落（每日自然消退）", "過度的痛楚與羞辱", "壓力長期過高"] },
  { key: "obedience", name: "服從", color: "#9A8FB8",
    up: ["完成「一整套」調教（如鞭打 10 下、完整綁縛一輪、連續服從數道指令）", "束縛、口枷、項圈等道具", "高壓但節制的調教"],
    down: ["中途放棄、被他（她）反抗成功", "無故縱容、過度溺愛", "每日自然消退（負面性格消退更快）"] },
  { key: "charm", name: "魅惑", color: "#E39BB6",
    up: ["魅惑類道具：魅惑濃縮原液、舊城迷香", "情慾沉淪式的親密互動、挑逗與撩撥"],
    down: ["太粗糙暴力的對待", "長期冷落"] },
  { key: "stamina", name: "體能", color: "#8FC7B8",
    up: ["體能訓練", "餵食補品", "充足休息", "深淵精氣玉液"],
    down: ["過度調教", "挨餓", "每日自然消退"] },
  { key: "stress", name: "壓力", color: "#D89A6A",
    up: ["施虐、束縛、強硬命令", "長時間飢餓"],
    down: ["安神香、花草茶、撫慰", "溫柔對話", "吃飽休息"] },
  { key: "hunger", name: "飢餓", color: "#B08A6A",
    up: ["隨時間與時段推進自然上升（每時段 +5）"],
    down: ["餵食對應種族食物直接歸零", "吃一般點心（減少 15~30）"] }
];

const DIET_OPTIONS = [
  { id: "plain",  name: "粗茶淡飯", cost: 3,  hpRecover: 8,  desc: "能填飽肚子就好，談不上滋味。" },
  { id: "normal", name: "家常便飯", cost: 7,  hpRecover: 18, desc: "有菜有肉，吃得暖胃。" },
  { id: "fine",   name: "精緻料理", cost: 15, hpRecover: 30, desc: "講究的火候與擺盤，吃得滿足。" },
  { id: "luxury", name: "奢華盛宴", cost: 26, hpRecover: 45, desc: "珍饈美饌，一夜好眠，體力飽滿。" }
];

const MASTER_RANKS = [
  { rank: 1, name: "見習飼育員", expNeed: 0,    desc: "初入緋夜的你，連夜色都還看不真切。" },
  { rank: 2, name: "契約飼育員", expNeed: 100,  desc: "你學會了與黑暗簽下第一份契約。" },
  { rank: 3, name: "魅魔調教師", expNeed: 300,  desc: "指尖已能掂量出他（她）顫抖的分寸。" },
  { rank: 4, name: "緋夜貴族",   expNeed: 700,  desc: "暗巷與高塔之間，你的名字被低聲傳頌。" },
  { rank: 5, name: "緋夜領主",   expNeed: 1500, desc: "整座緋夜在你掌心低伏，如待飼的獵物。" }
];

const MASTER_STYLES = [
  { id: "dominant", name: "支配施虐", desc: "以命令與束縛為樂，享受睫毛上懸而未落的顫抖。" },
  { id: "gentle",   name: "溫柔調教", desc: "以耐性與撫慰，換他（她）心甘情願把頸子湊進你的掌心。" },
  { id: "profit",   name: "純粹利益", desc: "一切皆有價碼。每一次低喘，都該被精算。" },
  { id: "lust",     name: "情慾沉淪", desc: "雙雙墜入情潮，早已分不清——是誰在飼養誰。" }
];

const RACES = [
  { key: "pure",      name: "純血魅魔", desc: "生於緋夜深處的血脈，以主人的體液為食，與你同源共息。", feed: { type: "hp", cost: 6 }, foodDesc: "以主人的體液為食，餓了會主動索血" },
  { key: "fox",       name: "狐魅混血", desc: "尾尖藏著狡黠與慾念，會用最柔軟的方式套出你的底線。", feed: { type: "gold", cost: 15 }, foodDesc: "雜食、嗜甜，會用撒嬌討甜食" },
  { key: "nightmare", name: "夢魘種",   desc: "棲息於夢的夾縫，以你未說出口的渴望為食，再還你一夜難安。", feed: { type: "gold", cost: 10 }, foodDesc: "以夢境為食，需要你陪睡或營造情境" },
  { key: "blood",     name: "血契種",   desc: "以血為契、以吻為鎖，一旦認主便終生不渝——除非你先背叛。", feed: { type: "hp", cost: 4 }, foodDesc: "以血為食，認主後忠誠不渝" },
  { key: "shade",     name: "影魅",     desc: "無骨無形，只在你熄燈之後，攀上你的背脊低語。", feed: { type: "gold", cost: 15 }, foodDesc: "夜行，以陰影與凝視為食" }
];

/* 性格劃分（正面／中性／負面） */
const PERSONALITIES = [
  // --- 正面性格 ---
  { id: "obedient", name: "溫順", category: "正面", categoryTag: "tag-safe", obedMult: 1.25,
    desc: "性格溫和配合，對你的每一道指令都習慣性順從。",
    speech: "語氣溫順乖巧，喜歡用「好的、主人」、「都聽您的」，眼神溫柔軟化。" },
  { id: "clingy", name: "依賴", category: "正面", categoryTag: "tag-safe", obedMult: 1.20,
    desc: "離了你便惶惶不安，夜裡總要蜷在你腳邊才肯閉眼。",
    speech: "語氣黏軟，常撒嬌討抱，句尾愛拖長音；一提到分離就慌張流露依戀。" },
  { id: "shy", name: "羞怯", category: "正面", categoryTag: "tag-safe", obedMult: 1.15,
    desc: "每次對上視線便別開臉，耳尖紅得像要滴血。",
    speech: "說話細若蚊蚋、常結巴，頻繁用「……」；被誇會慌張否認，眼睛不敢直視。" },
  { id: "gentle", name: "柔順", category: "正面", categoryTag: "tag-safe", obedMult: 1.15,
    desc: "性格柔弱體貼，會主動察覺你的情緒並給予安撫。",
    speech: "語調輕柔軟綿，喜歡低聲關切主人，被責備時也只是委屈垂眼。" },

  // --- 中性性格 ---
  { id: "seducer", name: "誘惑", category: "中性", categoryTag: "tag-muted", obedMult: 1.00,
    desc: "太清楚自己的魅力，也毫不吝嗇地對你展露。",
    speech: "語氣慵懶挑逗，喜歡留懸念、反問你，用詞纏綿，總把話題繞回你身上。" },
  { id: "proud", name: "高傲", category: "中性", categoryTag: "tag-muted", obedMult: 0.90,
    desc: "仰著下巴看你，眼裡卻藏不住被馴服前的倔強。",
    speech: "自稱「本小姐」或居高臨下，嘴上越硬，心裡越軟，被逼急了才會破防。" },
  { id: "lazy", name: "慵懶", category: "中性", categoryTag: "tag-muted", obedMult: 0.95,
    desc: "像隻曬足月光的貓，連拒絕你都透著一股漫不經心的媚。",
    speech: "語速慢、句子懶散，常打呵欠、答非所問；嘴上敷衍，行動卻隨遇而安。" },
  { id: "naive", name: "純真", category: "中性", categoryTag: "tag-muted", obedMult: 1.05,
    desc: "眼神純粹無邪，對你的命令帶着好奇與直率的服從。",
    speech: "語氣天真直接，有話直說，對各種調教與指令常問出令人臉紅的純真問題。" },

  // --- 負面性格（極難馴服、反抗強烈） ---
  { id: "rebel", name: "叛逆", category: "負面", categoryTag: "tag-risk", obedMult: 0.75,
    desc: "你的每一道命令，都先狠狠瞪你一眼，再被迫軟下膝蓋。",
    speech: "嘴上從不服軟，愛頂嘴放狠話，句子短促帶刺；行動雖被打服，眼神仍有火苗。" },
  { id: "arrogant", name: "桀傲不遜", category: "負面", categoryTag: "tag-risk", obedMult: 0.65,
    desc: "骨子裡帶著野獸般的狂傲，極難被馴服，視你的命令為挑釁。",
    speech: "語氣冷笑嘲諷，眼神桀傲冷烈，動輒用「憑你也想指揮我？」來回應抗拒。" },
  { id: "vicious", name: "陰狠", category: "負面", categoryTag: "tag-risk", obedMult: 0.70,
    desc: "眼神如藏毒的利刃，表面低頭順從，暗地裡卻尋找著反咬你的機會。",
    speech: "語速低沉陰鷙，常帶著冷哼與冰冷的目光，服從度低時會暗中抵抗。" },
  { id: "wild", name: "野性未馴", category: "負面", categoryTag: "tag-risk", obedMult: 0.75,
    desc: "如未被鏈條鎖住的野獸，不理解規矩，只臣服於絕對的痛楚與力量。",
    speech: "話語簡短粗暴、帶有野獸般的低吼或咬牙切齒，需要強硬手段才能壓制。" }
];

const TRAIT_FACETS = [
  "嘴上逞強，心裡其實很怕被拋下，卻死也不肯先低頭。",
  "對親密有點笨拙，會用毒舌或玩笑掩飾心動。",
  "佔有慾藏在溫和外表下，你多看別人一眼，就會不著痕跡地黏過來。",
  "習慣了孤獨，總在夜深人靜時才敢流露一點脆弱。",
  "看似漫不經心，其實把你的每句話都記在心裡。"
];

const DEFECTS = [
  { id: "hidden_sick", name: "隱疾",       desc: "發作時體溫滾燙，需你徹夜照料。" },
  { id: "curse",       name: "詛咒",       desc: "頸後烙著咒紋，每逢月晦便會低泣不止。" },
  { id: "resistance",  name: "強烈反抗",   desc: "至今仍會咬人。你餵進嘴裡的每一口，都得先被齒尖試探。" },
  { id: "rune_riot",   name: "淫紋失控",   desc: "天生的紋路會在深夜自行甦醒，無助地望向你。" }
];

const APPEARANCES = [
  "一頭銀白長髮垂至腰際，月光落在上頭像流動的水銀。",
  "琥珀色的豎瞳，在暗處會泛起危險的金芒。",
  "乳白的肌膚幾乎半透明，隱約能看見青色的血脈。",
  "尾尖呈桃心狀，興奮時會不自主地一下一下拍打地面。"
];

const MALE_APPEARANCES = [
  "一頭銀灰短髮，眉眼深邃，唇角總噙著一點漫不經心的笑。",
  "琥珀色的豎瞳在暗處泛著金芒，寬肩窄腰，站姿慵懶卻蓄著力。",
  "蒼白肌膚下透著青色血脈，喉結線條分明，舉手投足帶著危險的優雅。"
];

const SCENTS = [
  "晚香玉的甜膩混著一點體溫蒸出的汗意。",
  "焦糖被火微微烤焦的香，甜裡帶一絲苦。",
  "雨後潮濕的泥土與破土而出的嫩芽。"
];

const MALE_SCENTS = [
  "冷冽的雪松混著一點體溫蒸出的麝香。",
  "焦木與皮革的氣味，沉而烈，靠近了才覺出暖。"
];

const SUCCUBUS_NAMES = ["艾莉西亞", "莉莉絲", "緋音", "雪萊", "魅兒", "瑟琳", "夜琉璃", "露娜"];
const MALE_NAMES = ["賽爾", "洛恩", "緋夜", "亞斯", "伊昂", "雷恩", "修", "諾瓦"];

const JOBS = [
  { id: "delivery", name: "舊城報館配送", hpCost: 15, goldEarn: 45, expGain: 5, desc: "騎著單車在石板路與巷弄間發放新聞與報紙。" },
  { id: "bar_clean", name: "燈紅街酒館打掃", hpCost: 20, goldEarn: 65, expGain: 8, desc: "清掃酒吧的霓虹燈管與地板，收拾客人留下的酒杯。" },
  { id: "tower_porter", name: "高塔器械搬運", hpCost: 35, goldEarn: 120, expGain: 15, desc: "搬運重型電視機與大型家電至高塔貴族的宅邸。" },
  { id: "market_clerk", name: "家電行售貨助手", hpCost: 10, goldEarn: 35, expGain: 4, desc: "向顧客展示新到貨的彩色電視與真空吸塵器。" }
];

const ITEMS = [
  { id: "soothe_candy", name: "安撫蜜餞", category: "一般", price: 30, rankReq: 1, satiates: false,
    desc: "裹著蜜糖的果脯。甜意能撫平緊張，但無法替代正餐。",
    choiceHint: "拈一顆蜜餞，餵進嘴裡",
    effects: { affection: 6, obedience: 1, stress: -4, hunger: -15, stamina: 2 }, styleTag: "gentle" },
  { id: "herbal_tea", name: "舒緩花草茶", category: "一般", price: 60, rankReq: 1, satiates: false,
    desc: "以夜綻花草熬煮，搭配廣播音樂飲用，能讓神經放鬆。",
    choiceHint: "斟一杯溫熱的花草茶小口啜飲",
    effects: { affection: 4, stress: -10, hunger: -5, stamina: 3 }, styleTag: "gentle" },
  { id: "honey_sweet", name: "蜜糖糕", category: "一般", price: 40, rankReq: 1, satiates: false,
    desc: "裹著厚糖霜的精緻點心，甜得令人瞇起眼睛。",
    choiceHint: "拈起一塊蜜糖糕遞到唇邊",
    effects: { affection: 8, obedience: 2, stress: -5, hunger: -20, stamina: 2 }, styleTag: "gentle" },
  { id: "soft_whip", name: "羽痕軟皮短鞭", category: "一般", price: 80, rankReq: 1,
    desc: "柔韌的短鞭，落下的力道輕如羽翼，能在肌膚上烙下淺淺緋痕。男女通用。",
    choiceHint: "讓鞭梢輕輕掃過背，留下一道淡緋",
    effects: { obedience: 8, stress: 5 }, styleTag: "dominant" },
  { id: "crimson_gag", name: "緋紅噤聲口枷", category: "一般", price: 120, rankReq: 1,
    desc: "緋紅色的緘口之物，一旦扣上，便只能發出破碎的嗚咽。",
    choiceHint: "替扣上，讓倔強只能化成一串嗚咽",
    effects: { affection: -1, obedience: 12, stress: 10 }, styleTag: "dominant" },
  { id: "velvet_rope", name: "絲絨束縛繩組", category: "一般", price: 140, rankReq: 1,
    desc: "柔韌的絲絨繩索，一圈圈纏上四肢，便再無反抗的餘地。",
    choiceHint: "一圈圈縛住手腕與腳踝，看放棄掙扎",
    effects: { obedience: 15, stress: 8 }, styleTag: "dominant" },
  { id: "charm_essence", name: "魅惑濃縮原液", category: "秘藥", price: 250, rankReq: 2,
    desc: "黑市流傳的秘藥，一滴便能讓身體發燙、主動朝你挨近。",
    choiceHint: "在唇間點一滴原液，看主動湊近",
    effects: { affection: 12, obedience: -2, stress: -6, hunger: 10, charm: 14 }, styleTag: "lust" }
];

const COLLARS = [
  { id: "col_leather", name: "素面皮革項圈", material: "皮革", look: "素圈", weight: "輕", price: 120, rankReq: 1, source: "official",
    desc: "柔軟的皮質貼著頸側，內側能烙上你的名字。", wear: { obedience: 1, charm: 1 } },
  { id: "col_silk", name: "緞面絲綢項圈", material: "絲綢", look: "緞帶結", weight: "極輕", price: 200, rankReq: 2, source: "official",
    desc: "緞面泛著月華般的光，繫上後像一枚矜貴的飾物。", wear: { charm: 3, stress: -1 } }
];

const LEASHES = [
  { id: "lea_rope", name: "麻繩牽引索", material: "麻繩", look: "素繩", weight: "輕", price: 80, rankReq: 1, source: "official",
    desc: "粗糙的麻繩，握在掌心微微扎人。", wear: { obedience: 1 } }
];

const COLLAR_INFO = {
  official:    { name: "官方項圈行", desc: "高塔區的皮匠與銀匠合開的鋪子。", riskLabel: "正規" },
  blackmarket: { name: "暗巷禁具鋪", desc: "燈紅暗巷最深處，只賣見不得光的牽引禁具。", riskLabel: "違禁" }
};

const DISTRICTS = [
  { id: "oldtown", name: "緋夜舊城", isHigh: false,
    desc: "緋夜最早甦醒的街區，石牆斑駁，燈火昏黃，沿街擺著老舊收音機與霓虹招牌。",
    houses: [
      { id: "oldtown_loft", name: "臨街閣樓", price: 200, capacity: 1, desc: "一間能望見窄巷的閣樓，配備一台舊黑白電視機。", tags: ["起點"] }
    ] }
];

const MARKET_INFO = {
  official: { type: "official", name: "官方契約市場", desc: "高塔區的契約大廳，雪白廊柱下陳列著血統純正的魅魔。", riskLabel: "低風險" },
  blackmarket: { type: "blackmarket", name: "暗巷黑市", desc: "燈紅暗巷深處的非法集會。", riskLabel: "高風險" }
};

const OFFICIAL_BACKGROUNDS = ["名門之女", "御用血脈", "書記官侍從"];
const BLACKMARKET_BACKGROUNDS = ["受詛咒", "被強擄", "野性未馴"];

const GAME_INTRO = [
  "緋夜城不會真正天亮。當街道上的霓虹燈亮起，廣播傳出微弱的樂音，你便知道，又到了飼育的時刻。",
  "這座西方奇幻都市裡，魅魔隨處可見，大街小巷隨時能遇到牽著魅魔同行的人群。"
];
