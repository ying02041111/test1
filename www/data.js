// www/data.js - 緋夜飼育錄 全域設定與常數庫

// 1. 主控階級系統 (Master Ranks)
const MASTER_RANKS = [
    { rank: 1, title: "見習飼育員", reqExp: 0, nextExp: 120, staminaDiscount: 0, unlockPlus: false },
    { rank: 2, title: "熟練侍從", reqExp: 120, nextExp: 350, staminaDiscount: 0.10, unlockPlus: true },
    { rank: 3, title: "高階調教師", reqExp: 350, nextExp: 800, staminaDiscount: 0.20, unlockPlus: true },
    { rank: 4, title: "夜幕支配者", reqExp: 800, nextExp: 1600, staminaDiscount: 0.30, unlockPlus: true },
    { rank: 5, title: "緋夜領主", reqExp: 1600, nextExp: 99999, staminaDiscount: 0.40, unlockPlus: true }
];

// 2. 主控調教風格設定
const MASTER_STYLES = {
    dom: {
        id: "dom",
        name: "支配施虐型",
        desc: "冷酷嚴苛，崇尚威嚴、威懾力與絕對服從。習慣立下不可動搖的規矩，透過刺痛與威壓瓦解抵抗心。"
    },
    soft: {
        id: "soft",
        name: "溫柔調教型",
        desc: "循循善誘，重視安撫、體溫與精神依附。先攻破內心防線，讓魅魔在被救贖的錯覺中沉淪依賴。"
    },
    profit: {
        id: "profit",
        name: "純粹利益型",
        desc: "冷血而精確的商人思維。將魅魔視為名貴的高風險契約物，冷靜計算每一次調教的得失與損耗。"
    },
    lust: {
        id: "lust",
        name: "情慾沉淪型",
        desc: "熱中於雙方肉體糾纏與反客為主的極致快感。善於挑動原始本能，享受主從邊界的模糊與曖昧拉扯。"
    }
};

// 3. 街區與房產配置 (District & Housing)
const DISTRICTS = [
    {
        id: "d_slums",
        name: "薄霧下城區 (貧民窟/黑市邊陲)",
        desc: "潮濕且治安混亂，充斥粗製濫造但效果強烈的違禁藥物與野蠻刑具。",
        houses: [
            { id: "h_attic", name: "陰暗閣樓", price: 300, rent: 15, capacity: 1, comfort: 10, desc: "勉強遮風避雨，空間狹窄局促。" },
            { id: "h_basement", name: "廢棄地下酒窖", price: 650, rent: 30, capacity: 2, comfort: 25, desc: "隱蔽性高，濕氣重，適合封閉訓練。" }
        ]
    },
    {
        id: "d_midtown",
        name: "薔薇中城區 (平民繁華街/工匠坊)",
        desc: "人流密集，物資充沛，流傳精緻的手工拘束皮具與調情器物。",
        houses: [
            { id: "h_apartment", name: "紅磚公寓二樓", price: 1800, rent: 70, capacity: 3, comfort: 50, desc: "採光良好，附帶隔音小隔間。" },
            { id: "h_garden_house", name: "庭院雙層小築", price: 3500, rent: 130, capacity: 4, comfort: 70, desc: "擁有隱密後院，環境宜人放鬆。" }
        ]
    },
    {
        id: "d_nobles",
        name: "緋紅貴族特區 (上層界/魔導拍賣行)",
        desc: "極度奢華的頂級領地，深藏高階魔導附魔拘束具與【緋夜禁典·極刑】重器。",
        houses: [
            { id: "h_mansion", name: "黑曜石公館", price: 8000, rent: 280, capacity: 6, comfort: 95, desc: "配備頂級香薰溫泉與全封閉魔導密室。" }
        ]
    }
];

// 4. 糧食與體液消耗
const FOODS = {
    normal: { id: "normal", name: "標準口糧", costGold: 10, costStamina: 0, hungerRecover: 30 },
    luxury: { id: "luxury", name: "特調蜜糖鮮肉", costGold: 30, costStamina: 0, hungerRecover: 60 },
    fluids: { id: "fluids", name: "主控體液 (純血專用)", costGold: 0, costStamina: 25, hungerRecover: 50 }
};

