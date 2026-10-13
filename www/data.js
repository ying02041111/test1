/* ============================================================
   《緋夜飼育錄》資料庫 data.js
   所有文案、常數、魅魔市場與道具資料
   ============================================================ */

/* ---------- 時間階段 ---------- */
const SUBPHASE_NAMES = ["清晨", "午後", "傍晚", "深夜"];

/* ---------- 主控階級 ---------- */
const MASTER_RANKS = [
  { rank: 1, name: "見習飼育員", expNeed: 0,    desc: "初入緋夜的你，連夜色都還看不真切。" },
  { rank: 2, name: "契約飼育員", expNeed: 100,  desc: "你學會了與黑暗簽下第一份契約。" },
  { rank: 3, name: "魅魔調教師", expNeed: 300,  desc: "指尖已能掂量出她顫抖的分寸。" },
  { rank: 4, name: "緋夜貴族",   expNeed: 700,  desc: "暗巷與高塔之間，你的名字被低聲傳頌。" },
  { rank: 5, name: "緋夜領主",   expNeed: 1500, desc: "整座緋夜在你掌心低伏，如待飼的獵物。" }
];

/* ---------- 主控訓練風格 ---------- */
const MASTER_STYLES = [
  { id: "dominant", name: "支配施虐", desc: "以命令與束縛為樂，享受她睫毛上懸而未落的顫抖。" },
  { id: "gentle",   name: "溫柔調教", desc: "以耐性與撫慰，換她心甘情願把頸子湊進你的掌心。" },
  { id: "profit",   name: "純粹利益", desc: "一切皆有價碼。她的每一次低喘，都該被精算。" },
  { id: "lust",     name: "情慾沉淪", desc: "雙雙墜入情潮，早已分不清——是誰在飼養誰。" }
];

/* ---------- 魅魔種族 ---------- */
const RACES = [
  { key: "pure",      name: "純血魅魔", desc: "生於緋夜深處的血脈，以主人的體液為食，與你同源共息。" },
  { key: "fox",       name: "狐魅混血", desc: "尾尖藏著狡黠與慾念，會用最柔軟的方式套出你的底線。" },
  { key: "nightmare", name: "夢魘種",   desc: "棲息於夢的夾縫，以你未說出口的渴望為食，再還你一夜難安。" },
  { key: "blood",     name: "血契種",   desc: "以血為契、以吻為鎖，一旦認主便終生不渝——除非你先背叛。" },
  { key: "shade",     name: "影魅",     desc: "無骨無形，只在你熄燈之後，攀上你的背脊低語。" }
];

/* ---------- 個性 ---------- */
const PERSONALITIES = [
  { id: "proud",   name: "高傲", desc: "她仰著下巴看你，眼裡卻藏不住被你馴服前的倔強。" },
  { id: "shy",     name: "羞怯", desc: "每次對上視線便別開臉，耳尖紅得像要滴血。" },
  { id: "seducer", name: "誘惑", desc: "她太清楚自己的魅力，也毫不吝嗇地對你展露。" },
  { id: "rebel",   name: "叛逆", desc: "你的每一道命令，她都先狠狠瞪你一眼，再軟下膝蓋。" },
  { id: "clingy",  name: "依賴", desc: "離了你便惶惶不安，夜裡總要蜷在你腳邊才肯閉眼。" },
  { id: "lazy",    name: "慵懶", desc: "像隻曬足月光的貓，連拒絕你都透著一股漫不經心的媚。" }
];

/* ---------- 缺陷 ---------- */
const DEFECTS = [
  { id: "hidden_sick", name: "隱疾",       desc: "發作時體溫滾燙，需你徹夜照料，稍有不慎便香消玉殞。" },
  { id: "curse",       name: "詛咒",       desc: "她頸後烙著來路不明的咒紋，每逢月晦便會低泣不止。" },
  { id: "resistance",  name: "強烈反抗",   desc: "她至今仍會咬人。你餵進她嘴裡的每一口，都得先被齒尖試探。" },
  { id: "rune_riot",   name: "淫紋失控",   desc: "天生的紋路會在深夜自行甦醒，令她夾緊雙腿、無助地望向你。" },
  { id: "heat_cycle",  name: "發情期紊亂", desc: "她的週期毫無章法，說來就來，常把你們都逼到無處可退。" },
  { id: "bloodthirst", name: "血癮",       desc: "對你的氣味異常貪婪，若不定期滿足，她會焦躁得啃咬自己的唇。" }
];

