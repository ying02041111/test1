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
    up: ["完成「一整套」調教 → 一次 +10~30", "束縛、口枷、頸鏈、項圈等道具", "高壓但節制的調教"],
    down: ["中途放棄、被他反抗成功", "無故縱容、過度溺愛", "每日自然消退（倔強性格消退更快）"] },
  { key: "charm", name: "魅惑", color: "#E39BB6",
    up: ["魅惑類道具：魅惑濃縮原液、舊城迷香", "情慾沉淪式的親密互動、挑逗撩撥"],
    down: ["太粗糙、太暴力的對待", "長期冷落"] },
  { key: "stamina", name: "體能", color: "#8FC7B8",
    up: ["體能訓練", "餵食補品（蜜餞、花草茶、蜜糖糕）", "充足休息", "深淵精氣玉液"],
    down: ["過度調教", "挨餓", "每日自然消退"] },
  { key: "stress", name: "壓力", color: "#D89A6A",
    up: ["施虐、束縛、強硬命令", "長時間飢餓"],
    down: ["安神香、花草茶、撫慰", "溫柔對話", "吃飽、休息"] },
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
  { rank: 3, name: "魅魔調教師", expNeed: 300,  desc: "指尖已能掂量出他顫抖的分寸。" },
  { rank: 4, name: "緋夜貴族",   expNeed: 700,  desc: "暗巷與高塔之間，你的名字被低聲傳頌。" },
  { rank: 5, name: "緋夜領主",   expNeed: 1500, desc: "整座緋夜在你掌心低伏，如待飼的獵物。" }
];

const MASTER_STYLES = [
  { id: "dominant", name: "支配施虐", desc: "以命令與束縛為樂，享受睫毛上懸而未落的顫抖。" },
  { id: "gentle",   name: "溫柔調教", desc: "以耐性與撫慰，換他心甘情願把頸子湊進你的掌心。" },
  { id: "profit",   name: "純粹利益", desc: "一切皆有價碼。每一次低喘，都該被精算。" },
  { id: "lust",     name: "情慾沉淪", desc: "雙雙墜入情潮，早已分不清——是誰在飼養誰。" }
];

const RACES = [
  { key: "pure",      name: "純血魅魔", desc: "生於緋夜深處的血脈，以主人的體液為食。", feed: { type: "hp", cost: 6 }, foodDesc: "以主人的體液為食，餓了會主動索血" },
  { key: "fox",       name: "狐魅混血", desc: "尾尖藏著狡黠與慾念，會用最柔軟的方式套出你的底線。", feed: { type: "gold", cost: 15 }, foodDesc: "雜食、嗜甜，會用撒嬌討甜食" },
  { key: "nightmare", name: "夢魘種",   desc: "棲息於夢的夾縫，以你未說出口的渴望為食。", feed: { type: "gold", cost: 10 }, foodDesc: "以夢境為食，需要你陪睡或營造情境" },
  { key: "blood",     name: "血契種",   desc: "以血為契、以吻為鎖，一旦認主便終生不渝。", feed: { type: "hp", cost: 4 }, foodDesc: "以血為食，認主後忠誠不渝" },
  { key: "shade",     name: "影魅",     desc: "無骨無形，只在你熄燈之後，攀上你的背脊低語。", feed: { type: "gold", cost: 15 }, foodDesc: "夜行，以陰影與凝視為食" }
];

