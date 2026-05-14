# Gougle Map

静的 `index.html` + `token-gate.js`。任務ポータル経由のトークンで表示します。

## 地図の構成

- **下層**: OpenStreetMap ラスタタイル（実在の地形・地名）。
- **物語エリア**: 半透明マスク + 自作 GeoJSON（架空の市街地・河川・道路など）で上書き。
- **ピン・検索**: 従来どおり作品内データ。

`token-gate.js` の `TOKEN_GATE_ORIGIN` を本番ポータルに合わせてください。

## OSM ベクタ → 加工 → 再配信（オフライン）

実データを読み、物語コア内だけ `name` を差し替えた GeoJSON を作るツールです（`tools/PIPELINE.txt` に PMTiles 化の例あり）。

```bash
cd gougle-map
npm run fetch:osm          # data/osm-raw.geojson
# tools/rename-rules.json を編集（初回は example からコピー済み）
npm run process:osm        # data/osm-derived.geojson
```

- 取得範囲・コア多角形: `tools/story-bbox.json`
- 名前置換表: `tools/rename-rules.json`（gitignore。雛形は `rename-rules.example.json`）

派生データの表示では **ODbL（OpenStreetMap）の帰属・ライセンス条件** に従ってください。

GitHub Pages ではこのリポジトリを `gougle-map` として公開してください。
