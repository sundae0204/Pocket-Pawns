/**
 * 將 dialogueData.json 轉成 dialogueData.js（供 file:// 開啟時注入，避免 fetch 被 CORS 擋）。
 * 使用：在專案根目錄執行 node scripts/sync-dialogue-data.js
 * 注意：請勿執行 node dialogueData.json（那是 JSON，不是 JS，會出現 Invalid or unexpected token）。
 */

// 若未安裝 Node，可用 PowerShell（UTF-8）。以下含 "*/" 字樣，不可放在 /* */ 區塊註解內，否則會提早結束註解並造成 SyntaxError。
// $b=[IO.File]::ReadAllBytes("dialogueData.json"); $j=[Text.Encoding]::UTF8.GetString($b)
// $h="/**\n * 自動產生… */\n"; [IO.File]::WriteAllText("dialogueData.js", $h+"window.__POCKET_PAWNS_DIALOGUE__ = "+$j.Trim()+";`n", [Text.UTF8Encoding]::new($false))

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "dialogueData.json");
const outPath = path.join(root, "dialogueData.js");

let raw = fs.readFileSync(jsonPath, "utf8");
// 若用記事本等另存為 UTF-8 with BOM，JSON.parse 會失敗；先剝掉 BOM
if (raw.charCodeAt(0) === 0xfeff) {
  raw = raw.slice(1);
}
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error("dialogueData.json 不是合法 JSON，請檢查逗號、引號、尾逗號等。");
  throw e;
}
const body = `window.__POCKET_PAWNS_DIALOGUE__ = ${JSON.stringify(data, null, 2)};\n`;
const header = `/**\n * 自動產生：請勿手改。更新台詞請編輯 dialogueData.json 後執行\n * node scripts/sync-dialogue-data.js\n */\n`;

fs.writeFileSync(outPath, header + body, "utf8");
console.log("Wrote", outPath);
