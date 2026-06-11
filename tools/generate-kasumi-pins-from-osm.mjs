/**
 * 霞ノ杜町範囲の OSM 店舗・建物位置から架空ピンを生成し map-data.json に追加する。
 * 既存ピンは距離チェックでスキップ（上書きしない）。
 *
 *   node tools/generate-kasumi-pins-from-osm.mjs --dry-run
 *   node tools/generate-kasumi-pins-from-osm.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const MAP_PATH = path.join(ROOT, "data", "map-data.json");
const BBOX_PATH = path.join(__dirname, "kasumi-bbox.json");

const DRY_RUN = process.argv.includes("--dry-run");
const REBALANCE = !process.argv.includes("--no-rebalance");

const PLACE_REFS = [
  { name: "霞ノ杜町成沢", lat: 36.05883, lng: 138.1107 },
  { name: "霞ノ杜町三日月北", lat: 36.05763, lng: 138.11563 },
  { name: "霞ノ杜町三日月中央", lat: 36.05499, lng: 138.1164 },
  { name: "霞ノ杜町大字杜ケ丘", lat: 36.0511, lng: 138.12305 },
  { name: "霞ノ杜町狐塚", lat: 36.0522, lng: 138.11729 },
  { name: "霞ノ杜町孤塚", lat: 36.05124, lng: 138.11711 },
  { name: "霞ノ杜町湖畔", lat: 36.04978, lng: 138.1125 },
  { name: "霞ノ杜町湖岸", lat: 36.0495, lng: 138.111 },
  { name: "霞ノ杜町駅前", lat: 36.04684, lng: 138.11629 },
  { name: "霞ノ杜町木戸", lat: 36.0481, lng: 138.11853 },
  { name: "霞ノ杜町西木戸", lat: 36.04733, lng: 138.11486 },
  { name: "霞ノ杜町大萩", lat: 36.04471, lng: 138.11396 },
  { name: "霞ノ杜町箕浦", lat: 36.0446, lng: 138.121 },
  { name: "霞ノ杜町筒川", lat: 36.04435, lng: 138.1148 },
  { name: "霞ノ杜町柳川", lat: 36.04732, lng: 138.12172 },
];

const NAME_PREFIX = ["杜の", "霞", "霧見", "山荘", "木戸", "狐塚", "駅前"];
const LAKE_AREAS = new Set(["霞ノ杜町湖畔", "霞ノ杜町湖岸"]);
const NAME_SUFFIX = {
  insyoku: ["食堂", "厨房", "膳", "味処", "亭"],
  cafe: ["喫茶", "カフェ", "茶房", "ロースタリー"],
  bar: ["バー", "酒場", "スナック"],
  conbini: ["ストア", "マート", "ショップ"],
  shop: ["商店", "雑貨店", "店"],
  hotel: ["ホテル", "旅館", "民宿", "ペンション"],
  supermarket: ["スーパー", "マーケット"],
  yubinnkyoku: ["郵便局"],
  bank: ["銀行", "信用金庫"],
  syogakkou: ["小学校"],
  koukou: ["高等学校"],
  zinzya: ["神社"],
  tera: ["寺"],
  byouinn: ["診療所", "クリニック"],
  onsenn: ["温泉", "足湯"],
  hakubutukann: ["資料館"],
  keisatusyo: ["警察署"],
  koubann: ["交番"],
  renntaka: ["レンタカー"],
  saikuru: ["サイクルショップ", "自転車店"],
  sizenn: ["公園", "緑地", "遊び場"],
  toilet: ["公衆トイレ"],
  tyuusyazyou: ["駐車場"],
  siseki: ["史跡", "記念碑"],
  dot: ["会館", "施設", "商事", "工業"],
};

const REVIEW_AUTHORS = [
  "kasumi_local",
  "杜の散歩人",
  "旅人K",
  "週末ドライブ",
  "ぶらり旅",
  "町民T",
  "一人旅メモ",
  "グルメ旅",
];

const REVIEW_SNIPPETS = {
  insyoku: [
    "地元の人でにぎわう。",
    "ランチがお得。",
    "素材の味がしっかり。",
    "観光客も多いけど回転早い。",
    "店主の雰囲気がいい。",
  ],
  cafe: [
    "コーヒーが深煎り。",
    "ケーキがしっとり。",
    "静かで読書に向く。",
    "窓際席がおすすめ。",
  ],
  bar: ["夜は静かに飲める。", "地酒の種類が豊富。", "雰囲気が良い。"],
  conbini: ["深夜まで助かる。", "おにぎりの種類は標準的。", "ATMが便利。"],
  shop: ["品揃えは地味に充実。", "店主と話せる距離感。", "お土産にちょうどいい。"],
  pharmacy: ["処方箋はすぐ対応。", "営業時間が長くて助かる。", "相談しやすい。"],
  hotel: ["静かに過ごせた。", "朝食が好評。", "眺望がよい。"],
  supermarket: ["食材が揃う。", "地元野菜コーナーがある。"],
  bank: ["ATMが使いやすい。", "窓口の対応が丁寧。"],
  sizenn: ["ベンチで一息。", "子ども連れにちょうどいい。", "桜の季節がきれい。"],
  siseki: ["歴史を感じる。", "説明板がわかりやすい。"],
  renntaka: ["手続きがスムーズ。", "車種が選べる。"],
  saikuru: ["レンタルが便利。", "修理も頼める。"],
  default: ["町歩きの途中に寄った。", "案内板がわかりやすい。"],
};

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function rankedAreas(lat, lng, excludeLake) {
  const refs = excludeLake
    ? PLACE_REFS.filter((p) => !LAKE_AREAS.has(p.name))
    : PLACE_REFS;
  return refs
    .map((p) => ({ name: p.name, d: distM(lat, lng, p.lat, p.lng) }))
    .sort((a, b) => a.d - b.d);
}

/** 駅以南・東側は湖畔ラベルより町中心の地名を優先 */
function nearestArea(lat, lng) {
  const preferTown =
    lat < 36.0498 && lng > 138.1128 && lng < 138.123;
  const ranked = rankedAreas(lat, lng, preferTown);
  if (!ranked.length) return "霞ノ杜町";
  if (preferTown && LAKE_AREAS.has(ranked[0].name) && ranked[1]) {
    return ranked[1].name;
  }
  return ranked[0].name;
}