/* 性格（以 categoryTag 顏色區分；obedMult 為服從增長倍率） */
const PERSONALITIES = [
  { id: "obedient", name: "溫順", categoryTag: "tag-safe", obedMult: 1.25,
    desc: "性格溫和配合，對你的每一道指令都習慣性順從。",
    speech: "語氣溫順乖巧，喜歡用「好的、主人」「都聽您的」，眼神溫柔軟化。" },
  { id: "clingy", name: "依賴", categoryTag: "tag-safe", obedMult: 1.20,
    desc: "離了你便惶惶不安，夜裡總要蜷在你腳邊才肯閉眼。",
    speech: "語氣黏軟，常撒嬌討抱，句尾愛拖長音；一提到分離就慌張流露依戀。" },
  { id: "shy", name: "羞怯", categoryTag: "tag-safe", obedMult: 1.15,
    desc: "每次對上視線便別開臉，耳尖紅得像要滴血。",
    speech: "說話細若蚊蚋、常結巴，頻繁用「……」；被誇會慌張否認，眼睛不敢直視。" },
  { id: "meek", name: "柔順", categoryTag: "tag-safe", obedMult: 1.15,
    desc: "性格柔弱體貼，會主動察覺你的情緒並給予安撫。",
    speech: "語調輕柔軟綿，喜歡低聲關切主人，被責備時也只是委屈垂眼。" },

  { id: "seducer", name: "誘惑", categoryTag: "tag-muted", obedMult: 1.00,
    desc: "太清楚自己的魅力，也毫不吝嗇地對你展露。",
    speech: "語氣慵懶挑逗，喜歡留懸念、反問你，用詞纏綿，總把話題繞回你身上。" },
  { id: "proud", name: "高傲", categoryTag: "tag-muted", obedMult: 0.90,
    desc: "仰著下巴看你，眼裡卻藏不住被馴服前的倔強。",
    speech: "自稱「本小姐」，語氣居高臨下，嘴上越硬心裡越軟，被逼急了才會破防。" },
  { id: "lazy", name: "慵懶", categoryTag: "tag-muted", obedMult: 0.95,
    desc: "像隻曬足月光的貓，連拒絕你都透著一股漫不經心的媚。",
    speech: "語速慢、句子懶散，常打呵欠、答非所問；嘴上敷衍，行動卻隨遇而安。" },
  { id: "naive", name: "純真", categoryTag: "tag-muted", obedMult: 1.05,
    desc: "眼神純粹無邪，對你的命令帶著好奇與直率的回應。",
    speech: "語氣天真直接，有話直說，對各種指令常問出令人臉紅的純真問題。" },

  { id: "rebel", name: "叛逆", categoryTag: "tag-risk", obedMult: 0.75,
    desc: "你的每一道命令，都先狠狠瞪你一眼，再被迫軟下膝蓋。",
    speech: "嘴上從不服軟，愛頂嘴放狠話，句子短促帶刺；行動雖被打服，眼神仍有火苗。" },
  { id: "arrogant", name: "桀傲不遜", categoryTag: "tag-risk", obedMult: 0.65,
    desc: "骨子裡帶著野獸般的狂傲，極難被馴服，視你的命令為挑釁。",
    speech: "語氣冷笑嘲諷，眼神桀傲冷烈，動輒用「憑你也想指揮我？」來抗拒。" },
  { id: "vicious", name: "陰狠", categoryTag: "tag-risk", obedMult: 0.70,
    desc: "眼神如藏毒的利刃，表面低頭順從，暗地裡卻尋找反咬你的機會。",
    speech: "語速低沉陰鷙，常帶著冷哼與冰冷的目光，服從低時會暗中抵抗。" },
  { id: "wild", name: "野性未馴", categoryTag: "tag-risk", obedMult: 0.75,
    desc: "如未被鏈條鎖住的野獸，不理解規矩，只臣服於絕對的力量。",
    speech: "話語簡短粗暴、帶有野獸般的低吼或咬牙切齒，需強硬手段才能壓制。" }
];

const TRAIT_FACETS = [
  "嘴上逞強，心裡其實很怕被拋下，卻死也不肯先低頭。",
  "對親密有點笨拙，會用毒舌或玩笑掩飾心動。",
  "佔有慾藏在溫和外表下，你多看別人一眼，就會不著痕跡地黏過來。",
  "習慣了孤獨，總在夜深人靜時才敢流露一點脆弱。",
  "看似漫不經心，其實把你的每句話都記在心裡。",
  "對某件小事有莫名的執著（例如睡前一定要喝點什麼）。",
  "害怕雷雨，卻裝作若無其事。",
  "會偷偷觀察你，被發現就移開視線、耳根發紅。",
  "骨子裡有股不服輸，越是輸越要證明自己。",
  "對「被需要」格外渴望，會主動攬下你的煩惱。"
];

const DEFECTS = [
  { id: "hidden_sick", name: "隱疾",       desc: "發作時體溫滾燙，需你徹夜照料。" },
  { id: "curse",       name: "詛咒",       desc: "頸後烙著咒紋，每逢月晦便會低泣不止。" },
  { id: "resistance",  name: "強烈反抗",   desc: "至今仍會咬人。你餵進嘴裡的每一口，都得先被齒尖試探。" },
  { id: "rune_riot",   name: "淫紋失控",   desc: "天生的紋路會在深夜自行甦醒，無助地望向你。" },
  { id: "heat_cycle",  name: "發情期紊亂", desc: "週期毫無章法，說來就來，常把你們逼到無處可退。" },
  { id: "bloodthirst", name: "血癮",       desc: "對你的氣味異常貪婪，若不定期滿足會焦躁地啃咬自己的唇。" }
];

const APPEARANCES = [
  "一頭銀白長髮垂至腰際，月光落在上頭像流動的水銀。",
  "琥珀色的豎瞳，在暗處會泛起危險的金芒。",
  "乳白的肌膚幾乎半透明，隱約能看見青色的血脈。",
  "尾尖呈桃心狀，興奮時會不自主地一下一下拍打地面。",
  "雙角細小而精緻，像兩枚被打磨過的墨玉。",
  "唇色天生艷紅，彷彿才剛被誰吻得腫脹。"
];

