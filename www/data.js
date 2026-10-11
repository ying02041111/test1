/* ==========================================================
   《緋夜飼育錄》世界資料表
   價格、效果、加成全部在這裡，程式即時結算。AI 不碰這些數字。
   ========================================================== */

const PHASES = ['清晨','上午','午後','傍晚','深夜'];

const DISTRICTS = [
  { id:'harbor',     name:'舊港區',   hue:'#5b7a8c', cost:0.85, rent:0.8, food:0.9,
    desc:'潮濕、霧重、租金便宜。黑市在這裡呼吸，倉庫深處永遠有別人的故事。',
    shops:['item','food','black'] },
  { id:'greenhouse', name:'溫室花街', hue:'#7a9c6b', cost:0.95, rent:1.0, food:0.75,
    desc:'終年暖霧，玻璃穹頂下什麼都長得肥美。食物便宜到像不用錢。',
    shops:['item','food','official'] },
  { id:'central',    name:'中央大道', hue:'#c9a227', cost:1.2,  rent:1.35, food:1.1,
    desc:'燈火通明，什麼都買得到，也什麼都貴。官方機構與診所都在這條街上。',
    shops:['item','food','official','clinic'] },
  { id:'industrial', name:'工業外環', hue:'#8a6a5a', cost:0.75, rent:0.6, food:0.85,
    desc:'鐵鏽與煤灰的味道。房租低到可疑，鄰居大多是懶得問你問題的人。',
    shops:['item','food','black'] },
  { id:'skyline',    name:'雲頂區',   hue:'#8fa6c9', cost:1.9,  rent:2.1, food:1.4,
    desc:'空氣稀薄、乾淨，看不見底下的污濁。這裡的門牌本身就是一種權力。',
    shops:['food','official','clinic','luxury'], unlock:{ power:30 } },
];

/* 食物：每個種族主食不同，吃錯會掉心情 */
const FOODS = {
  shadowdew:{ name:'暗影蜜露',  price:95,  fill:34 },
  ambercomb:{ name:'琥珀蜜塊',  price:60,  fill:30 },
  frostsugar:{name:'霜糖冰晶',  price:70,  fill:30 },
  emberspice:{name:'焰辛肉乾',  price:85,  fill:32 },
  seajelly: { name:'海月凍',    price:75,  fill:30 },
  sunberry: { name:'日光樹果',  price:45,  fill:28 },
  oilnectar:{ name:'能量蜜漿',  price:65,  fill:29 },
};