function countAreas(pins) {
  const counts = {};
  for (const p of pins) {
    if (!p.area) continue;
    counts[p.area] = (counts[p.area] || 0) + 1;
  }
  return counts;
}

function areaAtCap(area, counts, maxPerArea) {
  if (!maxPerArea || !area) return false;
  const max = maxPerArea[area];
  if (max == null) return false;
  return (counts[area] || 0) >= max;
}

function pickAreaForNewPin(lat, lng, counts, maxPerArea) {
  const preferTown = lat < 36.0498 && lng > 138.1128 && lng < 138.123;
  const ranked = rankedAreas(lat, lng, false);
  for (const r of ranked) {
    if (areaAtCap(r.name, counts, maxPerArea)) continue;
    if (preferTown && LAKE_AREAS.has(r.name)) continue;
    return r.name;
  }
  for (const r of ranked) {
    if (!areaAtCap(r.name, counts, maxPerArea)) return r.name;
  }
  return null;
}

function candidatePriority(pt, station) {
  let score = distM(pt.lat, pt.lng, station.lat, station.lng);
  const area = nearestArea(pt.lat, pt.lng);
  if (LAKE_AREAS.has(area)) score += 400;
  if (pt.lat < 36.0485 && pt.lng > 138.114 && pt.lng < 138.122) score -= 250;
  if (pt.lat < 36.0465) score -= 80;
  return score;
}

function rebalanceOsmPinAreas(pins, maxPerArea) {
  const osmPins = pins.filter((p) => String(p.id).startsWith("pin-osm-"));
  const other = pins.filter((p) => !String(p.id).startsWith("pin-osm-"));
  const counts = countAreas(other);
  let changed = 0;
  const rebalanced = osmPins.map((p) => {
    const next = { ...p };
    const area = pickAreaForNewPin(p.lat, p.lng, counts, maxPerArea);
    if (area !== p.area) {
      changed++;
      next.area = area;
    }
    counts[area] = (counts[area] || 0) + 1;
    return next;
  });
  return { pins: other.concat(rebalanced), changed };
}