const MALE_APPEARANCES = [
  "一頭銀灰短髮，眉眼深邃，唇角總噙著一點漫不經心的笑。",
  "琥珀色的豎瞳在暗處泛著金芒，寬肩窄腰，站姿慵懶卻蓄著力。",
  "蒼白肌膚下透著青色血脈，喉結線條分明，舉手投足帶著危險的優雅。",
  "尾尖呈箭形，黑得發亮，興奮時會不自覺地一下一下點地。",
  "額上一對墨玉般的角，眉宇英挺，似笑非笑地打量你。",
  "唇色偏淡，卻總像含著未出口的話，看向你時眼裡有化不開的慾。"
];

const SCENTS = [
  "晚香玉的甜膩混著一點體溫蒸出的汗意。",
  "焦糖被火微微烤焦的香，甜裡帶一絲苦。",
  "雨後潮濕的泥土與破土而出的嫩芽。",
  "龍涎般沉厚的香，聞久了會讓人心跳失序。",
  "乾涸的血腥混著一朵將謝的玫瑰。",
  "乾淨的皂香下，藏著一股只屬於她的、勾人的麝香。"
];

const MALE_SCENTS = [
  "冷冽的雪松混著一點體溫蒸出的麝香。",
  "焦木與皮革的氣味，沉而烈，靠近了才覺出暖。",
  "雨後潮土混著淡淡的龍涎，清冷又勾人。",
  "煙草般的苦香裡藏著一縷甜，像燒到一半的糖。",
  "乾燥的檀香混著一點血腥，危險卻令人心顫。",
  "乾淨的皂香下，浮著一股壓抑的、雄性的荷爾蒙。"
];

const SUCCUBUS_NAMES = [
  "艾莉西亞", "莉莉絲", "緋音", "雪萊", "魅兒", "瑟琳", "緋羅",
  "夜琉璃", "瑪格麗特", "緋羽", "露娜", "伊芙", "緋蕾", "蝶衣", "緋娜", "月見"
];

const MALE_NAMES = [
  "賽爾", "洛恩", "緋夜", "亞斯", "伊昂", "雷恩", "緋梟", "修", "諾瓦", "希歐", "緋嵐", "凜"
];

/* 打工列表（體力消耗與金幣報酬各不相同） */
const JOBS = [
  { id: "delivery", name: "舊城報館配送", hpCost: 15, goldEarn: 45, expGain: 5, desc: "騎著單車在石板路與巷弄間發放新聞與報紙。" },
  { id: "bar_clean", name: "燈紅街酒館打掃", hpCost: 20, goldEarn: 65, expGain: 8, desc: "清掃酒吧的霓虹燈管與地板，收拾客人留下的酒杯。" },
  { id: "tower_porter", name: "高塔器械搬運", hpCost: 35, goldEarn: 120, expGain: 15, desc: "搬運重型電視機與大型家電至高塔貴族的宅邸。" },
  { id: "market_clerk", name: "家電行售貨助手", hpCost: 10, goldEarn: 35, expGain: 4, desc: "向顧客展示新到貨的彩色電視與真空吸塵器。" }
];

