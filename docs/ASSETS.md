# 遊戲圖像資源（PNG）協作方式

之後你要把 **PNG 元件**套進遊戲時，建議用下面方式配合，我這邊才好一次對應到程式與 CSS。

**版面／字級／顏色** 若你要自己全權美化，請優先改 **`themes/custom.css`**，說明見 **`docs/THEME.md`**。

---

## 1. 目錄與命名（建議）

```
assets/
  characters/
    char_random.png        # 選單「隨機角色」全身圖（與一般角色同尺寸）
    charmin_random.png     # 同上之選單縮圖（198×122，與 charmin_001 同規）
    char_001.png           # 與 characters.js 的 id 一致（全身／戰鬥）
    charmin_001.png        # 選單縮圖
    ...
  ui/
    card_*.png
  fields/
    bg_Character.png       # 角色選單全屏背景（滿版 cover）
    …                      # 場景底圖 1920×1080（16:9），檔名與場地 id：fire.png…
  img_list_ui_bg.png       # 選單角色格：底層（與 img_list_ui 同尺寸 205×160；charmin 198×122 疊在框內）
  img_list_ui.png          # 選單角色格：最上層框（205×160）
  MissCloudy/
    Miss_Cloudy00.png      # 朵雲公主表情（00、01…；程式用 expression 切換）
    …
```

- **角色 ID** 請與 `characters.js` 的 `id`（如 `char_001`）一致，程式可用規則拼路徑：`assets/characters/${id}_idle.png`。
- 若一角色多張（待機／攻擊／受傷），可約定後綴：`char_001_attack.png`，再在程式裡列舉。

---

## 2. 請提供給我的資訊

每批資源請盡量附上：

| 項目 | 說明 |
|------|------|
| 用途 | 例如：戰鬥立繪、選單頭像、UI 按鈕 |
| 檔名規則 | 實際檔名或命名 pattern |
| 尺寸 | 寬×高（px），是否需等比例縮放 |
| 透明底 | 是否去背 PNG |
| 參考圖 | 若需對齊舞台位置，可註明「脚底對齊格線」等 |

---

## 3. 我這邊會怎麼接

- 在 **`styles.css`** 用 `background-image: url(...)` 或 **`<img>`** 取代目前的 CSS 漸層頭像／精靈。
- 在 **`index.html` / `game.js`** 依角色 `id` 動態設 `class` 或 `src`。
- 若採 **sprite sheet**，需要你提供 **裁切座標**（或單張拆好），否則先以「一角色一張全身／頭像」最省事。

---

## 4. 建議流程

1. 你先放一版 PNG 到 `assets/...`（檔名照約定）。  
2. 跟我說「要替換哪個畫面」（例如：選單小卡、戰鬥區左右立繪）。  
3. 我改對應的 HTML/CSS/JS，必要時加一個 **`ASSET_BASE`** 或每角色 `portraitUrl` 欄位在 `characters.js`。

這樣你可以專心出圖與命名，我專心接路徑與版面。