function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function repPoint(geom) {
  if (!geom?.coordinates) return null;
  if (geom.type === "Point") {
    return { lng: geom.coordinates[0], lat: geom.coordinates[1] };
  }
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0];
    if (!ring?.length) return null;
    let sx = 0;
    let sy = 0;
    const n = ring.length - 1;
    for (let i = 0; i < n; i++) {
      sx += ring[i][0];
      sy += ring[i][1];
    }
    return { lng: sx / n, lat: sy / n };
  }
  return null;
}

function worshipIcon(tags) {
  const rel = tags.religion || "";
  const name = tags.name || tags["name:ja"] || "";
  if (rel === "shinto" || tags.shrine === "yes") return "zinzya";
  if (rel === "buddhist" || tags.temple === "yes") return "tera";
  if (/神社|神宮|宮$/.test(name)) return "zinzya";
  if (/寺|院$|お寺/.test(name)) return "tera";
  return "zinzya";
}

function classifyTags(tags) {
  const t = tags || {};
  const amenity = t.amenity || "";
  const shop = t.shop || "";
  const tourism = t.tourism || "";
  const building = t.building || "";
  const highway = t.highway || "";
  const leisure = t.leisure || "";
  const historic = t.historic || "";
  const landuse = t.landuse || "";
  const natural = t.natural || "";

  const office = t.office || "";
  const craft = t.craft || "";
  const healthcare = t.healthcare || "";

  if (highway === "bus_stop" || amenity === "vending_machine" || amenity === "bench") return null;
  if (
    ["house", "residential", "detached", "apartments", "terrace", "garage", "shed", "barn", "farm_auxiliary", "hut"].includes(
      building
    )
  ) {
    if (!amenity && !shop && !office && !craft && !leisure && !historic) return null;
  }
  if (
    building === "yes" &&
    !amenity &&
    !shop &&
    !tourism &&
    !office &&
    !craft &&
    !healthcare &&
    !leisure &&
    !historic &&
    !landuse
  ) {
    return null;
  }

  if (shop === "convenience") return { iconId: "conbini", category: "conv", poiKind: 3 };
  if (shop === "supermarket" || shop === "greengrocer" || shop === "confectionery" || shop === "alcohol") {
    return { iconId: "supermarket", category: "tourism", poiKind: 7 };
  }
  if (
    shop === "chemist" ||
    amenity === "pharmacy" ||
    healthcare === "pharmacy" ||
    healthcare === "chemist"
  ) {
    return { iconId: "shop", category: "tourism", poiKind: 7, kindKey: "pharmacy" };
  }
  if (shop === "beauty" || shop === "hairdresser") {
    return { iconId: "shop", category: "tourism", poiKind: 7 };
  }
  if (shop === "books" || shop === "stationery" || shop === "clothes" || shop === "gift" || shop === "tobacco") {
    return { iconId: "shop", category: "tourism", poiKind: 7 };
  }
  if (amenity === "bicycle_rental" || shop === "bicycle") {
    return { iconId: "saikuru", category: "tourism", poiKind: 7 };
  }
  if (amenity === "car_rental") return { iconId: "renntaka", category: "tourism", poiKind: 7 };
  if (
    leisure === "park" ||
    leisure === "garden" ||
    leisure === "nature_reserve" ||
    leisure === "playground" ||
    landuse === "recreation_ground" ||
    landuse === "village_green" ||
    (landuse === "grass" && (t.name || leisure))
  ) {
    return { iconId: "sizenn", category: "tourism", poiKind: 7 };
  }
  if (
    historic === "monument" ||
    historic === "memorial" ||
    historic === "ruins" ||
    historic === "archaeological_site" ||
    historic === "castle" ||
    historic === "wayside_shrine" ||
    historic === "shrine"
  ) {
    if (historic === "wayside_shrine" || historic === "shrine") {
      return { iconId: "zinzya", category: "tourism", poiKind: 6 };
    }
    return { iconId: "siseki", category: "tourism", poiKind: 10 };
  }
  if (natural === "spring" && tourism === "attraction") {
    return { iconId: "siseki", category: "tourism", poiKind: 10 };
  }
  if (
    amenity === "restaurant" ||
    amenity === "fast_food" ||
    amenity === "food_court" ||
    amenity === "biergarten" ||
    shop === "bakery" ||
    shop === "butcher" ||
    shop === "seafood"
  ) {
    return { iconId: "insyoku", category: "tourism", poiKind: 9 };
  }
  if (amenity === "cafe" || amenity === "ice_cream") return { iconId: "cafe", category: "tourism", poiKind: 8 };
  if (amenity === "bar" || amenity === "pub") return { iconId: "bar", category: "tourism", poiKind: 7 };
  if (amenity === "post_office") return { iconId: "yubinnkyoku", category: "tourism", poiKind: 7 };
  if (amenity === "bank" || amenity === "atm" || amenity === "bureau_de_change") {
    return { iconId: "bank", category: "tourism", poiKind: 7 };
  }
  if (building === "police") return { iconId: "keisatusyo", category: "civic", poiKind: 7 };
  if (amenity === "police") return { iconId: "koubann", category: "civic", poiKind: 7 };
  if (amenity === "school" || building === "school" || building === "kindergarten" || amenity === "kindergarten") {
    return { iconId: "syogakkou", category: "school", poiKind: 4 };
  }
  if (amenity === "college" || building === "university" || building === "college") {
    return { iconId: "koukou", category: "school", poiKind: 4 };
  }
  if (tourism === "hotel" || tourism === "motel" || tourism === "guest_house" || building === "hotel") {
    return { iconId: "hotel", category: "tourism", poiKind: 7 };
  }
  if (amenity === "place_of_worship") {
    const iconId = worshipIcon(t);
    return { iconId, category: "tourism", poiKind: 6 };
  }
  if (building === "church" || building === "chapel" || building === "cathedral" || building === "temple") {
    return { iconId: building === "temple" ? "tera" : "tera", category: "tourism", poiKind: 6 };
  }
  if (building === "shrine") return { iconId: "zinzya", category: "tourism", poiKind: 6 };
  if (landuse === "religious") {
    const iconId = worshipIcon(t);
    return { iconId, category: "tourism", poiKind: 6 };
  }
  if (
    amenity === "hospital" ||
    amenity === "clinic" ||
    amenity === "doctors" ||
    amenity === "dentist" ||
    amenity === "veterinary" ||
    building === "hospital" ||
    healthcare === "clinic" ||
    healthcare === "doctor"
  ) {
    return { iconId: "byouinn", category: "tourism", poiKind: 7 };
  }
  if (amenity === "fuel" || shop === "gas") return { iconId: "dot", category: "tourism", poiKind: 7 };
  if (amenity === "library" || amenity === "archive") return { iconId: "hakubutukann", category: "tourism", poiKind: 1 };
  if (amenity === "community_centre" || amenity === "social_centre") {
    return { iconId: "dot", category: "civic", poiKind: 4 };
  }
  if (office === "government" || building === "government" || building === "civic") {
    return { iconId: "dot", category: "civic", poiKind: 4 };
  }
  if (office === "financial" || office === "insurance") return { iconId: "bank", category: "tourism", poiKind: 7 };
  if (
    office === "company" ||
    office === "yes" ||
    office === "it" ||
    office === "lawyer" ||
    office === "estate_agent" ||
    office === "accountant" ||
    building === "office" ||
    building === "industrial" ||
    building === "warehouse"
  ) {
    return { iconId: "dot", category: "tourism", poiKind: 7, kindKey: "company" };
  }
  if (craft) return { iconId: "shop", category: "tourism", poiKind: 7 };
  if (amenity === "toilets") return { iconId: "toilet", category: "tourism", poiKind: 7 };
  if (amenity === "parking" || building === "parking") return { iconId: "tyuusyazyou", category: "tourism", poiKind: 7 };
  if (amenity === "museum" || tourism === "museum") return { iconId: "hakubutukann", category: "tourism", poiKind: 1 };
  if (amenity === "public_bath" || tourism === "hot_spring") return { iconId: "onsenn", category: "tourism", poiKind: 2 };
  if (shop && shop !== "yes") return { iconId: "shop", category: "tourism", poiKind: 7 };
  if (["commercial", "retail", "kiosk", "supermarket", "offices", "service"].includes(building)) {
    return { iconId: "shop", category: "tourism", poiKind: 7 };
  }
  if (amenity === "townhall" || building === "public") return { iconId: "dot", category: "civic", poiKind: 4 };
  if (tourism === "attraction" || tourism === "viewpoint" || tourism === "artwork") {
    return { iconId: "siseki", category: "tourism", poiKind: 10 };
  }
  if (tourism === "information") return { iconId: "dot", category: "tourism", poiKind: 7 };

  return null;
}