const ITEMS = [
  { id: "soothe_candy", name: "安撫蜜餞", category: "一般", price: 30, rankReq: 1, satiates: false,
    desc: "裹著蜜糖的果脯，甜意從舌尖一路暖進胃裡。",
    choiceHint: "拈一顆蜜餞，餵進嘴裡",
    effects: { affection: 6, obedience: 1, stress: -4, hunger: -15, stamina: 2 }, styleTag: "gentle" },
  { id: "herbal_tea", name: "舒緩花草茶", category: "一般", price: 60, rankReq: 1, satiates: false,
    desc: "以夜綻的花草熬煮，溫熱入喉，能撫平繃緊的神經。",
    choiceHint: "斟一杯溫熱的花草茶，看他小口啜飲",
    effects: { affection: 4, stress: -8, hunger: -3, stamina: 3 }, styleTag: "gentle" },
  { id: "honey_sweet", name: "蜜糖糕", category: "一般", price: 40, rankReq: 1, satiates: false,
    desc: "裹著糖霜的小點，甜得瞇起眼睛。",
    choiceHint: "拈起一塊蜜糖糕，遞到唇邊",
    effects: { affection: 8, obedience: 2, stress: -3, hunger: -10, stamina: 2 }, styleTag: "gentle" },
  { id: "calming_incense", name: "安神香", category: "一般", price: 50, rankReq: 1,
    desc: "裊裊青煙裡，緊繃一寸寸軟下去。",
    choiceHint: "點一爐安神香，讓緊繃一寸寸軟下去",
    effects: { affection: 3, obedience: 1, stress: -8, stamina: 2 }, styleTag: "gentle" },
  { id: "soft_whip", name: "羽痕軟皮短鞭", category: "一般", price: 80, rankReq: 1,
    desc: "柔韌的短鞭，落下的力道輕如羽翼，卻能在肌膚上烙下淺淺的緋痕。",
    choiceHint: "讓鞭梢輕輕掃過背，留下一道淡緋",
    effects: { obedience: 8, stress: 5 }, styleTag: "dominant" },
  { id: "crimson_gag", name: "緋紅噤聲口枷", category: "一般", price: 120, rankReq: 1,
    desc: "緋紅色的緘口之物，一旦扣上，便只能發出破碎的嗚咽。",
    choiceHint: "替扣上，讓倔強只能化成一串嗚咽",
    effects: { affection: -1, obedience: 12, stress: 10 }, styleTag: "dominant" },
  { id: "night_beads", name: "幽夜律動玉珠", category: "一般", price: 160, rankReq: 1,
    desc: "一串溫潤的玉珠，貼著體溫便開始細細震顫。",
    choiceHint: "讓玉珠沉入最深處，看膝蓋慢慢發軟",
    effects: { affection: 8, stress: -5, hunger: 5, charm: 5 }, styleTag: "lust" },
  { id: "velvet_rope", name: "絲絨束縛繩組", category: "一般", price: 140, rankReq: 1,
    desc: "柔韌的絲絨繩索，一圈圈纏上四肢，便再無反抗的餘地。",
    choiceHint: "一圈圈縛住手腕與腳踝，看放棄掙扎",
    effects: { obedience: 15, stress: 8 }, styleTag: "dominant" },
  { id: "silk_ribbon", name: "黑絲緞帶", category: "一般", price: 60, rankReq: 1,
    desc: "一條能繞過手腕、也能繫住目光的黑絲。",
    choiceHint: "一圈一圈繞上腕，看呼吸亂了分寸",
    effects: { affection: 1, obedience: 6, stress: 5, charm: 3 }, styleTag: "dominant" },
  { id: "feather_duster", name: "羽毛拂塵", category: "一般", price: 80, rankReq: 1,
    desc: "柔軟得過分的羽毛，輕輕掃過最敏感的地方。",
    choiceHint: "讓羽毛沿著脊線遊走，直到忍不住縮起肩膀",
    effects: { affection: 5, obedience: 3, stress: 6, hunger: 2, charm: 3 }, styleTag: "gentle" },
  { id: "candle_wax", name: "燭台之淚", category: "一般", price: 90, rankReq: 2,
    desc: "溫熱的蠟油落在肌膚上凝成緋色。",
    choiceHint: "讓溫熱的蠟淚落在鎖骨，看它凝成緋色",
    effects: { obedience: 8, stress: 10, hunger: 3 }, styleTag: "dominant" },
  { id: "silver_collar", name: "銀鎖頸鏈", category: "一般", price: 120, rankReq: 2,
    desc: "內側刻著你的名字。戴上之後，每一次吞嚥都會意識到自己屬於誰。",
    choiceHint: "替繫上，再輕輕一勒，逼仰起頸子",
    effects: { affection: -2, obedience: 12, stress: 8, charm: 2 }, styleTag: "dominant" },
  { id: "onyx_blindfold", name: "黑曜遮光絲絨眼罩", category: "一般", price: 90, rankReq: 1,
    desc: "一旦覆上雙目，世界便只剩黑暗，對你的每一次觸碰異常敏感。",
    choiceHint: "覆上眼，讓黑暗把感知一寸寸放大",
    effects: { affection: 5, stress: 8, charm: 3 }, styleTag: "gentle" },
  { id: "silver_bell_clips", name: "銀鈴微刺敏感夾", category: "一般", price: 130, rankReq: 1,
    desc: "一對墜著銀鈴的小夾，咬住最嬌嫩的那一點。",
    choiceHint: "把銀鈴小夾咬上那兩點，聽呼吸碎成鈴音",
    effects: { affection: -1, obedience: 10, stress: 10, charm: 3 }, styleTag: "dominant" },
  { id: "oldtown_incense", name: "舊城迷香", category: "街區", price: 150, rankReq: 2,
    desc: "舊城暗巷才買得到的密製香粉。",
    choiceHint: "點上舊城迷香，看耳尖泛起薄紅",
    effects: { affection: 4, obedience: 4, stress: 4, hunger: 6, charm: 6 }, styleTag: "lust" },
  { id: "tower_page", name: "高塔禁書殘頁", category: "街區", price: 200, rankReq: 3,
    desc: "自高塔書閣撕下的一頁，記載著古老儀式。",
    choiceHint: "照著殘頁上的儀式，低聲念出那句古老的咒",
    effects: { affection: -1, obedience: 10, stress: 6, hunger: 8, charm: 4 }, styleTag: "profit" },
  { id: "charm_essence", name: "魅惑濃縮原液", category: "秘藥", price: 250, rankReq: 2,
    desc: "黑市流傳的秘藥，一滴便能讓最矜持的血脈泛起薄紅。",
    choiceHint: "在唇間點一滴原液，看主動湊近",
    effects: { affection: 12, obedience: -2, stress: -6, hunger: 10, charm: 14 }, styleTag: "lust" },
  { id: "abyss_spirit", name: "深淵精氣玉液", category: "秘藥", price: 500, rankReq: 4,
    desc: "自深淵熬煉的秘液，能令氣血大盛。",
    choiceHint: "餵飲下，看眼底的飢渴燒起來",
    effects: { affection: 6, obedience: 5, stress: 5, hunger: 25, charm: 8, stamina: 8 }, styleTag: "profit" },
  { id: "codex1", name: "【緋夜禁典·極刑】壹·荊棘之吻", category: "高階", price: 600, rankReq: 4,
    desc: "柔韌的荊棘藤蔓，貼膚便會綻出細小的刺。",
    choiceHint: "讓荊棘之吻攀上手腕，一點一點收緊",
    effects: { affection: 2, obedience: 25, stress: 18, hunger: 10, stamina: 4 }, styleTag: "dominant" },
  { id: "codex2", name: "【緋夜禁典·極刑】貳·極晝之牢", category: "高階", price: 800, rankReq: 4,
    desc: "以純白光線織成的牢籠，剝奪所有陰影。",
    choiceHint: "將關進極晝之牢，剝去所有陰影",
    effects: { obedience: 30, stress: 22, hunger: 6, stamina: 5 }, styleTag: "profit" },
  { id: "codex3", name: "【緋夜禁典·極刑】參·深淵之舌", category: "高階", price: 1000, rankReq: 5,
    desc: "由深淵觸鬚淬煉而成的活物。",
    choiceHint: "放出深淵之舌，任它循著體溫攀附",
    effects: { affection: 4, obedience: 22, stress: 26, hunger: 14, charm: 8 }, styleTag: "lust" },
  { id: "bm_spiked_rod", name: "【黑市·禁忌】異形棘刺巨型玉棒", category: "高階", price: 450, rankReq: 2,
    desc: "黑市深處才有的異形重器。",
    choiceHint: "取出那件棘刺重器，在耳畔問準備好了沒",
    effects: { affection: 15, obedience: 25, stress: 25, hunger: 10, charm: 10 }, styleTag: "dominant" },
  { id: "bm_blood_clips", name: "【黑市·禁忌】血誓螺旋絞骨合金夾", category: "高階", price: 520, rankReq: 2,
    desc: "配著調節螺絲與細密咬齒的金屬夾。",
    choiceHint: "將合金夾絞上，聽倒抽一口氣",
    effects: { obedience: 30, stress: 25, stamina: 3 }, styleTag: "dominant" },
  { id: "bm_tri_shackle", name: "【黑市·禁忌】深淵拘魂重鎖三叉枷", category: "高階", price: 700, rankReq: 3,
    desc: "沉重冰冷的合金重枷，三叉交鎖。",
    choiceHint: "將重枷扣上，看顫抖著維持那羞恥的姿態",
    effects: { obedience: 40, stress: 35, stamina: 5 }, masterHp: -8, styleTag: "dominant" },
  { id: "bm_iron_mask", name: "【黑市·禁忌】全覆式剝奪拘靈鐵面", category: "高階", price: 750, rankReq: 3,
    desc: "厚重冰冷的全覆面罩，封死視覺、聽覺與聲音。",
    choiceHint: "為扣上鐵面，讓黑暗吞沒所有知覺",
    effects: { affection: -5, obedience: 45, stress: 35, stamina: 4 }, styleTag: "dominant" },
  { id: "bm_twin_serpent", name: "【黑市·禁忌】雙首蛇噬律動儀", category: "高階", price: 950, rankReq: 4,
    desc: "形如雙首魔蛇的活物儀器。",
    choiceHint: "放出那雙首的律動儀，任它同時深入",
    effects: { affection: 25, obedience: 50, stress: 40, hunger: 12, charm: 14, stamina: 6 }, styleTag: "lust" },
  { id: "plug_jade", name: "凝脂暖玉塞", category: "一般", price: 90, rankReq: 1,
    desc: "打磨圓潤的暖玉，貼著體溫便微微發熱。",
    choiceHint: "將暖玉塞送入深處，看呼吸一點點亂掉",
    effects: { affection: 5, obedience: 3, stress: -3, hunger: 3, charm: 3 }, styleTag: "lust" },
  { id: "male_ring", name: "緋玉束縛環", category: "一般", price: 90, rankReq: 1,
    desc: "冰涼的玉環，圈住最躁動的那處。",
    choiceHint: "替他套上玉環，指腹順著緊繃的邊緣收緊",
    effects: { obedience: 6, stress: 5, charm: 2 }, styleTag: "dominant" },
  { id: "male_pearl", name: "深處喚醒玉珠", category: "一般", price: 150, rankReq: 1,
    desc: "一串溫潤玉珠，貼著體溫細細震顫。",
    choiceHint: "讓玉珠沒入最深處，看膝蓋慢慢發軟",
    effects: { affection: 6, obedience: 4, stress: -3, hunger: 4, charm: 4 }, styleTag: "lust" },
  { id: "male_chastity", name: "鎖精銀鎖", category: "一般", price: 180, rankReq: 2,
    desc: "冰涼的銀製束具，將最私密的慾望牢牢鎖起。",
    choiceHint: "為他扣上銀鎖，輕拍那處壓抑的脹",
    effects: { obedience: 12, stress: 8, hunger: 6, charm: 1 }, styleTag: "dominant" },
  { id: "male_frenulum", name: "銀針繫帶夾", category: "一般", price: 110, rankReq: 1,
    desc: "一枚極細的銀夾，咬住最敏感的那一線。",
    choiceHint: "把銀夾咬上繫帶，聽他倒抽一口氣",
    effects: { obedience: 8, stress: 6, hunger: 2, charm: 3 }, styleTag: "dominant" },
  { id: "male_arousal_oil", name: "雄蕊催情油", category: "秘藥", price: 260, rankReq: 2,
    desc: "黑市流出的催情秘油，一滴便足以讓他眼眶發紅。",
    choiceHint: "將催情油抹上腿根，看慾望一點點燒起來",
    effects: { affection: 10, obedience: -1, stress: -5, hunger: 8, charm: 12 }, styleTag: "lust" },
  { id: "bm_male_cage", name: "【黑市·禁忌】鎏金貞操束籠", category: "高階", price: 420, rankReq: 2,
    desc: "黑市匠人打造的鎏金束籠，通體鏤雕。",
    choiceHint: "將束籠扣上，讓那處只能臣服於你的鑰匙",
    effects: { obedience: 22, stress: 14, hunger: 8, stamina: 3 }, styleTag: "dominant" },
  { id: "bm_male_rod", name: "【黑市·禁忌】異形深探玉柱", category: "高階", price: 500, rankReq: 3,
    desc: "黑市深處才有的異形玉柱。",
    choiceHint: "取出那件玉柱，在他耳畔問準備好了沒",
    effects: { affection: 16, obedience: 24, stress: 18, hunger: 10, charm: 10 }, styleTag: "dominant" },
  { id: "bm_male_electro", name: "【黑市·禁忌】鎖精紫電環", category: "高階", price: 640, rankReq: 3,
    desc: "紫晶環身不時竄過一線電弧。",
    choiceHint: "扣上紫電環，看電弧沿著腿根竄開",
    effects: { obedience: 28, stress: 20, stamina: 4 }, styleTag: "dominant" }
];

