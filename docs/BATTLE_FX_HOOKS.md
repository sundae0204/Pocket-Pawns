# Battle FX Hooks

`game_card.js` 會在特定時機呼叫可選的全域 hooks：

```js
window.PocketPawnsBattleFxHooks = {
  showy(payload) {},
  attack(payload) {},
};
```

## showy(payload)

- 觸發時機：玩家啟用 `showy` 特殊卡並進入回合結算
- payload:
  - `stat`: 本回合屬性（STR/INT/...）
  - `phase`: `attack` 或 `defense`

## attack(payload)

- 觸發時機：玩家在攻擊階段命中敵方
- payload:
  - `stat`: 本回合屬性
  - `phase`: `attack`
  - `attacker`: `"player"`
  - `target`: `"enemy"`
  - `special`: 當回合啟用的特殊卡（或 `null`）
  - `intensity`: 特效強度倍率（`seven77` 會提高）

## seven77 與攻擊特效

- `seven77` 除了最終值 `+777`，也會把 `attack` hook 的 `intensity` 提升（目前為 `1.8`）。
- 你之後做 Animation sequence 時，可用這個倍率強化演出。

## 無 hook 時的預設行為

- `showy`: 走現有 `.showy-fx` 視覺效果
- `attack`: 走現有 `.screen-shake` 輕量效果
