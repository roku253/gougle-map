/**
 * 霞ノ杜町ピンの名称・住所・評価・口コミを補完する（一度きり用）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAP_PATH = path.join(__dirname, "..", "data", "map-data.json");

const PLACE_REFS = [
  { name: "霞ノ杜町成沢", lat: 36.05883, lng: 138.1107 },
  { name: "霞ノ杜町三日月北", lat: 36.05763, lng: 138.11563 },
  { name: "霞ノ杜町三日月中央", lat: 36.05499, lng: 138.1164 },
  { name: "霞ノ杜町大字杜ケ丘", lat: 36.0511, lng: 138.12305 },
  { name: "霞ノ杜町狐塚", lat: 36.0522, lng: 138.11729 },
  { name: "霞ノ杜町孤塚", lat: 36.05124, lng: 138.11711 },
  { name: "霞ノ杜町湖畔", lat: 36.04978, lng: 138.1125 },
  { name: "霞ノ杜町湖岸", lat: 36.0495, lng: 138.111 },
  { name: "霞ノ杜町木戸", lat: 36.0481, lng: 138.11853 },
  { name: "霞ノ杜町西木戸", lat: 36.04733, lng: 138.11486 },
  { name: "霞ノ杜町大萩", lat: 36.04471, lng: 138.11396 },
  { name: "霞ノ杜町箕浦", lat: 36.0446, lng: 138.121 },
  { name: "霞ノ杜町筒川", lat: 36.04435, lng: 138.1148 },
  { name: "霞ノ杜町柳川", lat: 36.04732, lng: 138.12172 },
];

function nearestArea(lat, lng) {
  let best = PLACE_REFS[0];
  let bestD = Infinity;
  for (const p of PLACE_REFS) {
    const d = (p.lat - lat) ** 2 + (p.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best.name;
}

function isKasumiPin(pin) {
  return pin.lat > 36.03 && pin.lat < 36.07 && pin.lng > 138.08 && pin.lng < 138.14;
}

const DEFAULT_TITLES = new Set(["新しいスポット", "いいスポット", "駅前", "駐車場", "たばこ店"]);

/** @type {Record<string, Partial<{title:string,area:string,body:string,rating:number,reviews:Array<{text:string,author:string}>}>>} */
const PIN_UPDATES = {
  "tourism-01": {
    body: "丘陵の鎮守。早朝は霧がかかる。",
    reviews: [
      { text: "石段の苔がきれい。静かで心が落ち着く。", author: "杜の散歩人" },
      { text: "初詣は混むけど、平日はひっそり。", author: "kasumi_local" },
    ],
  },
  "tourism-02": {
    reviews: [
      { text: "揺れます。渡るのは子どもと一緒だと楽しい。", author: "週末パパ" },
      { text: "川の音がいい。写真映えする。", author: "ぶらり旅" },
    ],
  },
  "tourism-03": {
    reviews: [
      { text: "古地図の展示がおもしろい。町の歴史がわかる。", author: "地図好き" },
      { text: "火水休なので注意。小さめだけど充実。", author: "霞ノ杜在住" },
    ],
  },
  "tourism-04": {
    reviews: [
      { text: "登り途中の休憩にちょうどいい。霧が晴れると景色が変わる。", author: "ハイカーA" },
      { text: "ベンチでおにぎり。風が気持ちいい。", author: "杜の散歩人" },
    ],
  },
  "tourism-05": {
    reviews: [
      { text: "無料で足が温まる。冬の散歩の定番。", author: "kasumi_local" },
      { text: "川沿いで雰囲気◎。タオル持参推奨。", author: "温泉巡り" },
      { text: "夕方は少し寂しいけど、それがいい。", author: "一人旅メモ" },
    ],
  },
  "civic-01": {
    reviews: [
      { text: "窓口の対応は丁寧。用件がはっきりしてると早い。", author: "町民T" },
    ],
  },
  "school-01": {
    reviews: [
      { text: "環境学習の発表を見学した。子どもたちの観察眼がすごい。", author: "PTAさん" },
    ],
  },
  "utodori-trail": { rating: 0 },
  "pin-1781182006567": {
    rating: 4.0,
    body: "霞湖に続く商店街。土産・食料・日用雑貨が並ぶ。",
    reviews: [
      { text: "朝市の日はにぎわう。地元野菜が安い。", author: "kasumi_local" },
      { text: "観光客向けの店もあるけど、生活感があっていい。", author: "週末ドライブ" },
      { text: "駐車場は早めに。人が多い日は混む。", author: "商店街好き" },
      { text: "老舗の和菓子屋がおすすめ。", author: "甘味らじお" },
    ],
  },
  "pin-1781188405647": {
    rating: 3.8,
    body: "郵便・荷物の窓口。町の北寄り。",
    reviews: [
      { text: "待ち時間は短め。局員さんが親切。", author: "成沢在住" },
      { text: "ゆうパックはここが便利。", author: "kasumi_local" },
    ],
  },
  "pin-1781188546538": {
    rating: 4.1,
    body: "生活雑貨と地元産の手作り小物。木戸エリアの小さな店。",
    reviews: [
      { text: "インテリアがかわいい。つい長居する。", author: "雑貨好き" },
      { text: "店主と話せる距離感がいい。", author: "杜の散歩人" },
      { text: "限定の霞ノ杜グッズがある。", author: "おみやげ部" },
    ],
  },
  "pin-1781189129978": {
    area: "霞ノ杜町三日月中央",
    rating: 3.2,
    body: "町営の製薬関連施設。一般立入不可の案内あり。",
    reviews: [{ text: "外観だけ見学。歴史の説明板が詳しい。", author: "町史メモ" }],
  },
  "pin-1781189567540": {
    rating: 4.3,
    body: "手打ちそばと天ぷら。ランチ限定メニューあり。",
    reviews: [
      { text: "つゆが上品。十割そばの香りがいい。", author: "そば巡り" },
      { text: "平日は並ばず入れる。コスパ良し。", author: "kasumi_local" },
      { text: "天ぷら盛り合わせがボリュームある。", author: "ランチ難民" },
      { text: "店主の雰囲気が落ち着く。", author: "杜の散歩人" },
    ],
  },
  "pin-1781189743802": {
    title: "バー・フォグテール",
    rating: 4.0,
    body: "杜川近くの小さなバー。地酒と軽食。",
    reviews: [
      { text: "霧の夜にぴったり。ジャズが流れる。", author: "夜更かしさん" },
      { text: "地元の芋焼酎のラインナップがいい。", author: "バー巡り" },
      { text: "一人でも入りやすい。", author: "旅人K" },
    ],
  },
  "pin-1781189992088": {
    rating: 4.5,
    body: "夏の花火大会のメイン会場。湖岸の特設席あり。",
    reviews: [
      { text: "打ち上げ数は多い。早めの場取り必須。", author: "花火好き" },
      { text: "湖に映るのがきれい。感動した。", author: "夏の思い出" },
    ],
  },
  "pin-1781190646467": {
    title: "レイクサイド・サンソート",
    rating: 4.2,
    body: "霞湖を望むリゾートホテル。大浴場とレストラン付き。",
    reviews: [
      { text: "湖側の部屋は朝霧が幻想的。", author: "温泉巡り" },
      { text: "ビュッフェの地元野菜がおいしい。", author: "家族旅行" },
      { text: "チェックインがスムーズ。", author: "ぶらり旅" },
      { text: "プールは子どもに人気。", author: "週末パパ" },
      { text: "夕食の魚料理が評判。", author: "グルメ旅" },
    ],
  },
  "pin-1781191141838": {
    rating: 4.3,
    body: "湖岸の小さな神社。水神様を祀る。",
    reviews: [
      { text: "人が少なく静か。鳥の声だけ。", author: "杜の散歩人" },
      { text: "湖を背にした鳥居が美しい。", author: "写真さんぽ" },
    ],
  },
  "pin-1781191711875": {
    title: "駅前食堂 杜の灯",
    rating: 3.9,
    body: "霞ノ杜駅前の大衆食堂。定食と日替わり。",
    reviews: [
      { text: "朝ごはんに利用。出汁が効いてる。", author: "通勤族" },
      { text: "ボリューム満点の定食。", author: "kasumi_local" },
      { text: "駅待ちの時間つぶしに。", author: "旅人K" },
    ],
  },
  "pin-1781193571552": {
    rating: 3.5,
    body: "霞ノ杜駅前の交番。町の安全拠点。",
    reviews: [{ text: "道に迷ったとき親切に教えてもらった。", author: "観光客" }],
  },
  "pin-1781195725875": {
    title: "OldDays 霞ノ杜駅前店",
    area: "霞ノ杜町木戸",
    rating: 3.4,
    body: "駅直結のコンビニ。深夜はやや品切れしやすい。",
    reviews: [
      { text: "電車を待つ間に便利。", author: "通勤族" },
      { text: "地元限定おにぎりがある日も。", author: "kasumi_local" },
    ],
  },
  "pin-1781195966637": {
    rating: 3.6,
    body: "駅構内の公衆トイレ。清掃は行き届いている。",
    reviews: [{ text: "観光で急なとき助かった。", author: "旅人K" }],
  },
  "pin-1781196119389": {
    rating: 3.8,
    body: "箕浦地区の公立高校。部活動が盛ん。",
    reviews: [{ text: "文化祭の時だけ見学した。雰囲気は真面目。", author: "卒業生の親" }],
  },
  "pin-1781196284285": {
    rating: 3.7,
    body: "箕浦地区の中学校。通学路は坂が多い。",
    reviews: [{ text: "吹奏楽の演奏会、上手だった。", author: "地域の方" }],
  },
  "pin-1781196474750": {
    title: "霞ノ杜駅",
    rating: 4.0,
    body: "町の玄関口。単線ホーム1面2線。",
    reviews: [
      { text: "小さくてわかりやすい。案内表示が丁寧。", author: "鉄道好き" },
      { text: "ホームから湖方面が見える日がある。", author: "kasumi_local" },
    ],
  },
  "pin-1781196585545": {
    rating: 4.0,
    body: "文房具と雑貨の老舗。学校用品が揃う。",
    reviews: [
      { text: "昔ながらの店構えがいい。", author: "kasumi_local" },
      { text: "ノートの品揃えが豊富。", author: "学生ママ" },
      { text: "店主が丁寧に相談に乗ってくれる。", author: "杜の散歩人" },
    ],
  },
  "pin-1781197197122": {
    title: "湖畔ホテル 霧観亭",
    rating: 4.0,
    body: "狐塚寄りの中規模ホテル。展望ロビーあり。",
    reviews: [
      { text: "ロビーのコーヒーがおいしい。", author: "一人旅メモ" },
      { text: "大浴場は広め。リラックスできる。", author: "温泉巡り" },
      { text: "朝食の和食が充実。", author: "家族旅行" },
      { text: "駐車場は無料。", author: "ドライブ旅" },
    ],
  },
  "pin-1781197215708": {
    title: "民宿 かすみや",
    rating: 4.4,
    body: "家族経営の民宿。囲炉裏と地元料理。",
    reviews: [
      { text: "女将さんの朝ごはんが最高。", author: "宿泊記" },
      { text: "アットホームで居心地いい。", author: "週末ドライブ" },
      { text: "囲炉裏端での会話が楽しい。", author: "旅人K" },
    ],
  },
  "pin-1781197295075": {
    title: "霞湖ビューホテル",
    rating: 4.1,
    body: "全室湖ビュー志向のホテル。最上階にラウンジ。",
    reviews: [
      { text: "ラウンジの夜景がきれい。", author: "カップル旅" },
      { text: "部屋から湖が一望。", author: "写真さんぽ" },
      { text: "ウェルカムドリンクが嬉しい。", author: "ぶらり旅" },
      { text: "チェックアウトが遅めで助かった。", author: "家族旅行" },
      { text: "朝の霧がすごい。写真撮った。", author: "朝活さん" },
    ],
  },
  "pin-1781197302386": {
    title: "ペンション 杜の詩",
    rating: 4.3,
    body: "少人数向けのペンション。星空観察会を季節開催。",
    reviews: [
      { text: "星空ツアーに参加。感動。", author: "天体観測好き" },
      { text: "静かで本が読める。", author: "一人旅メモ" },
      { text: "朝食のパンが自家製。", author: "朝活さん" },
    ],
  },
  "pin-1781197358282": {
    title: "湖岸旅館 明月",
    rating: 4.2,
    body: "湖岸沿いの旅館。舟乗り場まで徒歩2分。",
    reviews: [
      { text: "舟遊びの拠点にした。便利。", author: "湖好き" },
      { text: "夕食の川魚が新鮮。", author: "グルメ旅" },
      { text: "露天風呂は小さいけど雰囲気◎。", author: "温泉巡り" },
      { text: "館主の案内で散策コースを教えてもらった。", author: "杜の散歩人" },
    ],
  },
  "pin-1781197377182": {
    area: "霞ノ杜町湖畔",
    body: "地魚と季節の野菜料理。観光客に人気の老舗食堂。",
  },
  "pin-1781197827589": {
    rating: 3.7,
    body: "霧見展望への登山口駐車場。台数に限りあり。",
    reviews: [{ text: "早朝なら空いてた。トイレあり。", author: "ハイカーA" }],
  },
  "pin-1781198034620": {
    title: "ホテル 霞ノ杜ステーション",
    rating: 3.9,
    body: "駅徒歩3分のビジネスホテル。連泊割あり。",
    reviews: [
      { text: "駅近で便利。部屋はコンパクト。", author: "出張族" },
      { text: "朝食バイキングは標準的。", author: "旅人K" },
      { text: "フロントの対応が早い。", author: "通勤族" },
    ],
  },
  "pin-1781198059499": {
    area: "霞ノ杜町湖畔",
    rating: 4.4,
    body: "ゴシック館併設の日帰り温泉。歴史建築を眺めながら入浴。",
    reviews: [
      { text: "建物とのコントラストが好き。", author: "建築好き" },
      { text: "露天から湖がちらりと見える。", author: "温泉巡り" },
      { text: "平日は空いている。", author: "kasumi_local" },
    ],
  },
  "pin-1781198096746": {
    area: "霞ノ杜町湖畔",
    rating: 4.5,
    body: "明治期の洋館。町指定文化財。内部は要予約見学。",
    reviews: [
      { text: "外観だけでも価値あり。写真映え。", author: "建築好き" },
      { text: "ガイドツアーは予約必須。詳しい説明がうれしい。", author: "町史メモ" },
    ],
  },
  "pin-1781198313028": {
    area: "霞ノ杜町湖畔",
    rating: 4.0,
    body: "移築前の旧館跡。説明板と庭園のみ公開。",
    reviews: [{ text: "静かに散策。歴史を感じる。", author: "杜の散歩人" }],
  },
  "pin-1781198342469": {
    title: "館前ストア ゴシック",
    area: "霞ノ杜町湖畔",
    rating: 3.3,
    body: "ゴシック館前の小さなコンビニ。お土産コーナーあり。",
    reviews: [
      { text: "見学の前に飲み物調達。", author: "観光客" },
      { text: "限定ステッカーがかわいい。", author: "おみやげ部" },
    ],
  },
  "pin-1781198418666": {
    title: "霞ノ杜駅西駐車場",
    rating: 3.5,
    body: "駅西口の時間制駐車場。最大24時間。",
    reviews: [{ text: "駅利用のついでに停めやすい。", author: "ドライブ旅" }],
  },
  "pin-1781198458477": {
    title: "ラーメン 霧切",
    rating: 4.1,
    body: "駅前の豚骨ラーメン。チャーシュー厚切り。",
    reviews: [
      { text: "スープが濃いめ。好み。", author: "ラーメン部" },
      { text: "夜遅くまでやってる。", author: "夜更かしさん" },
      { text: "替え玉必須。", author: "学生" },
      { text: "カウンター席が落ち着く。", author: "一人飯" },
    ],
  },
  "pin-1781198459466": {
    title: "焼肉 山杜",
    rating: 4.0,
    body: "駅前通りの焼肉店。地元牛を使用。",
    reviews: [
      { text: "カルビが甘い。家族でよく行く。", author: "kasumi_local" },
      { text: "予約した方が安心。", author: "週末パパ" },
      { text: "ライス大盛り無料は助かる。", author: "学生" },
    ],
  },
  "pin-1781198460035": {
    title: "寿司 霞水",
    rating: 4.4,
    body: "ネタは地元港と湖の魚。カウンター8席。",
    reviews: [
      { text: "握りがしっかり。大将と話せる。", author: "グルメ旅" },
      { text: "予約しないと入れない日も。", author: "寿司好き" },
      { text: "湖魚の炙りが絶品。", author: "ぶらり旅" },
      { text: "小さな店だけど満足度高い。", author: "杜の散歩人" },
    ],
  },
  "pin-1781198460451": {
    title: "定食屋 ひより",
    rating: 3.8,
    body: "日替わり定食と自家製漬物。ランチタイムは混雑。",
    reviews: [
      { text: "漬物おかわり自由がいい。", author: "ランチ難民" },
      { text: "ボリューム系で男性に人気。", author: "通勤族" },
      { text: "地味に通ってる。", author: "kasumi_local" },
    ],
  },
  "pin-1781198460877": {
    title: "カレー屋 ねぼけ",
    rating: 4.2,
    body: "スパイス香る欧風カレー。辛さ選べる。",
    reviews: [
      { text: "中辛がちょうどいい。", author: "カレー好き" },
      { text: "ランチセットのサラダが新鮮。", author: "一人飯" },
      { text: "店主の雰囲気がおだやか。", author: "旅人K" },
      { text: "待ち時間あるけど値する。", author: "グルメ旅" },
    ],
  },
  "pin-1781199832945": {
    title: "成沢ヒルズホテル",
    rating: 3.9,
    body: "成沢地区の丘の上のホテル。町一望のテラス。",
    reviews: [
      { text: "テラスからの眺めが開けている。", author: "写真さんぽ" },
      { text: "静かでゆっくりできる。", author: "一人旅メモ" },
      { text: "朝食のパンが美味しい。", author: "家族旅行" },
    ],
  },
  "pin-1781199897223": {
    title: "煙草屋 大萩",
    rating: 3.6,
    body: "大萩の角にある老舗タバコ店。日用品も少量。",
    reviews: [
      { text: "昔ながらの店。地元の人がたむろしてる。", author: "kasumi_local" },
      { text: "限定マッチがお土産になる。", author: "おみやげ部" },
    ],
  },
  "pin-1781200007715": {
    area: "霞ノ杜町木戸",
    rating: 4.1,
    body: "レトロな喫茶。手作りチーズケーキが名物。",
    reviews: [
      { text: "ケーキがしっとり。コーヒーも深煎り。", author: "甘味らじお" },
      { text: "店内のジャズがいい。", author: "カフェ巡り" },
      { text: "窓際席で駅を眺めるのが好き。", author: "杜の散歩人" },
      { text: "読書に最適な静かさ。", author: "一人旅メモ" },
    ],
  },
  "conv-06": {
    reviews: [
      { text: "山間部ではここが拠点。", author: "kasumi_local" },
      { text: "役場の用事のついでに。", author: "町民T" },
      { text: "おにぎりの種類は少なめ。", author: "通勤族" },
    ],
  },
};