function fictionTitle(iconId, seedKey, area, kindKey) {
  const rand = rng(hashSeed(seedKey));
  const suffixList = NAME_SUFFIX[iconId] || NAME_SUFFIX.dot;
  const suffix = suffixList[Math.floor(rand() * suffixList.length)];
  const prefix = NAME_PREFIX[Math.floor(rand() * NAME_PREFIX.length)];
  const shortArea = area.replace(/^霞ノ杜町/, "").replace(/大字/, "") || "霞ノ杜";

  if (kindKey === "pharmacy") return `${prefix}薬局`;
  if (kindKey === "company") return `${prefix}${suffix}`;
  if (iconId === "conbini") return `${prefix}${suffix} ${shortArea}店`;
  if (iconId === "yubinnkyoku") return `霞ノ杜${shortArea}郵便局`;
  if (iconId === "koubann") return `${shortArea}交番`;
  if (iconId === "keisatusyo") return `${shortArea}警察署`;
  if (iconId === "tyuusyazyou") return `${shortArea}駐車場`;
  if (iconId === "toilet") return `${shortArea}公衆トイレ`;
  if (iconId === "syogakkou") return `霞ノ杜町立${shortArea}小学校`;
  if (iconId === "koukou") return `霞ノ杜町立${shortArea}高等学校`;
  if (iconId === "zinzya") return `${shortArea}神社`;
  if (iconId === "tera") return `${shortArea}寺`;
  if (iconId === "bank") return `${shortArea}${suffix}`;
  if (iconId === "sizenn") return `${shortArea}${suffix}`;
  if (iconId === "siseki") return `${shortArea}${suffix}`;
  if (iconId === "renntaka") return `${prefix}${suffix}`;
  if (iconId === "saikuru") return `${prefix}${suffix}`;
  if (iconId === "hotel") return `${prefix}${suffix}`;
  if (iconId === "insyoku" || iconId === "cafe" || iconId === "bar") return `${prefix}${suffix}`;
  return `${prefix}${suffix}`;
}

