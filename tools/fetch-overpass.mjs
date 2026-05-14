/**
 * OpenStreetMap データを Overpass API 経由で取得し、way 中心の GeoJSON に変換する。
 * 出力: data/osm-raw.geojson
 *
 * 使い方:
 *   npm run fetch:osm
 *   node tools/fetch-overpass.mjs --full   # 建物・土地利用も（重い）
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const dataDir = join(root, "data")
const outPath = join(dataDir, "osm-raw.geojson")

const full = process.argv.includes("--full")

const cfg = JSON.parse(readFileSync(join(__dirname, "story-bbox.json"), "utf8"))
const s = cfg.overpassSouth
const w = cfg.overpassWest
const n = cfg.overpassNorth
const e = cfg.overpassEast

const lightQuery = `
[out:json][timeout:180];
(
  way["highway"](${s},${w},${n},${e});
  way["waterway"~"river|stream|canal"](${s},${w},${n},${e});
  way["natural"~"wood|forest|water|scrub"](${s},${w},${n},${e});
);
out body;
>;
out skel qt;
`

const fullQuery = `
[out:json][timeout:300];
(
  way["highway"](${s},${w},${n},${e});
  way["waterway"](${s},${w},${n},${e});
  way["building"](${s},${w},${n},${e});
  way["natural"](${s},${w},${n},${e});
  way["landuse"](${s},${w},${n},${e});
);
out body;
>;
out skel qt;
`

async function overpassJson(query) {
  const url = "https://overpass-api.de/api/interpreter"
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Accept: "*/*",
      "User-Agent": "gougle-map-tools/1.0 (https://github.com/osm-fr; Overpass fetch for puzzle static site)",
    },
    body: "data=" + encodeURIComponent(query),
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Overpass HTTP ${res.status}: ${t.slice(0, 500)}`)
  }
  return res.json()
}

function elementsToGeoJson(elements) {
  const nodes = new Map()
  for (const el of elements) {
    if (el.type === "node" && el.lat != null && el.lon != null) {
      nodes.set(el.id, [el.lon, el.lat])
    }
  }
  const features = []
  for (const el of elements) {
    if (el.type !== "way" || !el.nodes || !el.tags) continue
    const coords = []
    for (const nid of el.nodes) {
      const c = nodes.get(nid)
      if (c) coords.push(c)
    }
    if (coords.length < 2) continue
    const closed =
      coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]
    const t = el.tags
    const isArea =
      closed &&
      coords.length >= 4 &&
      (t.building || t.area === "yes" || t.natural || t.landuse || t.waterway === "riverbank")
    const geom = isArea
      ? { type: "Polygon", coordinates: [coords] }
      : { type: "LineString", coordinates: coords }
    features.push({
      type: "Feature",
      id: `way/${el.id}`,
      properties: { ...t, "@osm_way_id": el.id },
      geometry: geom,
    })
  }
  return { type: "FeatureCollection", features }
}

const query = full ? fullQuery : lightQuery
console.log(full ? "モード: --full（重め）" : "モード: light（道路・河川・自然 way）")
console.log("Overpass 取得中…")

const data = await overpassJson(query)
const gj = elementsToGeoJson(data.elements || [])

mkdirSync(dataDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(gj), "utf8")
console.log(`書き出し: ${outPath} （${gj.features.length} features）`)