/* ---------- 外貌 ---------- */
const APPEARANCES = [
  "一頭銀白長髮垂至腰際，月光落在上頭像流動的水銀。",
  "琥珀色的豎瞳，在暗處會泛起危險的金芒。",
  "乳白的肌膚幾乎半透明，隱約能看見青色的血脈。",
  "尾尖呈桃心狀，興奮時會不自主地一下一下拍打地面。",
  "雙角細小而精緻，像兩枚被打磨過的墨玉。",
  "唇色天生艷紅，彷彿才剛被誰吻得腫脹。"
];

/* ---------- 氣味 ---------- */
const SCENTS = [
  "晚香玉的甜膩混著一點體溫蒸出的汗意。",
  "焦糖被火微微烤焦的香，甜裡帶一絲苦。",
  "雨後潮濕的泥土與破土而出的嫩芽。",
  "龍涎般沉厚的香，聞久了會讓人心跳失序。",
  "乾涸的血腥混著一朵將謝的玫瑰。",
  "乾淨的皂香下，藏著一股只屬於她的、勾人的麝香。"
];

/* ---------- 魅魔名字池 ---------- */
const SUCCUBUS_NAMES = [
  "艾莉西亞", "莉莉絲", "緋音", "雪萊", "魅兒", "瑟琳", "緋羅",
  "夜琉璃", "瑪格麗特", "緋羽", "露娜", "伊芙", "緋蕾", "蝶衣", "緋娜", "月見"
];

/* ---------- 道具 ----------
   欄位：desc（文案）、choiceHint（AI 選項用法，僅持有時可用）、
   effects（四維變動）、masterHp（使用時扣主控體力，可選）、styleTag（語氣）。 ---------- */