/* 種族：外型片段、主食、個性傾向、體質修正、基礎身價 */
const RACES = {
  nightwing:{ name:'夜翼魔裔', price:1500, food:'shadowdew',
    look:['黑藍色的翼膜收在背後，像一件沒收好的斗篷','豎直的瞳孔在暗處會亮一下','鎖骨下有一圈不會發光的暗紋'],
    bias:['高傲','佔有慾強','嘴硬心軟'], mod:{charm:8,obedience:-6,staminaMax:8},
    desc:'夜行性，體溫偏低。喜歡高處與黑暗，討厭被呼來喚去。' },
  amberwax:{ name:'蜜蠟蜂娘', price:1200, food:'ambercomb',
    look:['腹部有淡金色環紋，會在緊張時微微收縮','半透明的翅不算能飛，但抖起來很好看','指尖總是黏的，帶著甜味'],
    bias:['愛撒嬌','順從','黏人'], mod:{charm:3,obedience:9,staminaMax:-4},
    desc:'甜、黏、認人。情緒非常外顯，餓了會直接講。' },
  frostlace:{ name:'冰霜魅', price:1400, food:'frostsugar',
    look:['髮梢結著細霜，動一下就落','呼氣成白霧，皮膚透著淡藍','體溫低到貼上去會先縮一下'],
    bias:['冷淡','理性','毒舌'], mod:{charm:7,obedience:2,staminaMax:2},
    desc:'話少，邏輯清楚。情緒起伏小，不容易討好。' },
  emberfox:{ name:'焰尾狐魅', price:1450, food:'emberspice',
    look:['狐耳會隨情緒轉向，藏不住','尾巴末端帶著不燙手的火','體溫高，靠近像站在爐邊'],
    bias:['好勝','任性','火辣'], mod:{charm:5,obedience:-8,staminaMax:14},
    desc:'體力好、脾氣衝。被誇會尾巴翹，被管會咬人。' },
  abyss:  { name:'深海鱗魅', price:1400, food:'seajelly',
    look:['鰭狀耳，鱗片泛著虹彩','皮膚濕涼，摸起來像剛離水的石頭','安靜時幾乎不呼吸'],
    bias:['慵懶','溫柔','順從'], mod:{charm:7,obedience:4,staminaMax:3},
    desc:'慢，但很穩。情緒像潮汐，一旦上來就很難退。' },
  verdant:{ name:'森靈魅', price:1250, food:'sunberry',
    look:['角上纏著還在生長的藤蔓','皮膚下有葉脈似的淺綠紋路','身上永遠有股雨後的花香'],
    bias:['好奇','黏人','乖巧'], mod:{charm:4,obedience:6,staminaMax:6},
    desc:'好奇到有點麻煩。什麼都想碰，什麼都想問。' },
  cogheart:{name:'齒輪魅', price:1300, food:'oilnectar',
    look:['關節處露出金屬軸承，動作精準得像被校正過','瞳孔是光圈，對焦時會縮小','背後有一道沒接上的線路接口'],
    bias:['乖巧','聽話','情感遲鈍'], mod:{charm:2,obedience:12,staminaMax:5},
    desc:'指令執行得完美。學得快，但不太懂為什麼要笑。' },
  fallen: { name:'墮天魅', price:5200, food:'shadowdew', rare:true,
    look:['單邊的翼染成墨黑，另一邊什麼都沒有','光環有一道裂痕，亮起來時會閃','看人的方式像在衡量價錢'],
    bias:['驕傲','佔有慾強','矛盾'], mod:{charm:15,obedience:-11,staminaMax:12},
    desc:'稀有。官方幾乎標不到貨，黑市偶爾流出一隻。' },
};

/* 道具：溫和 = 情趣用品；殘酷 = 刑具（僅敘述感受，不做虐待描寫） */
const ITEMS = {
  nectar:    { name:'蜜滴糖',   price:90,  kind:'mild',  eff:{fullness:20,mood:6},  desc:'含進嘴裡就不鬧了。' },
  candle:    { name:'暖香蠟燭', price:120, kind:'mild',  eff:{mood:12,obedience:2}, desc:'氣味會讓房間變得很像「家」。' },
  silkribbon:{ name:'絲綢緞帶', price:180, kind:'mild',  eff:{obedience:6,mood:4,charm:2}, desc:'綁手腕或綁頭髮都行。' },
  warmoil:   { name:'溫熱精油', price:200, kind:'mild',  eff:{stamina:14,mood:8},   desc:'推開之後，緊繃的地方會鬆掉。' },
  bell:      { name:'低語鈴鐺', price:240, kind:'mild',  eff:{obedience:8,charm:3,mood:-3}, desc:'走到哪響到哪，藏不住位置。' },
  softcollar:{ name:'軟絨項圈', price:320, kind:'mild',  eff:{obedience:11,mood:5,charm:2}, desc:'內裡墊得很軟，戴久也不會磨。' },
  ironcollar:{ name:'冷鐵頸扣', price:300, kind:'harsh', eff:{obedience:18,mood:-12,stamina:-5},  desc:'金屬會留住體溫，很久才暖。' },
  chain:     { name:'束縛鎖鏈', price:450, kind:'harsh', eff:{obedience:25,mood:-20,charm:5},   desc:'重量本身就是一句話。' },
  silence:   { name:'緘口環',   price:380, kind:'harsh', eff:{obedience:20,mood:-15},             desc:'安靜下來的理由。' },
  bitternsalt:{name:'苦鹽水',   price:150, kind:'harsh', eff:{obedience:10,mood:-8,fullness:10}, desc:'不會傷身，只是難喝。' },
  coldbrand: { name:'低溫烙印', price:700, kind:'harsh', eff:{obedience:30,mood:-25,charm:10,stamina:-8}, desc:'不燙，只留一道會慢慢淡去的痕。' },
};

