/**
 * POI アイコン SVG を img/icons/ に生成（白シルエット・mask 用）
 * 本番 PNG に差し替える場合は data/poi-icons.json の file を更新
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "img", "icons");

const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">${body}</svg>\n`;

const ICONS = {
  dot: '<circle cx="12" cy="12" r="7"/>',
  byouinn:
    '<rect x="5" y="8" width="14" height="12" rx="1"/><path d="M12 4v4M9 6h6" stroke="#fff" stroke-width="1.5" fill="none"/><path d="M10 13h4v5h-4z"/>',
  shop: '<path d="M6 10l2-5h8l2 5v9H6z"/><rect x="9" y="14" width="6" height="5"/>',
  cafe: '<rect x="7" y="10" width="10" height="7" rx="1"/><path d="M17 12h1.5a2 2 0 0 1 0 4H17" fill="none" stroke="#fff" stroke-width="1.4"/><path d="M9 7c0-1 1-2 3-2s3 1 3 2" fill="none" stroke="#fff" stroke-width="1.3"/>',
  bar: '<path d="M8 18h8M9 8l6 7H8l1-7z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>',
  toilet:
    '<circle cx="8.5" cy="9" r="2.2"/><circle cx="15.5" cy="9" r="2.2"/><rect x="6" y="12" width="12" height="7" rx="1"/><line x1="12" y1="12" x2="12" y2="19" stroke="#fff" stroke-width="1"/>',
  renntaka:
    '<path d="M5 15h14l-1.5-4H7L5 15z"/><circle cx="8" cy="16.5" r="1.5"/><circle cx="16" cy="16.5" r="1.5"/><path d="M7 11h10" stroke="#fff" stroke-width="1.2" fill="none"/>',
  supermarket:
    '<path d="M7 9h10l-1 9H8L7 9z"/><circle cx="10" cy="19" r="1"/><circle cx="14" cy="19" r="1"/><path d="M9 6h6l1 3H8l1-3z"/>',
  tera: '<path d="M4 18h16"/><path d="M6 18V10l6-5 6 5v8"/><path d="M9 18v-5h6v5"/><path d="M12 5v3"/>',
  saikuru:
    '<circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6M7 12l3-5h4l3 5" fill="none" stroke="#fff" stroke-width="1.4"/>',
  syogakkou:
    '<rect x="6" y="10" width="12" height="9"/><path d="M4 10l8-5 8 5"/><rect x="10" y="14" width="4" height="5"/><path d="M9 6h6v2H9z"/>',
  koukou:
    '<rect x="5" y="9" width="14" height="10"/><path d="M3 9l9-5 9 5"/><rect x="10" y="13" width="4" height="6"/><circle cx="18" cy="7" r="1.5"/>',
  koubann:
    '<rect x="5" y="6" width="14" height="12" rx="1"/><path d="M8 10h8M8 13h6M8 16h4" stroke="#fff" stroke-width="1.2" fill="none"/>',
  keisatusyo:
    '<rect x="5" y="8" width="14" height="11"/><path d="M5 8l7-4 7 4"/><rect x="10" y="13" width="4" height="6"/><path d="M12 4v2" stroke="#fff" stroke-width="1.5"/>',
  onsenn:
    '<path d="M8 16c2-3 2-6 0-8M12 18c2-4 2-8 0-11M16 15c2-3 2-6 0-8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  conbini:
    '<rect x="5" y="8" width="14" height="11" rx="1"/><path d="M8 8V6h8v2"/><rect x="9" y="12" width="6" height="4"/>',
  hakubutukann:
    '<rect x="4" y="9" width="16" height="10"/><path d="M4 9l8-5 8 5"/><rect x="9" y="13" width="2" height="6"/><rect x="13" y="13" width="2" height="6"/>',
  hotel: '<rect x="5" y="7" width="14" height="12"/><rect x="8" y="11" width="3" height="3"/><rect x="13" y="11" width="3" height="3"/><rect x="8" y="15" width="8" height="4"/>',
  sizenn:
    '<circle cx="12" cy="10" r="5"/><rect x="11" y="15" width="2" height="5"/><path d="M7 20h10" stroke="#fff" stroke-width="1.5"/>',
  yubinnkyoku:
    '<rect x="5" y="7" width="14" height="12" rx="1"/><text x="12" y="16" text-anchor="middle" font-size="8" font-family="sans-serif" fill="#fff">〒</text>',
  zinzya:
    '<path d="M6 18h12"/><path d="M8 18V11l4-6 4 6v7"/><path d="M6 11h12" stroke="#fff" stroke-width="1.5" fill="none"/>',
  siseki:
    '<rect x="8" y="8" width="3" height="3"/><rect x="13" y="11" width="3" height="3"/><rect x="9" y="14" width="3" height="3"/>',
  bank: '<rect x="4" y="10" width="16" height="9"/><path d="M4 10l8-5 8 5"/><text x="12" y="17" text-anchor="middle" font-size="7" font-family="sans-serif" fill="#fff">¥</text>',
  insyoku:
    '<path d="M8 7v10M10 7v10M12 7v10" stroke="#fff" stroke-width="1.3"/><path d="M14 7c2 0 3 2 3 5s-1 5-3 5" fill="none" stroke="#fff" stroke-width="1.3"/>',
  tyuusyazyou:
    '<rect x="5" y="5" width="14" height="14" rx="2"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" font-family="sans-serif" fill="#fff">P</text>',
};

fs.mkdirSync(OUT, { recursive: true });
for (const [id, body] of Object.entries(ICONS)) {
  fs.writeFileSync(path.join(OUT, `${id}.svg`), wrap(body), "utf8");
}
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${OUT}`);
