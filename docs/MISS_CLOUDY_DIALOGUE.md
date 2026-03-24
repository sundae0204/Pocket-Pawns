# Miss Cloudy 台詞與表情統一規格

請編輯根目錄的 `miss-cloudy-data.js`，這是角色選單、角色詳情、戰鬥頁共用的資料來源。

## 檔案結構

```javascript
window.POCKET_PAWNS_MISS_CLOUDY = {
  faces: {
    calm: 0,
    cheer: 1,
    alert: 2,
  },
  pages: {
    characterSelect: { face: "cheer", text: "..." },
    characterDetail: { face: "calm", text: "..." },
    battle: {
      report: { face: "calm", text: "目前場景 {field}，直接屬性 x2。{phase}，請出牌。" },
      victory: { face: "cheer", text: "..." },
      defeat: { face: "alert", text: "..." },
    },
  },
};
```

## 表情圖對應

- `0` -> `assets/MissCloudy/Miss_Cloudy00.png`
- `1` -> `assets/MissCloudy/Miss_Cloudy01.png`
- `2` -> `assets/MissCloudy/Miss_Cloudy02.png`

你可以在 `faces` 自訂命名（例如 `happy`、`serious`），只要對應到數字索引即可。

## 可用模板變數（戰鬥 report）

- `{field}`：目前場景名稱（例如火、水）
- `{phase}`：目前階段文字（玩家攻擊階段 / 玩家防禦階段）

## 維護建議

- 優先調整 `text`，不需要改 `game_card.js`
- 若新增表情圖，先補 `assets/MissCloudy`，再更新 `faces` 對應
- 若某欄缺失，程式會使用內建預設台詞與表情，不會壞掉