const ITEMS = [
  /* ============ 日常補品 ============ */
  { id: "soothe_candy", name: "安撫蜜餞", category: "一般", price: 30, rankReq: 1,
    desc: "裹著蜜糖的果脯，甜意從舌尖一路暖進胃裡。用來安撫初來乍到的緊張，再合適不過。",
    choiceHint: "拈一顆蜜餞，餵進她的嘴裡",
    effects: { affection: 6, obedience: 1, stress: -4, hunger: -8 }, styleTag: "gentle" },

  { id: "herbal_tea", name: "舒緩花草茶", category: "一般", price: 60, rankReq: 1,
    desc: "以夜綻的花草熬煮，溫熱入喉，能撫平她繃緊的每一根神經。",
    choiceHint: "為她斟一杯溫熱的花草茶，看她小口啜飲",
    effects: { affection: 4, obedience: 0, stress: -8, hunger: -3 }, styleTag: "gentle" },

  { id: "aroma_oil", name: "凝神香薰油", category: "一般", price: 120, rankReq: 2,
    desc: "取自月下香草的凝萃，滴在腕間與頸側，能讓躁動的心緒一點點沉澱。",
    choiceHint: "將香薰油抹上她的頸側，讓她的呼吸慢下來",
    effects: { affection: 5, obedience: 1, stress: -12, hunger: 0 }, styleTag: "gentle" },

  { id: "honey_sweet", name: "蜜糖糕", category: "一般", price: 40, rankReq: 1,
    desc: "裹著糖霜的小點，甜得她瞇起眼睛。用食物換來的溫順，往往最不設防。",
    choiceHint: "拈起一塊蜜糖糕，遞到她唇邊",
    effects: { affection: 8, obedience: 2, stress: -3, hunger: -10 }, styleTag: "gentle" },

  { id: "calming_incense", name: "安神香", category: "一般", price: 50, rankReq: 1,
    desc: "裊裊青煙裡，她的緊繃一寸寸軟下去，像被人抽走了骨頭。",
    choiceHint: "點一爐安神香，讓她的緊繃一寸寸軟下去",
    effects: { affection: 3, obedience: 1, stress: -8, hunger: 0 }, styleTag: "gentle" },

  /* ============ 調教入門 ============ */
  { id: "soft_whip", name: "羽痕軟皮短鞭", category: "一般", price: 80, rankReq: 1,
    desc: "柔韌的短鞭，落下的力道輕如羽翼，卻能在肌膚上烙下淺淺的緋痕。痛意一閃而逝，規矩卻就此生根。",
    choiceHint: "讓鞭梢輕輕掃過她的背，留下一道淡緋",
    effects: { affection: 0, obedience: 8, stress: 5, hunger: 0 }, styleTag: "dominant" },

  { id: "crimson_gag", name: "緋紅噤聲口枷", category: "一般", price: 120, rankReq: 1,
    desc: "緋紅色的緘口之物，一旦扣上，她便只能發出破碎的嗚咽。那些傲慢的言語，再也無從出口。",
    choiceHint: "替她扣上，讓她的倔強只能化成一串嗚咽",
    effects: { affection: -1, obedience: 12, stress: 10, hunger: 0 }, styleTag: "dominant" },

  { id: "night_beads", name: "幽夜律動玉珠", category: "一般", price: 160, rankReq: 1,
    desc: "一串溫潤的玉珠，貼著體溫便開始細細震顫。沉入最深處，她會先僵住，再一寸寸軟化成水。",
    choiceHint: "讓玉珠沉入她最深處，看她的膝蓋慢慢發軟",
    effects: { affection: 8, obedience: 0, stress: -5, hunger: 5 }, styleTag: "lust" },

  { id: "velvet_rope", name: "絲絨束縛繩組", category: "一般", price: 140, rankReq: 1,
    desc: "柔韌的絲絨繩索，一圈圈纏上四肢，便再無反抗的餘地。被縛住的她，只能把自己全然交到你手裡。",
    choiceHint: "一圈圈縛住她的手腕與腳踝，看她放棄掙扎",
    effects: { affection: 0, obedience: 15, stress: 8, hunger: 0 }, styleTag: "dominant" },

  { id: "silk_ribbon", name: "黑絲緞帶", category: "一般", price: 60, rankReq: 1,
    desc: "一條能繞過手腕、也能繫住目光的黑絲。當它落在她的腕上，便不再是普通的緞帶。",
    choiceHint: "一圈一圈繞上她的腕，看她的呼吸亂了分寸",
    effects: { affection: 1, obedience: 6, stress: 5, hunger: 0 }, styleTag: "dominant" },

  { id: "feather_duster", name: "羽毛拂塵", category: "一般", price: 80, rankReq: 1,
    desc: "柔軟得過分的羽毛，輕輕掃過她最敏感的地方，便能逼出她最誠實的求饒。",
    choiceHint: "讓羽毛沿著她的脊線遊走，直到她忍不住縮起肩膀",
    effects: { affection: 5, obedience: 3, stress: 6, hunger: 2 }, styleTag: "gentle" },

  { id: "candle_wax", name: "燭台之淚", category: "一般", price: 90, rankReq: 2,
    desc: "溫熱的蠟油落在肌膚上凝成緋色。痛與燙交界的瞬間，她會記得是你給的。",
    choiceHint: "讓溫熱的蠟淚落在她的鎖骨，看它凝成緋色",
    effects: { affection: 0, obedience: 8, stress: 10, hunger: 3 }, styleTag: "dominant" },

  { id: "silver_collar", name: "銀製項圈", category: "一般", price: 120, rankReq: 2,
    desc: "內側刻著你的名字。她戴上之後，每一次吞嚥，都會意識到自己屬於誰。",
    choiceHint: "替她繫上，再輕輕一勒，逼她仰起頸子",
    effects: { affection: -2, obedience: 12, stress: 8, hunger: 0 }, styleTag: "dominant" },

  /* ============ 感官制約 ============ */
  { id: "onyx_blindfold", name: "黑曜遮光絲絨眼罩", category: "一般", price: 90, rankReq: 1,
    desc: "內裡墊著黑曜般柔軟的絲絨，一旦覆上雙目，世界便只剩黑暗。失去視覺的她，會對你的每一次觸碰異常敏感。",
    choiceHint: "覆上她的眼，讓黑暗把她的感知一寸寸放大",
    effects: { affection: 5, obedience: 0, stress: 8, hunger: 0 }, styleTag: "gentle" },

  { id: "silver_bell_clips", name: "銀鈴微刺敏感夾", category: "一般", price: 130, rankReq: 1,
    desc: "一對墜著銀鈴的小夾，咬住最嬌嫩的那一點。她每動一下，鈴聲與細密的刺痛便一齊響起，提醒她該有多乖。",
    choiceHint: "把銀鈴小夾咬上那兩點，聽她的呼吸碎成鈴音",
    effects: { affection: -1, obedience: 10, stress: 10, hunger: 0 }, styleTag: "dominant" },

  /* ============ 街區專屬 ============ */
  { id: "oldtown_incense", name: "舊城迷香", category: "街區", price: 150, rankReq: 2,
    desc: "舊城暗巷才買得到的密製香粉，據說能讓最冷淡的血脈都泛起薄紅。",
    choiceHint: "點上舊城迷香，看她的耳尖泛起薄紅",
    effects: { affection: 4, obedience: 4, stress: 4, hunger: 6 }, styleTag: "lust" },

  { id: "tower_page", name: "高塔禁書殘頁", category: "街區", price: 200, rankReq: 3,
    desc: "自高塔書閣撕下的一頁，上頭記載著讓魅魔主動索求的古老儀式。",
    choiceHint: "照著殘頁上的儀式，低聲念出那句古老的咒",
    effects: { affection: -1, obedience: 10, stress: 6, hunger: 8 }, styleTag: "profit" },

  /* ============ 黑市秘藥 ============ */
  { id: "charm_essence", name: "魅惑濃縮原液", category: "秘藥", price: 250, rankReq: 2,
    desc: "黑市裡流傳的濃縮秘藥，一滴便能讓最矜持的血脈泛起薄紅。她會主動朝你挨近，眼裡漾起化不開的情潮。",
    choiceHint: "在她唇間點一滴原液，看她主動湊近",
    effects: { affection: 12, obedience: -2, stress: -6, hunger: 10 }, styleTag: "lust" },

  { id: "abyss_spirit", name: "深淵精氣玉液", category: "秘藥", price: 500, rankReq: 4,
    desc: "自深淵熬煉的秘液，能令魅魔的氣血大盛，卻也勾得她飢渴難耐。以主控體液為餌時，這是最鋒利的一味藥。",
    choiceHint: "餵她飲下，看她眼底的飢渴燒起來",
    effects: { affection: 6, obedience: 5, stress: 5, hunger: 25 }, styleTag: "profit" },

  /* ============ 高階禁忌【緋夜禁典·極刑】 ============ */
  { id: "codex1", name: "【緋夜禁典·極刑】壹·荊棘之吻", category: "高階", price: 600, rankReq: 4,
    desc: "柔韌的荊棘藤蔓，貼膚便會綻出細小的刺。每一次收緊，都是一記綿長的吻，痛與快意同時滲進她的每一寸知覺。",
    choiceHint: "讓荊棘之吻攀上她的手腕，一點一點收緊",
    effects: { affection: 2, obedience: 25, stress: 18, hunger: 10 }, styleTag: "dominant" },

  { id: "codex2", name: "【緋夜禁典·極刑】貳·極晝之牢", category: "高階", price: 800, rankReq: 4,
    desc: "以純白光線織成的牢籠，剝奪她所有陰影。在那無處躲藏的光裡，她只能坦露一切，任你審視、任你處置。",
    choiceHint: "將她關進極晝之牢，剝去她所有陰影",
    effects: { affection: 0, obedience: 30, stress: 22, hunger: 6 }, styleTag: "profit" },

  { id: "codex3", name: "【緋夜禁典·極刑】參·深淵之舌", category: "高階", price: 1000, rankReq: 5,
    desc: "由深淵觸鬚淬煉而成的活物，會循著她的體溫攀附、舔舐、鑽探，直到她連求饒都碎成斷續的氣音。",
    choiceHint: "放出深淵之舌，任它循著她的體溫攀附",
    effects: { affection: 4, obedience: 22, stress: 26, hunger: 14 }, styleTag: "lust" },

  /* ============ 黑市 禁忌款 ============ */
  { id: "bm_spiked_rod", name: "【黑市·禁忌】異形棘刺巨型玉棒", category: "高階", price: 450, rankReq: 2,
    desc: "黑市深處才有的異形重器，通體佈滿柔韌的棘刺，規格遠超尋常。強行撐開的瞬間，痛楚與滅頂的快意會同時淹沒她。",
    choiceHint: "取出那件棘刺重器，在她耳畔問她準備好了沒",
    effects: { affection: 15, obedience: 25, stress: 25, hunger: 10 }, styleTag: "dominant" },

  { id: "bm_blood_clips", name: "【黑市·禁忌】血誓螺旋絞骨合金夾", category: "高階", price: 520, rankReq: 2,
    desc: "配著調節螺絲與細密咬齒的金屬夾，旋緊時如細針穿心，將最敏感的一點絞至充血。痛得發抖，卻也羞得發燙。",
    choiceHint: "將合金夾絞上，聽她倒抽一口氣",
    effects: { affection: 0, obedience: 30, stress: 25, hunger: 0 }, styleTag: "dominant" },

  { id: "bm_tri_shackle", name: "【黑市·禁忌】深淵拘魂重鎖三叉枷", category: "高階", price: 700, rankReq: 3,
    desc: "沉重冰冷的合金重枷，三叉交鎖，迫使她維持最羞恥的跪姿。稍有掙扎，枷鏈便會勒得更緊，教她學會靜止。",
    choiceHint: "將重枷扣上，看她顫抖著維持那羞恥的姿態",
    effects: { affection: 0, obedience: 40, stress: 35, hunger: 0 }, masterHp: -8, styleTag: "dominant" },

  { id: "bm_iron_mask", name: "【黑市·禁忌】全覆式剝奪拘靈鐵面", category: "高階", price: 750, rankReq: 3,
    desc: "厚重冰冷的全覆面罩，封死視覺、聽覺與聲音。她被投入無邊的黑暗與孤獨，在恐慌裡，最終只能放棄抵抗。",
    choiceHint: "為她扣上鐵面，讓黑暗吞沒她所有知覺",
    effects: { affection: -5, obedience: 45, stress: 35, hunger: 0 }, styleTag: "dominant" },

  { id: "bm_twin_serpent", name: "【黑市·禁忌】雙首蛇噬律動儀", category: "高階", price: 950, rankReq: 4,
    desc: "形如雙首魔蛇的活物儀器，同時探入兩處深處，隨體溫膨脹、震顫。在難以忍受的脹痛與侵略中，她的意志會一寸寸崩解。",
    choiceHint: "放出那雙首的律動儀，任它同時深入",
    effects: { affection: 25, obedience: 50, stress: 40, hunger: 12 }, styleTag: "lust" }
];