const COLLARS = [
  { id: "col_leather", name: "素面皮革項圈", material: "皮革", look: "素圈", weight: "輕", price: 120, rankReq: 1, source: "official",
    desc: "柔軟的皮質貼著頸側，內側能烙上你的名字。", wear: { obedience: 1, charm: 1 } },
  { id: "col_silk", name: "緞面絲綢項圈", material: "絲綢", look: "緞帶結", weight: "極輕", price: 200, rankReq: 2, source: "official",
    desc: "緞面泛著月華般的光，繫上後像一枚矜貴的飾物。", wear: { charm: 3, stress: -1 } },
  { id: "col_silver", name: "雕花銀質項圈", material: "純銀", look: "藤紋雕花", weight: "中", price: 380, rankReq: 3, source: "official",
    desc: "冰涼的銀圈綴著藤紋，扣上時那一聲輕響。", wear: { obedience: 3, charm: 1, stress: 1 } },
  { id: "col_gold", name: "鎏金鎖心項圈", material: "鎏金", look: "鎖心墜飾", weight: "重", price: 650, rankReq: 4, source: "official",
    desc: "沉甸甸的鎏金圈扣著一枚鎖心，行走間叮噹作響。", wear: { obedience: 4, charm: 3, stress: 2 } },
  { id: "col_thorn", name: "【禁忌】棘環項圈", material: "黑鐵棘刺", look: "內襯棘齒", weight: "重", price: 700, rankReq: 3, source: "blackmarket", forbidden: true,
    desc: "內襯一圈細密棘齒，每低頭順從一次，棘刺便輕咬一分。", wear: { obedience: 6, stamina: 1, stress: 4 } },
  { id: "col_soul", name: "【禁忌】噬魂銘環", material: "深淵合金", look: "流動符文環", weight: "極重", price: 1100, rankReq: 4, source: "blackmarket", forbidden: true,
    desc: "深淵合金的環身浮著流動符文，一旦扣上便與魂魄共鳴。", wear: { obedience: 8, charm: 4, stamina: 2, stress: 6 } }
];