const data = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));

for (const pin of data.pins) {
  if (!isKasumiPin(pin)) continue;

  const upd = PIN_UPDATES[pin.id];
  if (!upd) continue;

  if (upd.title) pin.title = upd.title;
  if (upd.body !== undefined) pin.body = upd.body;
  if (upd.rating !== undefined) pin.rating = upd.rating;
  if (upd.area) pin.area = upd.area;
  if (upd.reviews) pin.reviews = upd.reviews;
  delete pin.review;
  delete pin.reviewer;
}

for (const pin of data.pins) {
  if (!isKasumiPin(pin)) continue;

  if (!pin.area || pin.area === "") {
    pin.area = nearestArea(pin.lat, pin.lng);
  }

  if (DEFAULT_TITLES.has(pin.title)) {
    const icon = pin.iconId || "dot";
    const fallback = {
      hotel: "湖畔ホテル",
      insyoku: "食事処 杜里",
      shop: "雑貨店",
      bar: "バー",
      cafe: "喫茶店",
      conbini: "コンビニ",
      dot: "スポット",
    };
    pin.title = `霞ノ杜 ${fallback[icon] || "スポット"}`;
  }

  if (pin.id === "utodori-trail") continue;

  const hasReviews = Array.isArray(pin.reviews) && pin.reviews.length > 0;
  if (!hasReviews && (!pin.rating || pin.rating === 0)) {
    const icon = pin.iconId || "dot";
    if (["insyoku", "cafe", "bar"].includes(icon)) {
      pin.rating = 3.8;
      pin.reviews = [{ text: "地元の人でにぎわう。", author: "kasumi_local" }];
    } else if (icon === "hotel") {
      pin.rating = 4.0;
      pin.reviews = [{ text: "静かに過ごせた。", author: "旅人K" }];
    }
  }

  if (!pin.body && pin.title && !DEFAULT_TITLES.has(pin.title)) {
    pin.body = pin.body || "";
  }
}

fs.writeFileSync(MAP_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
console.log("Updated", MAP_PATH);