/* ---------- 街區與房產 ---------- */
const DISTRICTS = [
  {
    id: "oldtown", name: "緋夜舊城", isHigh: false,
    desc: "緋夜最早甦醒的街區，石牆斑駁，燈火昏黃，暗巷裡總有低價的慾望在流動。",
    houses: [
      { id: "oldtown_loft", name: "臨街閣樓", price: 0, desc: "一間能望見窄巷的閣樓，簡陋但足夠藏起你第一個獵物。", tags: ["起點"] },
      { id: "oldtown_basement", name: "地窖暗室", price: 500, desc: "石砌的地窖，隔音極佳，適合一些不便讓鄰居聽見的飼養。", tags: ["隔音", "隱密"] }
    ]
  },
  {
    id: "lantern", name: "燈紅暗巷", isHigh: true,
    desc: "霓虹與紅燈籠交織的不夜街，各色魅魔在此拋售笑靨，也拋售自己。",
    houses: [
      { id: "lantern_parlor", name: "紅簾雅房", price: 900, desc: "垂著紅絲絨簾的雅房，進出的都是熟客，談笑間滿是暗號。", tags: ["人脈"] },
      { id: "lantern_penthouse", name: "頂樓香巢", price: 1800, desc: "俯瞰整條燈紅街的頂樓，適合豢養多隻魅魔，夜夜笙歌。", tags: ["寬敞"] }
    ]
  },
  {
    id: "tower", name: "高塔區", isHigh: true,
    desc: "緋夜的權力中樞，潔白的尖塔刺入夜空，官方契約市場便設於此。",
    houses: [
      { id: "tower_suite", name: "塔間書齋", price: 2200, desc: "滿牆藏書的書齋，是研習調教秘術的上佳之地。", tags: ["學識"] },
      { id: "tower_estate", name: "高塔莊園", price: 4500, desc: "帶花園與私人浴池的莊園，足以匹配你即將到手的地位。", tags: ["奢華", "庭園"] }
    ]
  },
  {
    id: "outskirt", name: "郊外莊園", isHigh: true,
    desc: "遠離城區的幽靜之地，適合圈養不願見光的血脈，也適合藏起更深的祕密。",
    houses: [
      { id: "outskirt_villa", name: "隱林別墅", price: 6000, desc: "被黑森林環抱的別墅，誰也不會找到這裡，誰也聽不見任何聲響。", tags: ["絕密", "廣闊"] }
    ]
  }
];

