// www/data.js - 緋夜飼育錄 全域設定與常數庫

// 1. 主控階級系統 (Master Ranks)
const MASTER_RANKS = [
    { rank: 1, title: "見習飼育員", reqExp: 0, staminaDiscount: 0, unlockPlus: false },
    { rank: 2, title: "熟練侍從", reqExp: 120, staminaDiscount: 0.10, unlockPlus: true },
    { rank: 3, title: "高階調教師", reqExp: 350, staminaDiscount: 0.20, unlockPlus: true },
    { rank: 4, title: "夜幕支配者", reqExp: 800, staminaDiscount: 0.30, unlockPlus: true },
    { rank: 5, title: "緋夜領主", reqExp: 1600, staminaDiscount: 0.40, unlockPlus: true }
];

// 2. 街區與房產配置 (District & Housing)
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
        desc: "極度奢華的頂級領地，深藏高階魔導附魔拘束具與黑市PLUS禁忌器具。",
        houses: [
            { id: "h_mansion", name: "黑曜石公館", price: 8000, rent: 280, capacity: 6, comfort: 95, desc: "配備頂級香薰溫泉與全封閉魔導密室。" }
        ]
    }
];

// 3. 糧食與體液消耗
const FOODS = {
    normal: { id: "normal", name: "標準口糧", costGold: 10, costStamina: 0, hungerRecover: 30 },
    luxury: { id: "luxury", name: "特調蜜糖鮮肉", costGold: 30, costStamina: 0, hungerRecover: 60 },
    fluids: { id: "fluids", name: "主控體液 (純血專用)", costGold: 0, costStamina: 25, hungerRecover: 50 }
};

// 4. 種族設定
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

// 5. 個性設定與成長修正
const PERSONALITIES = [
    { id: "tsundere", name: "傲嬌刺蝟", desc: "表面尖酸抗拒、口是心非，防備極重。", initialRate: 0.4, contrastRate: 1.6 },
    { id: "kuudere", name: "極寒冰霜", desc: "寡言冷靜，幾乎不表現情感，難以親近。", initialRate: 0.4, contrastRate: 1.6 },
    { id: "yandere", name: "病態依戀", desc: "起步較快，對認定的主人具有強烈占有慾與黏人性。", initialRate: 0.9, contrastRate: 1.3 },
    { id: "obedient", name: "溫馴柔順", desc: "習慣聽從命令，內心脆弱易受傷。", initialRate: 1.1, contrastRate: 1.1 },
    { id: "seductive", name: "放浪妖姬", desc: "深諳男女誘惑之道，喜好反客為主調戲主人。", initialRate: 0.8, contrastRate: 1.4 }
];

// 6. 隨機缺陷庫 (DEFECTS)
const DEFECTS = [
    { id: "fear_touch", name: "肌膚恐懼", desc: "受到肢體接觸時容易恐慌戰慄，初期親密訓練難度增加。" },
    { id: "glass_heart", name: "琉璃脆心", desc: "受到懲罰或嚴厲訓斥時壓力倍增。" },
    { id: "lethargy", name: "深眠症候群", desc: "時常陷入昏睡，行動與體力消耗速度快。" },
    { id: "rebellious", name: "反骨之刺", desc: "心懷叛逆，服從度偏低時極易出言頂撞。" },
    { id: "none", name: "身心健全", desc: "身心機能平衡穩定，無明顯神經或肉體缺陷。" }
];

// 7. 外觀與氣味庫
const APPEARANCES = [
    "銀白微捲長髮配暗紫眼眸", "烏黑齊肩短髮與血色瞳孔", "淡金波浪長髮與碧綠貓瞳",
    "深緋色長髮配金黃豎瞳", "灰藍色編髮與迷濛灰霧眼眸"
];

const SCENTS = [
    "甜膩多汁的熟透蜜桃香", "清冽微苦的夜來香氛", "濃郁誘惑的黑巧克力甜香",
    "微酸刺激的野莓果香", "如煙似霧的雪松焚香"
];

