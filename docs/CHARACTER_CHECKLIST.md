# 角色資料擴充檢查清單（目標約 100 名）

本專案角色來源為根目錄 **`characters.js`** 內的 `window.POCKET_PAWNS_CHARACTERS` 陣列。`game.js` 會在執行時讀取此陣列；未載入 `characters.js` 時會使用內建備援清單（僅供開發防呆）。

---

## 每個角色必填欄位

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `string` | **唯一**識別，建議 `char_001`～`char_100`，與 Supabase `character_stats.character_id` 一致。 |
| `name` | `string` | 顯示名稱。 |
| `sortIndex` | `number` | **編號**（1, 2, 3…）。未選屬性排序時，選單依此由小到大排。 |
| `initial` | `object` | 開局狀態。 |
| `initial.stats` | `number[6]` | 依序 **STR、AGI、VIT、INT、DEX、LUK**（與 `game.js` 的 `STAT_KEYS` 順序相同）。 |
| `initial.hearts` | `number` | 當前生命。 |
| `initial.maxHearts` | `number` | 生命上限。 |

---

## 擴充步驟（由開發人員執行）

1. 在 **`characters.js`** 的陣列中**追加**一筆物件（或批次貼上多筆）。
2. 確認 `id` 全檔案不重複、`sortIndex` 不重複或刻意留空位時要與企劃對齊。
3. 若使用 Supabase：新角色第一次上傳統計時，客戶端會 `upsert` 一筆 `character_stats`（見 `supabase-schema.sql`）；無需手動先建表列，但 **RLS／政策** 需允許 insert/update。
4. 在 **`dialogueData.json`** 以相同 `id` 新增一筆（至少 `menuSelect`；見 `docs/DIALOGUE_DATA.md`），並執行 `node scripts/sync-dialogue-data.js` 更新 `dialogueData.js`。
5. （選用）在 **`assets/characters/`** 放入全身圖 `{id}.png`（325×359）、選單縮圖 `charmin_{編號}.png`（198×122）；尺寸固定時可只改檔不需改程式。
6. 重新整理遊戲頁面，在選單確認：編號排序、六維排序、詳情頁、連戰隨機對手是否皆能載入該角色。

---

## 快速自我檢查（建議每次改版跑一遍）

- [ ] 陣列長度是否為預期（例如 100）。
- [ ] 每筆 `stats.length === 6`，且皆為合理非負整數（遊戲邏輯假設為數值）。
- [ ] `hearts <= maxHearts`。
- [ ] 無重複 `id`。
- [ ] `sortIndex` 是否連續或符合主企劃編號規則。
- [ ] `dialogueData.json` 中該角色的 `menuSelect` 等台詞已填寫（若已定稿）。

---

## 排序行為說明（給企劃／測試）

- 選單**上方**可點 **STR／AGI／VIT／INT／DEX／LUK**：依該屬性**由高到低**排序；**LUK** 在第二列左側。
- **未選任何排序鍵**（再點一次目前選中的鍵可取消）時，依 **`sortIndex` 小到大**（編號序）。
- 選單以 **5×2＝10** 格為一頁，**橫向滑動**切換頁。

---

## 連戰與對手

- 對手從**全角色**中隨機抽出，**同一輪連戰內**不會重複抽到同一對手，直到可選池用盡後才重新洗牌（仍排除玩家所選角色）。
- 若角色總數極大，僅需保證 `POCKET_PAWNS_CHARACTERS` 內容完整即可，無需改 `game.js` 的抽選邏輯。

---

## 畫面流程（給測試／企劃）

1. **標題** →「遊玩」→ **角色選單**（可排序、橫向滑動分頁）→ 點角色 → **角色詳情** →「確定」→ **連戰**（對手從全角色隨機、同輪不重複）。  
2. 戰勝自動進入下一對手；**敗北**或 **MENU → 退出戰鬥** → **結算** →「回到主選單」→ **標題**。  
3. 「製作團隊名單」從標題進入，返回標題。

---

## 相關檔案

| 檔案 | 用途 |
|------|------|
| `characters.js` | 角色主資料（`window.POCKET_PAWNS_CHARACTERS`） |
| `dialogueData.json` | 依角色 ID 的情境台詞（選單／開戰／勝敗），見 `docs/DIALOGUE_DATA.md` |
| `game.js` | 戰鬥、標題、選單、連戰、結算 |
| `index.html` | 標題／選單／詳情／MENU／結算 DOM |
| `styles.css` | 選單版面；`[hidden]` 須蓋過 `display:flex` 避免結算層誤顯示 |
| `assets/characters/` | 全身圖 `{id}.png`、選單縮圖 `charmin_{編號}.png` |
| `supabase.js` / `supabase-schema.sql` | 雲端統計 |