/* ---------- 魅魔市場（購買） ---------- */
const MARKET_INFO = {
  official: {
    type: "official", name: "官方契約市場",
    desc: "高塔區的契約大廳，雪白廊柱下陳列著血統純正、體檢完備的魅魔。價格高昂，但每一筆買賣都有高塔的公章作保。",
    riskLabel: "低風險", riskDesc: "健康、血統純正、性情穩定。"
  },
  blackmarket: {
    type: "blackmarket", name: "暗巷黑市",
    desc: "燈紅暗巷深處的非法集會，鐵籠鏽跡斑斑，裡頭擠著來路不明的貨色。價格低得可疑，買定離手、概不退換。",
    riskLabel: "高風險", riskDesc: "來路不明、或有隱疾詛咒，甚至激烈反抗。"
  }
};

const OFFICIAL_BACKGROUNDS = [
  "高塔御用血脈，自幼受契約禮儀薰陶。前任主人因職務調離，她自願重回契約廳待價而沽。體檢報告乾淨得不見半點瑕疵，是今夜最搶手的純血。",
  "出身緋夜育成院，血統可上溯七代貴族。性情溫馴、契約履歷零污點，只等著下一任主人牽走她腕上的絲帶。",
  "曾長期服侍高塔書記官的契約侍從，舉止得體、最懂得察言觀色。開價雖高，卻能省去調教初期所有的折騰。",
  "受過完整禮儀訓練的名門之女，走進契約廳時連腳步都像踩著月光。她很清楚自己的身價，也清楚自己終將屬於誰。"
];

