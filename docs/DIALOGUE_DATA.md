# dialogueData.json 說明

根目錄 **`dialogueData.json`** 以**角色 ID**（與 `characters.js` 的 `id` 一致）對應各情境台詞。

---

## 結構

| 鍵 | 型別 | 時機 |
|----|------|------|
| `menuSelect` | 字串 | **角色選單**：點角色進入詳情時，詳情頁上方顯示的一句話（**所有角色台詞以此檔為準**，勿在 `characters.js` 重複撰寫） |
| `battleOpen` | 字串 | **戰鬥開場**：該角色一句話；我方氣泡用玩家角色、敵方氣泡用當前對手角色 |
| `victory` | 字串 | **該角色獲勝**時的一句話（不區分操作者是玩家或 CPU） |
| `defeat` | 字串 | **該角色敗北**時的一句話 |

戰鬥結束時：擊敗對手則玩家氣泡播玩家 ID 的 `victory`、敵方氣泡播對手 ID 的 `defeat`；玩家敗北則玩家氣泡播 `defeat`、敵方氣泡播對手的 `victory`。

舊版曾使用 `{ "player": "…", "enemy": "…" }`，程式仍會相容（優先讀 `player`，再讀 `enemy`），建議改為單一字串。

### 特殊鍵 `_default`

若某角色 ID **沒有**寫入檔案，或某欄位缺失，**遊戲會從 `_default` 補上**，避免壞檔。

---

## 與其他資料的分工

| 檔案 | 內容 |
|------|------|
| `characters.js` | 能力值、名稱、編號、`sortIndex`（**不含台詞**） |
| `dialogueData.json` | **全部台詞**（選單 `menuSelect`、開戰／勝負等） |

新增角色時請在 **`characters.js` 加一筆資料**，並在 **`dialogueData.json` 以同樣 `id` 加一筆**（至少 `menuSelect`；其餘欄位可缺省並由 `_default` 補上）。

---

## 程式載入

`index.html` 會先載入 **`dialogueData.js`**，將台詞寫入 `window.__POCKET_PAWNS_DIALOGUE__`（**可直接用檔案總管雙擊 `index.html` 開啟**，避免 `file://` 下 `fetch('dialogueData.json')` 被 CORS 擋下）。

若未注入上述變數（例如自行移除該 `<script>`），`game.js` 會改以 `fetch('dialogueData.json')` 載入；失敗時僅使用 `_default` 的內建後備字串。更新台詞請改 **`dialogueData.json`** 後執行 `node scripts/sync-dialogue-data.js` 重新產生 `dialogueData.js`（或見該腳本內 PowerShell 備用指令）。

---

## 擴充檢查

- [ ] 新角色 `id` 與 `characters.js` 完全一致  
- [ ] 四種情境是否都需要：若暫缺，可只寫 `menuSelect`，其餘靠 `_default`  
- [ ] JSON 逗號、引號為英文半形，最後一個欄位後**不要**多逗號  