/* 訓練：程式結算成長 */
const TRAININGS = [
  { id:'etiquette', name:'教養',   cost:14, exp:14, eff:{obedience:2,mood:1},        desc:'規矩、應對、姿態。' },
  { id:'charm',     name:'魅惑',   cost:16, exp:12, eff:{charm:2},                  desc:'眼神、語調、靠近的時機。' },
  { id:'stamina',   name:'體能',   cost:16, exp:12, eff:{staminaMax:3},             desc:'撐得久才是本錢。' },
  { id:'discipline',name:'規訓',   cost:15, exp:16, eff:{obedience:4,mood:-4},      desc:'界線要一次劃清楚。' },
  { id:'bond',      name:'陪伴',   cost:8,  exp:6,  eff:{mood:8,rel:4},             desc:'什麼都不做，只是待著。' },
];

/* 住所：租房以「週」計；買房一次性 */
const HOUSES = [
  { id:'room',   name:'廉租單間', type:'rent', rent:350,  cap:1, bonus:{},
    districts:['harbor','industrial','greenhouse'], desc:'一張床、一扇窗、一道會漏風的門。' },
  { id:'flat',   name:'舊城兩房公寓', type:'rent', rent:700, cap:2, bonus:{recover:0.10},
    districts:['harbor','industrial','greenhouse','central'], desc:'有客廳，代表你有地方「教」。' },
  { id:'flower', name:'花街小樓', type:'rent', rent:1400, cap:3, bonus:{train:0.15,recover:0.10},
    districts:['greenhouse','central'], desc:'樓下是花店，空氣一直很甜。' },
  { id:'villa',  name:'城郊宅邸', type:'buy', price:48000, cap:5, bonus:{train:0.20,recover:0.20,upkeep:-0.15},
    districts:['greenhouse','industrial'], desc:'圍牆、院子、沒人聽得見的距離。' },
  { id:'skypent',name:'雲頂頂層', type:'buy', price:180000, cap:8, bonus:{train:0.30,recover:0.30,upkeep:-0.25,sell:0.12},
    districts:['skyline'], desc:'整層都是你的。落地窗底下是整個城市。' },
];

const NAME_POOL = ['莉緹','薇菈','賽琳','露娜','莓莓','千棘','霜','焰綺','阿碧','繭',
  '玖玖','白音','彌亞','緹亞','諾瓦','卡莉','銀沙','波波','夜羽','莉莉絲','彌莎','莞莞',
  '燼','柚','綾','摩卡','薇爾','珀','蘇','阿黛'];
const PERSONA_POOL = ['高傲','冷淡','愛撒嬌','好勝','慵懶','好奇','膽小','嘴硬心軟','佔有慾強',
  '乖巧','毒舌','溫柔','愛哭','精明','悶騷','怕生'];
const HAIR = ['墨黑','酒紅','霜白','栗棕','淡紫','湖綠','燦金','灰藍','櫻粉'];
const EYES = ['琥珀','赤紅','碧綠','灰紫','金','漆黑','冰藍','銅金'];
const BUILDER = ['高瘦','嬌小','勻稱','豐滿','骨感','結實'];

const BLACK_MARKET_BUYERS = [
  { n:'戴單片眼鏡的中年男人', d:'手指很乾淨，眼神一直在算。' },
  { n:'包得密不透風的女人',   d:'帽子壓得很低，聲音是處理過的。' },
  { n:'笑得太過的收藏家',     d:'他看得不是臉，是條件。' },
  { n:'沉默的雙胞胎',         d:'兩人從頭到尾沒交換過一個字。' },
  { n:'帶著鐵箱的拍賣人',     d:'箱子裡是什麼，他不說。' },
  { n:'菸味很重的老買主',     d:'他出價從不超過三次。' },
];