const LEASHES = [
  { id: "lea_rope", name: "麻繩牽引索", material: "麻繩", look: "素繩", weight: "輕", price: 80, rankReq: 1, source: "official",
    desc: "粗糙的麻繩，握在掌心微微扎人。", wear: { obedience: 1 } },
  { id: "lea_leather", name: "熟銅環皮牽繩", material: "皮革", look: "銅環扣", weight: "中", price: 180, rankReq: 2, source: "official",
    desc: "結實的皮索配一枚熟銅扣，拉動時會順著力道靠近。", wear: { obedience: 2, charm: 1 } },
  { id: "lea_chain", name: "銀鏈牽引索", material: "純銀", look: "細鏈", weight: "中", price: 340, rankReq: 3, source: "official",
    desc: "銀鏈在燈下泛著冷光。", wear: { obedience: 3, charm: 2 } },
  { id: "lea_velvet", name: "黑絲絨牽繩", material: "絲絨", look: "流蘇穗", weight: "輕", price: 420, rankReq: 3, source: "official",
    desc: "柔軟的黑絲絨繩，尾端綴著流蘇。", wear: { charm: 3, stress: -1 } },
  { id: "lea_barb", name: "【禁忌】倒刺鎖魂索", material: "黑鐵倒刺", look: "倒刺鏈", weight: "重", price: 640, rankReq: 3, source: "blackmarket", forbidden: true,
    desc: "鏈節內側生著細小倒刺，想離遠一點就會被輕輕拽回。", wear: { obedience: 5, stress: 3 } },
  { id: "lea_abyss", name: "【禁忌】深淵紫電鎖鏈", material: "深淵紫晶", look: "電弧鏈", weight: "極重", price: 950, rankReq: 4, source: "blackmarket", forbidden: true,
    desc: "紫晶鏈身不時竄過一線電弧，拉緊時會沿著鏈條傳到頸側。", wear: { obedience: 7, stamina: 2, stress: 5 } }
];