const BLACKMARKET_BACKGROUNDS = [
  "她頸後烙著一圈發黑的咒紋，來歷無人肯說。鐵籠外的木牌只草草寫著『買定離手』。據說上一位主人，如今還躺在病榻上沒能起身。",
  "從偏遠部落被強擄來的混血，眼裡全是戒備，昨夜才剛咬傷了一個伸手摸她的看客。牙齒很利，價錢卻低得讓人心癢。",
  "被詛咒纏身的可憐兒，每逢月晦便低泣不止。賣家急著脫手，只求有人肯連夜帶走，價錢好談。",
  "她縮在籠角，皮膚滾燙，像是正發著高燒。人販子拍著胸脯保證『只是小病』，可那雙過分明亮的眼睛，分明藏著別的什麼。",
  "來路不明的血脈，身上新傷舊痕交疊，眼神卻野得嚇人。她的價碼被一壓再壓，只因為據說她上一位主人，是被她咬斷了手腕。"
];

/* ---------- 出售管道 ---------- */
const SELL_CHANNELS = {
  official:    { name: "官方契約廳", riskLabel: "低風險", desc: "手續正規、估價保守。" },
  blackmarket: { name: "暗巷黑市",   riskLabel: "高風險", desc: "價碼誘人，買家未必是「人」。" },
  auction:     { name: "拍賣會",     riskLabel: "最高價", desc: "燈海中央，競價落槌。" }
};

