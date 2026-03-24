/**
 * 全角色資料表（擴充至約 100 名請見 docs/CHARACTER_CHECKLIST.md）
 * 會掛在 window.POCKET_PAWNS_CHARACTERS，供 game.js 讀取。
 *
 * 台詞／情境對話統一於 dialogueData.json（menuSelect、battleOpen、victory、defeat 等），勿在此重複撰寫。
 *
 * @typedef {{ id: string, name: string, sortIndex: number, initial: { stats: number[], hearts: number, maxHearts: number } }} PocketCharacter
 */

/** @type {PocketCharacter[]} */
window.POCKET_PAWNS_CHARACTERS = [
  {
    id: "char_001",
    name: "是阿茶啦",
    sortIndex: 1,
    initial: { stats: [1, 2, 8, 4, 12, 6], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_002",
    name: "紅妻",
    sortIndex: 2,
    initial: { stats: [8, 11, 6, 5, 9, 2], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_003",
    name: "窮奇貓奇奇",
    sortIndex: 3,
    initial: { stats: [8, 10, 5, 5, 7, 5], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_004",
    name: "雲姬",
    sortIndex: 4,
    initial: { stats: [9, 9, 6, 6, 6, 4], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_005",
    name: "阿卡貓",
    sortIndex: 5,
    initial: { stats: [7, 7, 12, 4, 5, 5], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_006",
    name: "莎莉醬",
    sortIndex: 6,
    initial: { stats: [6, 14, 4, 5, 9, 2], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_007",
    name: "Moonlight",
    sortIndex: 7,
    initial: { stats: [5, 8, 5, 12, 7, 3], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_008",
    name: "神阪かんざか",
    sortIndex: 8,
    initial: { stats: [7, 10, 5, 6, 11, 1], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_009",
    name: "羅芝芝",
    sortIndex: 9,
    initial: { stats: [6, 6, 6, 6, 6, 10], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_010",
    name: "暴豆豆",
    sortIndex: 10,
    initial: { stats: [11, 5, 10, 3, 4, 7], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_011",
    name: "陽月芒果",
    sortIndex: 11,
    initial: { stats: [8, 11, 5, 7, 10, 3], hearts: 2, maxHearts: 4 },
  },
  {
    id: "char_012",
    name: "鎧鎧です",
    sortIndex: 12,
    initial: { stats: [3, 2, 3, 5, 3, 10], hearts: 2, maxHearts: 4 },
  },
];