// 8. 完整道具庫（含各街區專屬品與黑市PLUS禁忌款）
const ITEMS = {
    // 【基礎日常品】(全區通用)
    snack: { id: "snack", district: "all", name: "低階安撫蜜餞", price: 30, reqRank: 1, desc: "甜味能稍微平復不安。", effect: { stress: -15, exp: 5 } },
    tea: { id: "tea", district: "all", name: "舒緩花草茶", price: 60, reqRank: 1, desc: "回復主控體力 30 點。", effect: { masterHp: 30, exp: 5 } },
    scent_oil: { id: "scent_oil", district: "all", name: "凝神香薰油", price: 120, reqRank: 1, desc: "散發好聞香氣，增進親近感。", effect: { relation: 5, exp: 10 } },

    // 【薄霧下城區專屬 - 粗陋/烈性/違禁】
    slum_aphrodisiac: {
        id: "slum_aphrodisiac", district: "d_slums", name: "粗製烈性催情脂", price: 90, reqRank: 1,
        desc: "地下作坊私熬的猛烈藥膏，塗抹後迅速動情發熱，但因灼熱難受增加壓力。",
        effect: { relation: 15, stress: 12, exp: 15 }
    },
    slum_rusty_collar: {
        id: "slum_rusty_collar", district: "d_slums", name: "生鏽鈍齒束頸圈", price: 110, reqRank: 1,
        desc: "粗糙的暗鐵項圈，邊緣鈍齒會微刺頸肉，帶來屈辱與皮肉刺痛。",
        effect: { obedience: 16, stress: 14, exp: 15 }
    },
    slum_sleep_wine: {
        id: "slum_sleep_wine", district: "d_slums", name: "黑市私釀昏睡濁酒", price: 140, reqRank: 1,
        desc: "能讓暴躁反抗的魅魔迅速四肢發軟、神智昏沉任由擺布。",
        effect: { obedience: 10, stress: -20, exp: 15 }
    },

    // 【薔薇中城區專屬 - 工藝情趣/情調/微痛】
    mid_candle: {
        id: "mid_candle", district: "d_midtown", name: "薔薇低溫香薰蠟燭", price: 150, reqRank: 1,
        desc: "滴落在肌膚上帶來微熱微痛感，伴隨濃郁玫瑰香，兼具情調與輕度責罰。",
        effect: { relation: 10, obedience: 10, stress: 5, exp: 20 }
    },
    mid_blindfold: {
        id: "mid_blindfold", district: "d_midtown", name: "黑曜遮光絲絨眼罩", price: 90, reqRank: 1,
        desc: "徹底剝奪視覺，讓魅魔對每一次撫摸與聲音無比敏銳，呼吸急促。",
        effect: { relation: 6, obedience: 8, stress: 6, exp: 15 }
    },
    mid_clamp: {
        id: "mid_clamp", district: "d_midtown", name: "銀鈴微刺敏感夾", price: 130, reqRank: 1,
        desc: "夾住胸前嬌嫩敏感處，輕微動彈便會叮噹作響並伴隨陣陣刺痛。",
        effect: { obedience: 12, stress: 10, exp: 20 }
    },
    mid_whip: {
        id: "mid_whip", district: "d_midtown", name: "軟鞣山羊皮散尾短鞭", price: 180, reqRank: 1,
        desc: "抽打聲清脆響亮，留下交錯紅痕卻不傷筋骨，有效立規矩。",
        effect: { obedience: 18, stress: 12, exp: 25 }
    },
    mid_rope: {
        id: "mid_rope", district: "d_midtown", name: "絲絨束縛繩組", price: 140, reqRank: 1,
        desc: "質地柔軟堅韌，能縛緊四肢擺出羞恥無助的跪姿。",
        effect: { obedience: 15, stress: 8, exp: 20 }
    },
    mid_ballgag: {
        id: "mid_ballgag", district: "d_midtown", name: "緋紅噤聲口枷", price: 120, reqRank: 1,
        desc: "封住口舌使其只能嗚咽喘息，強行磨滅狂妄與傲慢。",
        effect: { obedience: 14, stress: 10, exp: 20 }
    },
    mid_bead: {
        id: "mid_bead", district: "d_midtown", name: "幽夜秘穴跳動玉珠", price: 160, reqRank: 1,
        desc: "深入體內持續規律震顫，使雙腿發軟，無力支撐身體。",
        effect: { relation: 12, stress: -5, exp: 20 }
    },

    // 【貴族特區專屬 - 奢華魔導/滋養】
    noble_rune_shackles: {
        id: "noble_rune_shackles", district: "d_nobles", name: "秘銀符文拘束環組", price: 580, reqRank: 2,
        desc: "刻有吸魔咒文的手足環，完全抽離魅魔反抗力量，令其徹底順從癱軟。",
        effect: { obedience: 35, stress: 15, exp: 40 }
    },
    noble_elixir_nectar: {
        id: "noble_elixir_nectar", district: "d_nobles", name: "幻夢純血滋養瓊漿", price: 720, reqRank: 2,
        desc: "上古煉金瓊漿，純血魅魔飲下後飢餓歸零，且好感度大幅飆升。",
        effect: { relation: 35, hunger: -80, stress: -30, exp: 50 }
    },

    // 【黑市 PLUS 禁忌重器 - 巨大異形/穿刺/劇痛/高門檻】
    plus_screw_clamp: {
        id: "plus_screw_clamp", district: "d_nobles", name: "【黑市Plus】血誓螺旋絞骨合金夾", price: 520, reqRank: 2,
        desc: "配備調節螺絲與微型咬齒，旋緊時如細針穿透，劇烈絞痛至泛紅滲血。",
        effect: { obedience: 32, stress: 26, exp: 45 }
    },
    plus_dildo: {
        id: "plus_dildo", district: "d_nobles", name: "【黑市Plus】異形棘刺巨型玉棒", price: 650, reqRank: 2,
        desc: "粗大異常且佈滿倒刺的異形玉棒，強行拓寬內部，帶來撕裂劇痛與侵略快感。",
        effect: { obedience: 38, relation: 15, stress: 30, exp: 55 }
    },
    plus_mask: {
        id: "plus_mask", district: "d_nobles", name: "【黑市Plus】全覆式剝奪拘靈鐵面", price: 750, reqRank: 3,
        desc: "封死視覺、聽覺與發聲，將魅魔打入極致孤獨與恐慌深淵，粉碎一切意志。",
        effect: { obedience: 48, relation: -5, stress: 38, exp: 65 }
    },
    plus_pillory: {
        id: "plus_pillory", district: "d_nobles", name: "【黑市Plus】深淵拘魂重鎖三叉枷", price: 820, reqRank: 3,
        desc: "極度沉重冰冷的合金重刑枷，稍作扭動便會壓迫頸椎與肩胛，劇痛難耐。",
        effect: { obedience: 52, stress: 42, exp: 70 }
    },
    plus_double_dildo: {
        id: "plus_double_dildo", district: "d_nobles", name: "【黑市Plus】雙首蛇噬深腔律動儀", price: 980, reqRank: 4,
        desc: "如魔蛇雙首同時貫通前後兩處深穴並高速鼓脹震動，在無法承受的脹痛中徹底失神。",
        effect: { obedience: 60, relation: 25, stress: 45, exp: 90 }
    },
    plus_pheromone: {
        id: "plus_pheromone", district: "d_nobles", name: "【黑市Plus】魅惑濃縮原液", price: 400, reqRank: 2,
        desc: "高純度魅魔荷爾蒙原液，強制破冰，大幅拉近親密度。",
        effect: { relation: 25, stress: -15, exp: 40 }
    },
    plus_elixir: {
        id: "plus_elixir", district: "d_nobles", name: "【黑市Plus】深淵精氣玉液", price: 850, reqRank: 4,
        desc: "主控飲下後立即回滿全部體力，並洗滌精神疲憊。",
        effect: { masterHpFull: true, exp: 50 }
    }
};
