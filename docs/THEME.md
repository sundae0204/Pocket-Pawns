# 畫面美化與自訂 CSS

功能邏輯在 **`game.js`**；**版面與字級**請優先改 **`themes/custom.css`**（已在 `index.html` 於 `styles.css` **之後**載入，後載入優先生效）。

---

## 你可以怎麼做

| 做法 | 適合情況 |
|------|----------|
| **只改 `themes/custom.css`** | 調字體、字級、顏色、間距、圓角、背景圖、`display`／`grid` 等，**不必動 JS** |
| **改 `styles.css` 的 `:root` 變數** | 想從源頭改主色、字族；或與 `custom.css` 二選一即可 |
| **PNG／圖檔** | 放 `assets/…`，在 `custom.css` 寫 `background-image: url(...)` 或之後在 HTML 加 `<img>` 再指定 class |

也就是：**你先設計完視覺 → 把圖放資料夾 → 在 `custom.css` 對應 selector 接上圖與排版**，邏輯仍由我們維護的結構與 id／class 支撐。

---

## 過場黑幕時間

黑幕流程為：**淡入 → 全黑時換頁 → 淡出**。時間由 **`:root` 的 `--pp-curtain-ms`**（毫秒）控制，**`game.js` 會讀這個值**，請與 CSS 一致。

```css
:root {
  --pp-curtain-ms: 500;
}
```

寫在 `themes/custom.css` 即可覆寫。

---

## 常用變數（`styles.css` 的 `:root`）

| 變數 | 用途 |
|------|------|
| `--pp-font-sans` | 全站字族 |
| `--pp-curtain-ms` | 黑幕淡入／淡出各一段的毫秒數 |
| `--panel-purple`、`--panel-blue` 等 | 面板色（可直接在 custom 覆寫） |

---

## 主要畫面對應的 DOM（方便你寫選取器）

| 畫面 | 容器 id / class |
|------|-----------------|
| 標題 | `#title-screen`、`.title-logo`、`.title-btn` |
| 製作名單 | `#credits-screen` |
| 角色選單 | `#character-select`、`.character-page`、`.character-card-mini`、`.stat-sort-btn` |
| 角色詳情 | `#character-detail`、`.character-detail-name`、`.character-detail-menu-dlg`（台詞來自 `dialogueData`） |
| 戰鬥 | `#viewport`、`.game-root`、`.enemy-hud`、`.player-panel`、`.stage-band` |
| 對話氣泡 | `#player-speech-bubble`、`#enemy-speech-bubble`、`.speech-bubble-text` |
| 結算 | `#settlement`、`.settlement-ending`、`.settlement-stat-list` |
| 黑幕 | `#screen-curtain` |

更細的 class 可用瀏覽器開發者工具對著元素複製 selector。

---

## 圖檔協作

見 **`docs/ASSETS.md`**（命名、資料夾、要提供給開發的資訊）。

---

## 不建議

- 刪除或改動 **`id`**（例如 `btn-menu`、`character-strip`）：`game.js` 依賴這些綁事件與更新。
- 把 **`hidden` 屬性**拿掉又改用別的方式隱藏，可能與現有 `[hidden] { display: none !important }` 規則衝突；若要自訂隱藏方式，請一併調整對應 CSS。