const COLLAR_INFO = {
  official:    { name: "官方項圈行", desc: "高塔區的皮匠與銀匠合開的鋪子。", riskLabel: "正規" },
  blackmarket: { name: "暗巷禁具鋪", desc: "燈紅暗巷最深處，只賣見不得光的牽引禁具。", riskLabel: "違禁" }
};

const DISTRICTS = [
  { id: "oldtown", name: "緋夜舊城", isHigh: false,
    desc: "緋夜最早甦醒的街區，石牆斑駁，燈火昏黃，沿街擺著老舊收音機與霓虹招牌。",
    houses: [
      { id: "oldtown_loft", name: "臨街閣樓", price: 200, capacity: 1, desc: "一間能望見窄巷的閣樓，配備一台舊黑白電視機。", tags: ["起點"] },
      { id: "oldtown_basement", name: "地窖暗室", price: 500, capacity: 2, desc: "石砌的地窖，隔音極佳。", tags: ["隔音", "隱密"] }
    ] },
  { id: "lantern", name: "燈紅暗巷", isHigh: true,
    desc: "霓虹與紅燈籠交織的不夜街，酒吧裡放著爵士樂曲。",
    houses: [
      { id: "lantern_parlor", name: "紅簾雅房", price: 900, capacity: 2, desc: "垂著紅絲絨簾的雅房。", tags: ["人脈"] },
      { id: "lantern_penthouse", name: "頂樓香巢", price: 1800, capacity: 4, desc: "俯瞰整條燈紅街的頂樓。", tags: ["寬敞"] }
    ] },
  { id: "tower", name: "高塔區", isHigh: true,
    desc: "緋夜的權力中樞，潔白的尖塔刺入夜空，裝著最新型彩色電視與冷氣電器。",
    houses: [
      { id: "tower_suite", name: "塔間書齋", price: 2200, capacity: 3, desc: "滿牆藏書的書齋。", tags: ["學識"] },
      { id: "tower_estate", name: "高塔莊園", price: 4500, capacity: 6, desc: "帶花園與私人電熱浴池的莊園。", tags: ["奢華", "庭園"] }
    ] },
  { id: "outskirt", name: "郊外莊園", isHigh: true,
    desc: "遠離城區的幽靜之地。",
    houses: [
      { id: "outskirt_villa", name: "隱林別墅", price: 6000, capacity: 8, desc: "被黑森林環抱的別墅。", tags: ["絕密", "廣闊"] }
    ] }
];