function fictionBody(iconId, title, kindKey) {
  if (kindKey === "pharmacy") return `調剤薬局。処方箋と一般用医薬品。`;
  if (kindKey === "company") return `事務所・会社。`;
  const bodies = {
    insyoku: `${title}。地元食材を使った定食と日替わり。`,
    cafe: `${title}。手淹れコーヒーと軽食。`,
    bar: `${title}。夜は静かに一杯。`,
    conbini: `コンビニエンスストア。日用品と軽食。`,
    shop: `生活雑貨と土産。`,
    hotel: `宿泊施設。観光の拠点に。`,
    supermarket: `食料品と日用品。`,
    yubinnkyoku: `郵便・荷物の窓口。`,
    bank: `ATMと窓口。`,
    syogakkou: `公立小学校。`,
    koukou: `公立高等学校。`,
    zinzya: `地域の神社。`,
    tera: `寺院。`,
    byouinn: `診療・調剤。`,
    toilet: `公衆トイレ。`,
    tyuusyazyou: `駐車場。`,
    onsenn: `日帰り入浴。`,
    hakubutukann: `資料・展示。`,
    koubann: `地域の交番。`,
    keisatusyo: `警察署。`,
    sizenn: `公園・緑地。散歩に。`,
    siseki: `史跡・記念碑。`,
    renntaka: `レンタカー。`,
    saikuru: `自転車の販売・レンタル。`,
    dot: `公共施設。`,
  };
  return bodies[iconId] || `${title}。`;
}

function reviewCountFor(iconId, kindKey) {
  if (kindKey === "pharmacy") return { min: 1, max: 3 };
  if (["insyoku", "cafe", "bar", "conbini", "shop", "supermarket", "hotel", "bank"].includes(iconId)) {
    return { min: 2, max: 5 };
  }
  if (["zinzya", "tera", "hakubutukann", "onsenn", "siseki", "sizenn"].includes(iconId)) {
    return { min: 0, max: 2 };
  }
  if (["tyuusyazyou", "toilet", "keisatusyo", "koubann"].includes(iconId)) {
    return { min: 0, max: 1 };
  }
  return { min: 1, max: 2 };
}