// 5. 種族設定
const RACES = {
    pureblood: {
        id: "pureblood",
        name: "純血魅魔",
        foodType: "fluids",
        traitDesc: "極端高傲且依賴主人的精華體液，無法消化世俗食物；極度飢渴時會化身索求體液的本能野獸。"
    },
    dream: {
        id: "dream",
        name: "幻夢魅魔",
        foodType: "luxury",
        traitDesc: "擅長精神感知與情緒反饋，喜好甜品，內心世界豐富敏感。"
    },
    feral: {
        id: "feral",
        name: "野性魅魔",
        foodType: "normal",
        traitDesc: "生命力頑強，帶有野獸般的警戒心與敏銳直覺，抗壓適應力高。"
    }
};

// 6. 個性設定與成長修正
const PERSONALITIES = [
    { id: "tsundere", name: "傲嬌刺蝟", desc: "表面尖酸抗拒、口是心非，防備極重。", initialRate: 0.4, contrastRate: 1.6 },
    { id: "kuudere", name: "極寒冰霜", desc: "寡言冷靜，幾乎不表現情感，難以親近。", initialRate: 0.4, contrastRate: 1.6 },
    { id: "yandere", name: "病態依戀", desc: "起步較快，對認定的主人具有強烈占有慾與黏人性。", initialRate: 0.9, contrastRate: 1.3 },
    { id: "obedient", name: "溫馴柔順", desc: "習慣聽從命令，內心脆弱易受傷。", initialRate: 1.1, contrastRate: 1.1 },
    { id: "seductive", name: "放浪妖姬", desc: "深諳男女誘惑之道，喜好反客為主調戲主人。", initialRate: 0.8, contrastRate: 1.4 }
];

// 7. 隨機缺陷庫 (DEFECTS)
const DEFECTS = [
    { id: "fear_touch", name: "肌膚恐懼", desc: "受到肢體接觸時容易恐慌戰慄，初期親密訓練難度增加。" },
    { id: "glass_heart", name: "琉璃脆心", desc: "受到懲罰或嚴厲訓斥時壓力倍增。" },
    { id: "lethargy", name: "深眠症候群", desc: "時常陷入昏睡，行動與體力消耗速度快。" },
    { id: "rebellious", name: "反骨之刺", desc: "心懷叛逆，服從度偏低時極易出言頂撞。" },
    { id: "none", name: "身心健全", desc: "身心機能平衡穩定，無明顯神經或肉體缺陷。" }
];

// 8. 外觀與氣味庫
const APPEARANCES = [
    "銀白微捲長髮配暗紫眼眸", "烏黑齊肩短髮與血色瞳孔", "淡金波浪長髮與碧綠貓瞳",
    "深緋色長髮配金黃豎瞳", "灰藍色編髮與迷濛灰霧眼眸"
];

const SCENTS = [
    "甜膩多汁的熟透蜜桃香", "清冽微苦的夜來香氛", "濃郁誘惑的黑巧克力甜香",
    "微酸刺激的野莓果香", "如煙似霧的雪松焚香"
];