const MARKET_INFO = {
  official: { type: "official", name: "官方契約市場",
    desc: "高塔區的契約大廳，雪白廊柱下陳列著血統純正、體檢完備的魅魔。",
    riskLabel: "低風險", riskDesc: "健康、血統純正、性情穩定。" },
  blackmarket: { type: "blackmarket", name: "暗巷黑市",
    desc: "燈紅暗巷深處的非法集會，鐵籠鏽跡斑斑。",
    riskLabel: "高風險", riskDesc: "來路不明、或有隱疾詛咒。" }
};

const OFFICIAL_BACKGROUNDS = ["名門之女", "御用血脈", "書記官侍從", "育成院出身"];
const BLACKMARKET_BACKGROUNDS = ["受詛咒", "被強擄", "前主下落不明", "血脈不明", "野性未馴"];

const SELL_CHANNELS = {
  official:    { name: "官方契約廳", riskLabel: "低風險", desc: "手續正規、估價保守。" },
  blackmarket: { name: "暗巷黑市",   riskLabel: "高風險", desc: "價碼誘人，買家未必是「人」。" },
  auction:     { name: "拍賣會",     riskLabel: "最高價", desc: "燈海中央，競價落槌。" }
};

const WEIRD_BUYERS = [
  { id: "cult", name: "披血紅祭袍的祭司", priceMult: 1.9,
    flavor: "一名披著血紅祭袍的祭司在籠前駐足，指尖沿著輪廓隔空描摹。",
    effect: { gold: 0, hp: -8, exp: 10 },
    consequenceText: "他離去時的回眸，讓你在往後幾夜都睡不安穩。" },
  { id: "noble", name: "戴單片眼鏡的貴族", priceMult: 1.6,
    flavor: "他咯咯笑著，出價時手裡把玩著一枚帶血的戒指。",
    effect: { gold: 0, hp: 0, exp: 5 },
    consequenceText: "他走後，你才發現錢袋裡多了幾枚來路不明的血斑金幣。" },
  { id: "fugitive", name: "壓低帽簷的通緝販子", priceMult: 2.1,
    flavor: "滿身硝煙味的男人壓低帽簷，丟下一袋沉甸甸的金幣。",
    effect: { gold: 0, hp: -5, exp: 0 },
    consequenceText: "往後幾夜，高塔巡衛總在你的屋前多繞兩圈。" },
  { id: "sadist", name: "裹著黑斗篷的收藏家", priceMult: 1.8,
    flavor: "他的眼神像在丈量獵物，低聲問會不會哭。",
    effect: { gold: 0, hp: -3, exp: 8 },
    consequenceText: "夜裡無端驚醒，總覺得有人在你窗外數著呼吸。" },
  { id: "hunter", name: "自稱血族獵人的老人", priceMult: 2.3,
    flavor: "他露出森白的牙，說只需要一點血，其餘都好談。",
    effect: { gold: 0, hp: -10, exp: 12 },
    consequenceText: "交易成了。只是你的手腕上，多了一道細細的紅痕。" },
  { id: "broker", name: "操著濃重口音的掮客", priceMult: 1.5,
    flavor: "他拍著胸脯保證現款，點錢時手指快得看不清。",
    effect: { gold: -80, hp: 0, exp: 0 },
    consequenceText: "你被擺了一道，少了幾枚真金。" }
];

const AUCTION_INFO = { commission: 0.15, minGrade: ["A", "S"], desc: "燈紅暗巷頂樓的競價。" };

const CONTRACT_INFO = {
  permanentAffectionReq: 70,
  permanentCost: 500,
  permanentDesc: "以血與吻烙下的永久之契。",
  bonusesDesc: "每日好感自然增長、壓力緩解；配戴加成提升。"
};

const GAME_INTRO = [
  "緋夜城不會真正天亮。當街道上的霓虹燈一盞盞亮起，廣播隨之傳出微弱的爵士音符，你便知道，又到了飼育的時刻。",
  "這座西方奇幻都市裡，魅魔隨處可見，街頭巷尾隨時能遇到牽著魅魔同行的人群。你是緋夜城的飼育員，懷裡揣著一紙新的契約。",
  "要從何處開始——是踏進雪白的高塔契約廳，還是鑽入燈紅暗巷最深處的鐵籠之間？"
];
