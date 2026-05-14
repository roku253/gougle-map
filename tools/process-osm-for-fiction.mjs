/**
 * data/osm-raw.geojson を読み、story-bbox.json のコア多角形内の地物だけ name を差し替え。
 * 出力: data/osm-derived.geojson
 *
 * 使い方:
 *   npm run process:osm
 *
 * 名前ルール: tools/rename-rules.json（無ければ example をコピー）
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const dataDir = join(root, "data")
const rawPath = join(dataDir, "osm-raw.geojson")
const outPath = join(dataDir, "osm-derived.geojson")
const rulesPath = join(__dirname, "rename-rules.json")
const examplePath = join(__dirname, "rename-rules.example.json")

function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0]
    const yi = ring[i][1]
    const xj = ring[j][0]
    const yj = ring[j][1]
    if ((yi > lat) === (yj > lat)) continue
    const xinters = ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (lng < xinters) inside = !inside
  }
  return inside
}

function repPoint(geom) {
  if (!geom || !geom.coordinates) return null
  if (geom.type === "Point") return { lng: geom.coordinates[0], lat: geom.coordinates[1] }
  if (geom.type === "LineString") {
    const c = geom.coordinates[Math.floor(geom.coordinates.length / 2)]
    return c ? { lng: c[0], lat: c[1] } : null
  }
  if (geom.type === "Polygon") {
    const ring = geom.coordinates[0]
    if (!ring || !ring.length) return null
    let sx = 0
    let sy = 0
    const n = ring.length - 1
    for (let i = 0; i < n; i++) {
      sx += ring[i][0]
      sy += ring[i][1]
    }
    return { lng: sx / n, lat: sy / n }
  }
  return null
}

function applyRename(name, rules) {
  if (!name) return null
  if (rules[name]) return rules[name]
  if (rules.__default_inside_core) return rules.__default_inside_core
  return name
}

if (!existsSync(rawPath)) {
  console.error(`先に取得してください: npm run fetch:osm\n不足: ${rawPath}`)
  process.exit(1)
}

if (!existsSync(rulesPath)) {
  copyFileSync(examplePath, rulesPath)
  console.log(`rename-rules.json を example から作成しました。編集して再実行してください: ${rulesPath}`)
}

const cfg = JSON.parse(readFileSync(join(__dirname, "story-bbox.json"), "utf8"))
const ring = cfg.storyCoreRingLngLat
const rules = existsSync(rulesPath) ? JSON.parse(readFileSync(rulesPath, "utf8")) : {}

const raw = JSON.parse(readFileSync(rawPath, "utf8"))
const features = (raw.features || []).map((f) => {
  const p = repPoint(f.geometry)
  if (!p || !pointInRing(p.lng, p.lat, ring)) {
    return f
  }
  const props = { ...f.properties }
  const origName = props.name
  const origJa = props["name:ja"]
  if (origName) {
    props["osm:name:original"] = origName
    props.name = applyRename(origName, rules)
  }
  if (origJa) {
    props["osm:name:ja:original"] = origJa
    props["name:ja"] = applyRename(origJa, rules)
  }
  props["fiction:core"] = "yes"
  return { ...f, properties: props }
})

const out = { type: "FeatureCollection", features }
mkdirSync(dataDir, { recursive: true })
writeFileSync(outPath, JSON.stringify(out), "utf8")
console.log(`書き出し: ${outPath} （全 ${features.length}、コア内 fiction タグ付きは後で集計可）`)