// 9. 完整道具庫（嚴格落實：名字 / 文案 / 數值變動 三段式規範）
const ITEMS = {
    // 【基礎日常品】(全區通用)
    snack: {
        id: "snack",
        district: "all",
        name: "低階安撫蜜餞",
        price: 30,
        reqRank: 1,
        desc: "下城區常見的手工蜜漬果乾，甜味濃郁微澀。能稍微平復魅魔受創的不安情緒，作為聽話時的隨手獎賞。",
        statDesc: "壓力 -15、主控經驗 +5",
        effect: { stress: -15, exp: 5 }
    },
    tea: {
        id: "tea",
        district: "all",
        name: "舒緩花草茶",
        price: 60,
        reqRank: 1,
        desc: "以白甘菊與薄荷葉沖泡的溫熱茶飲。能平穩躁動的氣血，令主控疲憊的肉體迅速回春。",
        statDesc: "主控體力 +30、主控經驗 +5",
        effect: { masterHp: 30, exp: 5 }
    },
    scent_oil: {
        id: "scent_oil",
        district: "all",
        name: "凝神香薰油",
        price: 120,
        reqRank: 1,
        desc: "調和多種幽夜花精的精油，燃點時散發令人放鬆心防的微甜幽香，拉近彼此距離。",
        statDesc: "好感度 +5、主控經驗 +10",
        effect: { relation: 5, exp: 10 }
    },

    // 【薄霧下城區專屬 - 粗陋/烈性/違禁】
    slum_aphrodisiac: {
        id: "slum_aphrodisiac",
        district: "d_slums",
        name: "粗製烈性催情脂",
        price: 90,
        reqRank: 1,
        desc: "地下作坊私熬的渾濁油脂，帶有刺鼻辛香。塗抹於嬌嫩脆弱處會引發強烈燥熱與情動發熱，逼得魅魔呼吸急促，但伴隨難耐的灼痛痛苦。",
        statDesc: "好感度 +15、壓力 +12、主控經驗 +15",
        effect: { relation: 15, stress: 12, exp: 15 }
    },
    slum_rusty_collar: {
        id: "slum_rusty_collar",
        district: "d_slums",
        name: "生鏽鈍齒束頸圈",
        price: 110,
        reqRank: 1,
        desc: "奴隸營流出的粗糙暗鐵頸圈，內襯有粗糙的微刺鈍齒。稍有拉扯便會擦破頸膚帶來刺痛，時刻提醒魅魔當前的卑賤處境。",
        statDesc: "服從度 +16、壓力 +14、主控經驗 +15",
        effect: { obedience: 16, stress: 14, exp: 15 }
    },
    slum_sleep_wine: {
        id: "slum_sleep_wine",
        district: "d_slums",
        name: "黑市私釀昏睡濁酒",
        price: 140,
        reqRank: 1,
        desc: "混入致幻草根的烈性濁酒。飲下後能讓性情暴戾、反抗激烈的魅魔迅速四肢脫力，神智昏沉地任由擺布。",
        statDesc: "服從度 +10、壓力 -20、主控經驗 +15",
        effect: { obedience: 10, stress: -20, exp: 15 }
    },

    // 【薔薇中城區專屬 - 工藝情趣/情調/微痛】
    mid_candle: {
        id: "mid_candle",
        district: "d_midtown",
        name: "薔薇低溫香薰蠟燭",
        price: 150,
        reqRank: 1,
        desc: "低溫精煉的天然蜂蠟，滴落在肌膚上只會帶來短暫的微熱刺痛感，伴隨濃郁玫瑰甜香，兼具情調調弄與輕度責罰。",
        statDesc: "好感度 +10、服從度 +10、壓力 +5、主控經驗 +20",
        effect: { relation: 10, obedience: 10, stress: 5, exp: 20 }
    },
    mid_blindfold: {
        id: "mid_blindfold",
        district: "d_midtown",
        name: "黑曜遮光絲絨眼罩",
        price: 90,
        reqRank: 1,
        desc: "雙層加厚絲絨眼罩，能徹底剝奪視野。陷入純粹黑暗的魅魔會對觸摸與聲音異常敏感，呼吸逐漸急促混亂。",
        statDesc: "好感度 +6、服從度 +8、壓力 +6、主控經驗 +15",
        effect: { relation: 6, obedience: 8, stress: 6, exp: 15 }
    },
    mid_clamp: {
        id: "mid_clamp",
        district: "d_midtown",
        name: "銀鈴微刺敏感夾",
        price: 130,
        reqRank: 1,
        desc: "精鋼打造的敏銳金屬夾，末端繫著小銀鈴。咬住頂端嬌嫩處時伴隨持續微刺，任何輕微掙扎都會引發鈴聲回響與刺痛羞恥。",
        statDesc: "服從度 +12、壓力 +10、主控經驗 +20",
        effect: { obedience: 12, stress: 10, exp: 20 }
    },
    mid_whip: {
        id: "mid_whip",
        district: "d_midtown",
        name: "軟鞣山羊皮散尾短鞭",
        price: 180,
        reqRank: 1,
        desc: "中城區工匠精鞣的散尾皮鞭。抽打時破空聲清脆震耳，能在肌膚表面留下交錯紅痕卻不致皮開肉綻，專門用於在閨閣中立下規矩。",
        statDesc: "服從度 +18、壓力 +12、主控經驗 +25",
        effect: { obedience: 18, stress: 12, exp: 25 }
    },
    mid_rope: {
        id: "mid_rope",
        district: "d_midtown",
        name: "絲絨束縛繩組",
        price: 140,
        reqRank: 1,
        desc: "柔韌且不勒傷肌膚的特殊縛繩。能輕易將魅魔四肢固定出羞恥無助的後屈跪姿，完全剝奪自主反抗能力。",
        statDesc: "服從度 +15、壓力 +8、主控經驗 +20",
        effect: { obedience: 15, stress: 8, exp: 20 }
    },
    mid_ballgag: {
        id: "mid_ballgag",
        district: "d_midtown",
        name: "緋紅噤聲口枷",
        price: 120,
        reqRank: 1,
        desc: "真皮繫帶搭配朱紅球塞。強行撐開口腔封住言語，魅魔只能在口水溢出中發出嗚咽與急促鼻息，有效磨滅其高傲矜持。",
        statDesc: "服從度 +14、壓力 +10、主控經驗 +20",
        effect: { obedience: 14, stress: 10, exp: 20 }
    },
    mid_bead: {
        id: "mid_bead",
        district: "d_midtown",
        name: "幽夜秘穴跳動玉珠",
        price: 160,
        reqRank: 1,
        desc: "封入微型魔導核心的溫潤玉珠。推入體內深處後持續規律震顫，使魅魔雙腿酸軟戰慄，無法維持站立。",
        statDesc: "好感度 +12、壓力 -5、主控經驗 +20",
        effect: { relation: 12, stress: -5, exp: 20 }
    },

    // 【貴族特區專屬 - 奢華魔導/滋養】
    noble_rune_shackles: {
        id: "noble_rune_shackles",
        district: "d_nobles",
        name: "秘銀符文拘束環組",
        price: 580,
        reqRank: 2,
        desc: "刻滿吸魔古語的秘銀四肢環。套上後能持續汲取魅魔體內的深淵魔力，使其渾身酥軟無力，無從施展任何誘惑法術。",
        statDesc: "服從度 +35、壓力 +15、主控經驗 +40 (需 Rank 2)",
        effect: { obedience: 35, stress: 15, exp: 40 }
    },
    noble_elixir_nectar: {
        id: "noble_elixir_nectar",
        district: "d_nobles",
        name: "幻夢純血滋養瓊漿",
        price: 720,
        reqRank: 2,
        desc: "宮廷秘傳的極品精粹，散發迷醉芬芳。純血魅魔飲下後能迅速補足深層飢渴，飢餓度大幅洗淨，好感度狂飆。",
        statDesc: "好感度 +35、飢餓度 -80、壓力 -30、主控經驗 +50 (需 Rank 2)",
        effect: { relation: 35, hunger: -80, stress: -30, exp: 50 }
    },

    // 【緋夜禁典·極刑 禁忌重器 - 異形/穿刺/劇痛/高階專屬】
    plus_screw_clamp: {
        id: "plus_screw_clamp",
        district: "d_nobles",
        name: "【緋夜禁典·極刑】血誓螺旋絞骨合金夾",
        price: 520,
        reqRank: 2,
        desc: "附帶微型倒齒與精密調節旋鈕的冷鍛合金夾。每擰緊半圈便如細針寸寸刺透敏感深處，帶來令人打顫的持續絞痛，直至嬌嫩處充血微滲血珠。",
        statDesc: "服從度 +32、壓力 +26、主控經驗 +45 (需 Rank 2 熟練侍從)",
        effect: { obedience: 32, stress: 26, exp: 45 }
    },
    plus_dildo: {
        id: "plus_dildo",
        district: "d_nobles",
        name: "【緋夜禁典·極刑】異形棘刺巨型玉棒",
        price: 650,
        reqRank: 2,
        desc: "規格遠超常人體態的異形黑曜石器具，通體密布圓潤微彎的倒刺。強行開拓深入體內時，撕裂般的脹痛與深層肉體壓迫能瞬間粉碎意志。",
        statDesc: "服從度 +38、好感度 +15、壓力 +30、主控經驗 +55 (需 Rank 2 熟練侍從)",
        effect: { obedience: 38, relation: 15, stress: 30, exp: 55 }
    },
    plus_mask: {
        id: "plus_mask",
        district: "d_nobles",
        name: "【緋夜禁典·極刑】全覆式剝奪拘靈鐵面",
        price: 750,
        reqRank: 3,
        desc: "全密封的金屬重面具。徹底封死視覺、聽覺與發聲器官，將受刑者打入無邊無際的死寂恐慌之中，使其精神徹底依附於唯一施加痛感的主控。",
        statDesc: "服從度 +48、好感度 -5、壓力 +38、主控經驗 +65 (需 Rank 3 高階調教師)",
        effect: { obedience: 48, relation: -5, stress: 38, exp: 65 }
    },
    plus_pillory: {
        id: "plus_pillory",
        district: "d_nobles",
        name: "【緋夜禁典·極刑】深淵拘魂重鎖三叉枷",
        price: 820,
        reqRank: 3,
        desc: "沉重冰冷的合金重刑枷，將頸項與雙腕鎖定於無法合攏的極端羞恥高度。受刑者稍作扭動便會壓迫鎖骨與頸椎，伴隨劇烈痛楚與肌理痙攣。",
        statDesc: "服從度 +52、壓力 +42、主控經驗 +70 (需 Rank 3 高階調教師)",
        effect: { obedience: 52, stress: 42, exp: 70 }
    },
    plus_double_dildo: {
        id: "plus_double_dildo",
        district: "d_nobles",
        name: "【緋夜禁典·極刑】雙首蛇噬深腔律動儀",
        price: 980,
        reqRank: 4,
        desc: "形如雙首魔蛇的異形雙向貫通重器。同時沒入前後兩處深處並高速震動鼓脹，在難以忍受的劇烈脹痛與肉體侵略中徹底瓦解一切自尊與理智。",
        statDesc: "服從度 +60、好感度 +25、壓力 +45、主控經驗 +90 (需 Rank 4 夜幕支配者)",
        effect: { obedience: 60, relation: 25, stress: 45, exp: 90 }
    },
    plus_pheromone: {
        id: "plus_pheromone",
        district: "d_nobles",
        name: "【緋夜禁典·極刑】魅惑濃縮原液",
        price: 400,
        reqRank: 2,
        desc: "提煉自高階魅魔心頭血的荷爾蒙原油。極端強烈的氣味能強制破開魅魔冷酷的心防，使其下意識對主控產生難以抗拒的情動本能。",
        statDesc: "好感度 +25、壓力 -15、主控經驗 +40 (需 Rank 2 熟練侍從)",
        effect: { relation: 25, stress: -15, exp: 40 }
    },
    plus_elixir: {
        id: "plus_elixir",
        district: "d_nobles",
        name: "【緋夜禁典·極刑】深淵精氣玉液",
        price: 850,
        reqRank: 4,
        desc: "凝結深淵生命之泉的至寶。主控飲下後全身疲憊與虧空瞬間蕩滌，體力立刻全數補滿。",
        statDesc: "主控體力完全恢復 (100%)、主控經驗 +50 (需 Rank 4 夜幕支配者)",
        effect: { masterHpFull: true, exp: 50 }
    }
};