/* ---------- 黑市奇怪買家事件池 ---------- */
const WEIRD_BUYERS = [
  {
    id: "cult", name: "披血紅祭袍的祭司", priceMult: 1.9,
    flavor: "一名披著血紅祭袍的祭司在籠前駐足，指尖沿著她的輪廓隔空描摹。他開價高得離譜，卻說要帶她回去「侍奉月神」。",
    effect: { gold: 0, hp: -8, exp: 10 },
    consequenceText: "他離去時的回眸，讓你在往後幾夜都睡不安穩。"
  },
  {
    id: "noble", name: "戴單片眼鏡的貴族", priceMult: 1.6,
    flavor: "他咯咯笑著，出價時手裡把玩著一枚帶血的戒指，說要為他「上一任收藏」找個伴。",
    effect: { gold: 0, hp: 0, exp: 5 },
    consequenceText: "他走後，你才發現錢袋裡多了幾枚來路不明的血斑金幣。"
  },
  {
    id: "fugitive", name: "壓低帽簷的通緝販子", priceMult: 2.1,
    flavor: "滿身硝煙味的男人壓低帽簷，丟下一袋沉甸甸的金幣。你認出他——正是高塔通緝令上那張臉。",
    effect: { gold: 0, hp: -5, exp: 0 },
    consequenceText: "往後幾夜，高塔巡衛總在你的屋前多繞兩圈。"
  },
  {
    id: "sadist", name: "裹著黑斗篷的收藏家", priceMult: 1.8,
    flavor: "他的眼神像在丈量獵物，低聲問她會不會哭。他出的價很高，高得讓人不寒而慄。",
    effect: { gold: 0, hp: -3, exp: 8 },
    consequenceText: "你把她交了出去。夜裡無端驚醒，總覺得有人在你窗外數著呼吸。"
  },
  {
    id: "hunter", name: "自稱血族獵人的老人", priceMult: 2.3,
    flavor: "他露出森白的牙，說他只需要她的一點血，其餘都好談。開出的價碼，足以買下半條燈紅街。",
    effect: { gold: 0, hp: -10, exp: 12 },
    consequenceText: "交易成了。只是你的手腕上，多了一道細細的、癢得發疼的紅痕。"
  },
  {
    id: "broker", name: "操著濃重口音的掮客", priceMult: 1.5,
    flavor: "他拍著胸脯保證現款，點錢時手指快得看不清。成交後你才發現，袋底墊著幾枚假幣。",
    effect: { gold: -80, hp: 0, exp: 0 },
    consequenceText: "你被擺了一道，少了幾枚真金。"
  }
];

/* ---------- 拍賣會 ---------- */
const AUCTION_INFO = {
  commission: 0.15,
  minObedience: 75,
  minAffection: 55,
  desc: "燈紅暗巷頂樓的競價。只有最上等的貨色，才配站上這片燈海中央。"
};

/* ---------- 永久契約 ---------- */
const CONTRACT_INFO = {
  permanentAffectionReq: 70,
  permanentCost: 500,
  permanentDesc: "以血與吻烙下的永久之契。她從此不再是可以易手的貨物，而是你緋夜的一部分。",
  bonusesDesc: "每日好感自然增長、壓力緩解；調教效率提升；並開啟只屬於她的專屬劇情。"
};

/* ---------- 開場文案 ---------- */
const GAME_INTRO = [
  "緋夜不會真正天亮。當燈紅街的燈籠一盞盞亮起，你便知道，又到了飼育的時刻。",
  "你是緋夜城的飼育員，專司收容、馴養那些以慾念為食的魅魔。而今晚，你的錢袋微沉，懷裡揣著一紙新的契約。",
  "要從何處開始——是踏進雪白的高塔契約廳，還是鑽入燈紅暗巷最深處的鐵籠之間？"
];