function ratingFor(iconId, rand) {
  const base = {
    insyoku: [3.6, 4.5],
    cafe: [3.8, 4.6],
    bar: [3.7, 4.3],
    conbini: [3.0, 3.8],
    shop: [3.5, 4.2],
    hotel: [3.7, 4.5],
    supermarket: [3.4, 4.0],
    zinzya: [4.0, 4.6],
    tera: [4.0, 4.5],
    bank: [3.5, 4.2],
    sizenn: [3.8, 4.5],
    siseki: [3.9, 4.6],
    renntaka: [3.6, 4.2],
    saikuru: [3.7, 4.3],
    tyuusyazyou: [3.2, 3.8],
    toilet: [3.0, 3.7],
    koubann: [3.2, 3.8],
    keisatusyo: [3.2, 3.8],
    syogakkou: [3.0, 3.8],
    dot: [3.2, 4.0],
  }[iconId] || [3.3, 4.1];
  const v = base[0] + rand() * (base[1] - base[0]);
  return Math.round(v * 10) / 10;
}

function generateReviews(iconId, seedKey, kindKey) {
  const { min, max } = reviewCountFor(iconId, kindKey);
  const rand = rng(hashSeed(seedKey + ":reviews"));
  const n = min + Math.floor(rand() * (max - min + 1));
  if (n === 0) return [];
  const pool = REVIEW_SNIPPETS[kindKey || iconId] || REVIEW_SNIPPETS[iconId] || REVIEW_SNIPPETS.default;
  const reviews = [];
  for (let i = 0; i < n; i++) {
    reviews.push({
      text: pool[Math.floor(rand() * pool.length)],
      author: REVIEW_AUTHORS[Math.floor(rand() * REVIEW_AUTHORS.length)],
    });
  }
  return reviews;
}

function minZoomFor(iconId) {
  if (iconId === "conbini") return 15;
  if (["tyuusyazyou", "toilet", "keisatusyo", "koubann"].includes(iconId)) return 17;
  if (["zinzya", "tera", "hotel", "sizenn", "siseki"].includes(iconId)) return 15.5;
  return 16;
}

async function fetchOverpass(s, w, n, e) {
  const query = `
[out:json][timeout:300];
(
  node["amenity"](${s},${w},${n},${e});
  node["shop"](${s},${w},${n},${e});
  node["tourism"](${s},${w},${n},${e});
  node["office"](${s},${w},${n},${e});
  node["craft"](${s},${w},${n},${e});
  node["healthcare"](${s},${w},${n},${e});
  node["leisure"](${s},${w},${n},${e});
  node["historic"](${s},${w},${n},${e});
  node["landuse"~"^(recreation_ground|village_green|religious|grass)$"](${s},${w},${n},${e});
  way["amenity"](${s},${w},${n},${e});
  way["shop"](${s},${w},${n},${e});
  way["tourism"](${s},${w},${n},${e});
  way["office"](${s},${w},${n},${e});
  way["building"](${s},${w},${n},${e});
  way["leisure"](${s},${w},${n},${e});
  way["historic"](${s},${w},${n},${e});
  way["landuse"~"^(recreation_ground|village_green|religious|grass)$"](${s},${w},${n},${e});
);
out body;
>;
out skel qt;
`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "gougle-map-tools/1.0 (kasumi pin generator)",
    },
    body: "data=" + encodeURIComponent(query),
  });
  if (!res.ok) {
    throw new Error(`Overpass HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res.json();
}

function idToSeedKey(id) {
  const m = String(id).match(/^pin-osm-(node|way)-(\d+)$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

function buildTagIndex(elements) {
  const map = new Map();
  for (const el of elements || []) {
    if (!el.tags) continue;
    map.set(`${el.type}/${el.id}`, el.tags);
  }
  return map;
}

function refreshOsmPinIcons(pins, tagIndex) {
  const usedTitles = new Set(pins.map((p) => p.title).filter(Boolean));
  let changed = 0;
  for (const pin of pins) {
    if (!String(pin.id).startsWith("pin-osm-")) continue;
    const seedKey = idToSeedKey(pin.id);
    if (!seedKey) continue;
    const tags = tagIndex.get(seedKey);
    if (!tags) continue;
    const kind = classifyTags(tags);
    if (!kind) continue;

    let title = fictionTitle(kind.iconId, seedKey, pin.area || nearestArea(pin.lat, pin.lng), kind.kindKey);
    const rand = rng(hashSeed(seedKey));
    if (usedTitles.has(title) && title !== pin.title) {
      const n = 2 + Math.floor(rand() * 7);
      if (kind.iconId === "tyuusyazyou") title = `${title}（${n}番）`;
      else if (kind.iconId === "toilet") title = `${title} ${n}号`;
      else title = `${title} ${n}号店`;
    }

    const same =
      pin.iconId === kind.iconId &&
      pin.title === title &&
      pin.body === fictionBody(kind.iconId, title, kind.kindKey);
    if (same) continue;

    usedTitles.delete(pin.title);
    pin.iconId = kind.iconId;
    pin.category = kind.category;
    pin.poiKind = kind.poiKind;
    pin.title = title;
    pin.body = fictionBody(kind.iconId, title, kind.kindKey);
    pin.minZoom = minZoomFor(kind.iconId);
    usedTitles.add(title);
    changed++;
  }
  return changed;
}

function elementsToCandidates(elements) {
  const nodes = new Map();
  for (const el of elements) {
    if (el.type === "node" && el.lat != null && el.lon != null) {
      nodes.set(el.id, { lat: el.lat, lng: el.lon });
    }
  }
  const out = [];
  for (const el of elements) {
    if (!el.tags) continue;
    const kind = classifyTags(el.tags);
    if (!kind) continue;

    let pt = null;
    let seedKey = "";
    if (el.type === "node") {
      pt = { lat: el.lat, lng: el.lon };
      seedKey = `node/${el.id}`;
    } else if (el.type === "way" && el.nodes) {
      const coords = [];
      for (const nid of el.nodes) {
        const c = nodes.get(nid);
        if (c) coords.push(c);
      }
      if (coords.length < 3) continue;
      let sx = 0;
      let sy = 0;
      for (const c of coords) {
        sx += c.lng;
        sy += c.lat;
      }
      pt = { lat: sy / coords.length, lng: sx / coords.length };
      seedKey = `way/${el.id}`;
    }
    if (!pt) continue;

    out.push({ pt, tags: el.tags, kind, seedKey });
  }
  return out;
}

function isKasumiCoord(lat, lng) {
  return lat > 36.03 && lat < 36.07 && lng > 138.08 && lng < 138.14;
}

function isManualPin(pin) {
  return pin.id && !String(pin.id).startsWith("pin-osm-");
}

function tooCloseToPins(pt, pins, radiusM, filter) {
  for (const p of pins) {
    if (!isKasumiCoord(p.lat, p.lng)) continue;
    if (filter === "manual" && !isManualPin(p)) continue;
    if (distM(pt.lat, pt.lng, p.lat, p.lng) < radiusM) return true;
  }
  return false;
}

function buildPin(candidate, usedTitles, area) {
  const { pt, kind, seedKey } = candidate;
  let title = fictionTitle(kind.iconId, seedKey, area, kind.kindKey);
  const rand = rng(hashSeed(seedKey));
  if (usedTitles.has(title)) {
    const n = 2 + Math.floor(rand() * 7);
    if (kind.iconId === "tyuusyazyou") title = `${title}（${n}番）`;
    else if (kind.iconId === "toilet") title = `${title} ${n}号`;
    else if (kind.kindKey === "pharmacy") {
      const sa = area.replace(/^霞ノ杜町/, "").replace(/大字/, "") || "霞ノ杜";
      title = `${title} ${sa}店`;
    }
    else title = `${title} ${n}号店`;
  }
  usedTitles.add(title);
  const reviews = generateReviews(kind.iconId, seedKey, kind.kindKey);
  const pin = {
    id: `pin-osm-${seedKey.replace("/", "-")}`,
    lat: Math.round(pt.lat * 1e8) / 1e8,
    lng: Math.round(pt.lng * 1e8) / 1e8,
    category: kind.category,
    poiKind: kind.poiKind,
    iconId: kind.iconId,
    title,
    area,
    rating: ratingFor(kind.iconId, rand),
    body: fictionBody(kind.iconId, title, kind.kindKey),
    minZoom: minZoomFor(kind.iconId),
    _osmSource: seedKey,
  };
  if (reviews.length) pin.reviews = reviews;
  return pin;
}

async function main() {
  const bbox = JSON.parse(fs.readFileSync(BBOX_PATH, "utf8"));
  const { south, west, north, east } = bbox;
  const skipManual = bbox.skipRadiusManualMeters ?? 6;
  const skipAny = bbox.skipRadiusAnyMeters ?? 2.5;
  const skipBatch = bbox.skipRadiusNewBatchMeters ?? 2;
  const maxPerArea = bbox.maxPerArea || {};
  const station = bbox.station || { lat: 36.04684, lng: 138.11629 };

  console.log(DRY_RUN ? "=== dry-run ===" : "=== apply ===");
  console.log(`範囲: ${south},${west} — ${north},${east}`);

  let data = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));

  if (REBALANCE) {
    const rb = rebalanceOsmPinAreas(data.pins, maxPerArea);
    if (rb.changed > 0) {
      data.pins = rb.pins;
      console.log(`OSMピン住所を再割当: ${rb.changed} 件`);
    }
  }

  const existingIds = new Set(data.pins.map((p) => p.id));
  const kasumiExisting = data.pins.filter((p) => isKasumiCoord(p.lat, p.lng));
  const areaCounts = countAreas(kasumiExisting);

  console.log("Overpass 取得中…");
  const osm = await fetchOverpass(south, west, north, east);
  const tagIndex = buildTagIndex(osm.elements);
  const iconRefresh = refreshOsmPinIcons(data.pins, tagIndex);
  if (iconRefresh > 0) {
    console.log(`既存 OSM ピンのアイコン再分類: ${iconRefresh} 件`);
  }

  let candidates = elementsToCandidates(osm.elements || []);
  candidates.sort((a, b) => candidatePriority(a.pt, station) - candidatePriority(b.pt, station));
  console.log(`OSM 候補: ${candidates.length} 件`);

  const newPins = [];
  const usedTitles = new Set();
  const skipped = { manual: 0, any: 0, batch: 0, duplicate: 0, areaCap: 0 };

  for (const c of candidates) {
    const area = pickAreaForNewPin(c.pt.lat, c.pt.lng, areaCounts, maxPerArea);
    if (!area) {
      skipped.areaCap++;
      continue;
    }
    if (tooCloseToPins(c.pt, kasumiExisting, skipManual, "manual")) {
      skipped.manual++;
      continue;
    }
    if (tooCloseToPins(c.pt, kasumiExisting, skipAny, "all")) {
      skipped.any++;
      continue;
    }
    if (tooCloseToPins(c.pt, newPins, skipBatch, "all")) {
      skipped.batch++;
      continue;
    }

    const pin = buildPin(c, usedTitles, area);
    if (existingIds.has(pin.id)) {
      skipped.duplicate++;
      continue;
    }
    delete pin._osmSource;
    areaCounts[area] = (areaCounts[area] || 0) + 1;
    newPins.push(pin);
  }

  console.log(`新規ピン: ${newPins.length} 件`);
  console.log(
    `スキップ — 手置き${skipManual}m内: ${skipped.manual}, 全ピン${skipAny}m内: ${skipped.any}, 新規同士${skipBatch}m内: ${skipped.batch}, 地域上限: ${skipped.areaCap}, id重複: ${skipped.duplicate}`
  );
  const lakeN = countAreas(kasumiExisting.concat(newPins));
  console.log(
    `湖畔: ${lakeN["霞ノ杜町湖畔"] || 0} / 湖岸: ${lakeN["霞ノ杜町湖岸"] || 0} / 駅前: ${lakeN["霞ノ杜町駅前"] || 0} / 木戸: ${lakeN["霞ノ杜町木戸"] || 0}`
  );

  if (newPins.length) {
    const iconDist = {};
    for (const p of newPins) iconDist[p.iconId] = (iconDist[p.iconId] || 0) + 1;
    console.log("\n新規アイコン内訳:", JSON.stringify(iconDist));
    console.log("\n例（最大10件）:");
    newPins.slice(0, 10).forEach((p) => {
      console.log(`  ${p.title} [${p.iconId}] @ ${p.area} (${p.rating}★, 口コミ${p.reviews?.length || 0})`);
    });
  }

  if (DRY_RUN) {
    console.log("\n反映するには --dry-run を外して再実行してください。");
    return;
  }

  data.pins = data.pins.concat(newPins);
  fs.writeFileSync(MAP_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`\n書き込み: ${MAP_PATH} (+${newPins.length})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
