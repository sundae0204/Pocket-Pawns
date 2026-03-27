"use strict";

// Minimal but stable UI/logic for Pocket Pawns.
// Intentionally avoids fancy UI logic until assets are present.

const STATS = ["STR", "INT", "DEX", "AGI", "VIT", "LUK"];
const STATS_SET = new Set(STATS);

const FIELDS = [
  { id: "fire", name: "焦糖沙漠", boost: "STR" },
  { id: "water", name: "蝶豆花海", boost: "INT" },
  { id: "wood", name: "抹茶森林", boost: "DEX" },
  { id: "wind", name: "棉花糖雲海", boost: "AGI" },
  { id: "earth", name: "仙草洞", boost: "VIT" },
  { id: "metal", name: "金沙宮", boost: "LUK" },
  { id: "light", name: "奶酪教堂", boost: null },
  { id: "dark", name: "巧克力祭壇", boost: null },
  { id: "fire_memory", name: "記憶沙漠", boost: "STR", kind: "memory" },
  { id: "water_memory", name: "記憶海洋", boost: "INT", kind: "memory" },
  { id: "wood_memory", name: "記憶森林", boost: "DEX", kind: "memory" },
  { id: "wind_memory", name: "記憶天際", boost: "AGI", kind: "memory" },
  { id: "earth_memory", name: "記憶洞穴", boost: "VIT", kind: "memory" },
  { id: "metal_memory", name: "記憶王城", boost: "LUK", kind: "memory" },
  { id: "light_memory", name: "記憶教堂", boost: null, kind: "memory" },
  { id: "dark_memory", name: "記憶邪教", boost: null, kind: "memory" },
];

/** 標準場：光／闇為 X2；記憶教堂／邪教為 14−基礎值；其餘單屬性場見 FIELDS.boost */
const FIELD_LIGHT_STATS = new Set(["AGI", "VIT", "LUK"]);
const FIELD_DARK_STATS = new Set(["STR", "DEX", "INT"]);
/** 記憶場景：受影響屬性改為 14−該屬性面板值（非倍率） */
const MEMORY_FIELD_BASE = 14;

const SPECIALS = ["heal", "boost", "zero", "seven77", "redheart", "phloss", "showy"];
const SPECIAL_CARD_FILE = {
  heal: "heal.png",
  boost: "boost.png",
  zero: "zero.png",
  seven77: "seven77.png",
  redheart: "redheart.png",
  phloss: "hploss.png",
  showy: "showy.png",
};
const SPECIAL_META = {
  heal: { name: "治癒！", desc: "立即回復 1 點 HP（不超過上限）" },
  boost: { name: "雙倍卡！", desc: "本回合數值 x2" },
  zero: { name: "歸零卡！", desc: "本回合對手素質歸零" },
  seven77: { name: "777卡！", desc: "本回合玩家+ 777" },
  redheart: { name: "自爆！", desc: "本回合若命中，額外造成 1 點傷害" },
  phloss: { name: "扣血卡！", desc: "立即失去 1 點 HP" },
  showy: { name: "華麗光芒！", desc: "沒啥用" },
};

// 卡牌說明集中區：你之後可直接在這裡整理／改寫文案。
const CARD_TOOLTIPS = {
  value: {
    attackP: "攻擊牌（P）：使用我方對應屬性值參戰。",
    attackE: "攻擊牌（E）：複製敵方對應屬性值參戰。",
    defenseP: "防禦牌（P）：使用我方對應屬性值防守。",
    defenseE: "防禦牌（E）：複製敵方對應屬性值防守。",
  },
  special: {
    heal: "回復 1 點 HP（不超過上限）。",
    boost: "本回合指定屬性 x2。",
    zero: "本回合指定屬性 x0（歸零）。",
    seven77: "本回合最終值 +777，並強化攻擊特效。",
    redheart: "雙方先各失去 1 點 HP；若本回合攻擊命中，再追加 2 點傷害。",
    phloss: "立即失去 1 點 HP。",
    showy: "沒啥，就是很帥",
  },
};

const state = {
  active: false,
  resolving: false,
  player: null,
  enemy: null,
  field: null,
  phase: "attack", // attack | defense
  hand: [],
  special: null,
  specialStat: null,
  specialOn: false,
  enemySpecial: null,
  enemySpecialStat: null,
  enemySpecialOn: false,
  over: false,
};

const session = {
  playerChar: null,
  opponent: null,
  remainingOpponents: [],
  wins: 0,
  kills: 0,
  maxCombo: 0,
  seven77Draws: 0,
  any77Used: false,
  totalPlays: 0,
  globalComboRecord: 0,
  globalComboHolder: "—",
  /** 角色詳情頁載入後的「最高連續擊殺」數字（與畫面一致） */
  detailPageMaxCombo: null,
  /** 按下詳情頁「確定」進戰鬥時快照的基準，結算時與本場峰值比較是否破紀錄 */
  recordBaselineFromDetail: 0,
  submitted: false,
  pendingRecordCharacterId: "",
  match: null,
  /** 最後一回合比數與敵方特殊卡（結算顯示用） */
  lastRoundClash: null,
};

const RANDOM_CHARACTER_ENTRY = {
  id: "char_000",
  name: "神祕人物",
  sortIndex: 0,
  isRandom: true,
  initial: {
    stats: [14, 14, 14, 14, 14, 14],
    hearts: 2,
    maxHearts: 4,
  },
};

const els = {};
let dialogueData = null;
let sortStat = null;
let selectedChar = null;
const bubbleTimers = {
  playerFade: null,
  playerHide: null,
  enemyFade: null,
  enemyHide: null,
};
const battleFxTextTimers = {
  playerFade: null,
  playerClear: null,
  enemyFade: null,
  enemyClear: null,
};
const battleFxWrapHideTimers = {
  player: null,
  enemy: null,
};
const BATTLE_FX_DURATION_MS = 500;
const BATTLE_FX_TEXT_VISIBLE_MS = 2000;
const BATTLE_FX_TEXT_FADE_MS = 300;

const BATTLE_FX_META = {
  str: { text: "攻擊", json: "battle_fx_str" },
  int: { text: "魔法", json: "battle_fx_int" },
  dex: { text: "射擊", json: "battle_fx_dex" },
  vit: { text: "防御", json: "battle_fx_vit" },
  agi: { text: "回避", json: "battle_fx_agi" },
  luk: { text: "幸運", json: "battle_fx_luk" },
};

const battleFxAtlasCache = {};
/** 長按卡片顯示說明（手機 toast）後自動關閉的時間（毫秒） */
const MOBILE_TIP_AUTO_HIDE_MS = 2000;

const tipTimers = {
  toastHide: null,
  pressStart: null,
};
let mobileTooltipTouchCleanupRegistered = false;
const LS_TOTAL_PLAYS = "pocket_pawns_total_plays_v1";

const ENDINGS = {
  ko777: { title: "777 KO！", line: "你有多猛？我一秒鐘打了777下！", art: "ending-art--777" },
  nodmg7: { title: "連續 7回合0傷", line: "全方位防禦！但不是有8個方向嗎？噗！", art: "ending-art--nodmg" },
  showy3: { title: "閃耀全場的雜魚", line: "輸贏是一時的，帥是一輩子的！你看到剛才那道光了嗎？", art: "ending-art--showy" },
  lukwin: { title: "強運的棋兵", line: "愛笑的孩子運氣不會太差，我笑到下巴都脫臼了", art: "ending-art--luk" },
  lockhp: { title: "我鎖血我驕傲", line: "打我呀笨蛋！", art: "ending-art--lock" },
  redboom: { title: "自爆式攻擊", line: "傷敵一千，自損一千，但我有主角光環！", art: "ending-art--red" },
  nospecial: { title: "我的牌只有3張", line: "咦？右邊那個也能按嗎？", art: "ending-art--3card" },
  record: { title: "這個紀錄由我來守護！", line: "要簽名的都來！外面的都進來讓我簽！", art: "ending-art--record" },
  plain: { title: "美好的一天", line: "今天又是一個什麼也沒發生的日子ZZZ", art: "ending-art--plain" },
};

function getBattleFxHooks() {
  const hooks = window.PocketPawnsBattleFxHooks;
  return hooks && typeof hooks === "object" ? hooks : {};
}

function emitBattleFx(type, payload = {}) {
  const hooks = getBattleFxHooks();
  const handler = hooks[type];
  if (typeof handler === "function") {
    try {
      handler(payload);
      return;
    } catch {
      // Fallback to built-in lightweight effect when hook errors.
    }
  }
  if (!els.viewport) return;
  if (type === "showy") {
    els.viewport.classList.remove("showy-fx");
    void els.viewport.offsetWidth;
    els.viewport.classList.add("showy-fx");
    setTimeout(() => els.viewport && els.viewport.classList.remove("showy-fx"), 1700);
    return;
  }
  if (type === "seven77Shake") {
    els.viewport.classList.remove("screen-shake");
    void els.viewport.offsetWidth;
    els.viewport.classList.add("screen-shake");
    setTimeout(() => els.viewport && els.viewport.classList.remove("screen-shake"), 1100);
  }
}

function asset(rel) {
  return new URL(rel, location.href).href;
}

/** 上次 renderHearts 成功畫出的 HP／上限（用與本次比對亮→暗、暗→亮） */
const lastRenderedHeartState = { player: null, enemy: null };

let heartFxCachePromise = null;

function loadImageForHeartFx(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`heart fx image: ${src}`));
    img.src = src;
  });
}

function sortHeartFxFrameKeys(frames) {
  return Object.keys(frames).sort((a, b) => {
    const na = parseInt((a.match(/\d+/) || ["0"])[0], 10);
    const nb = parseInt((b.match(/\d+/) || ["0"])[0], 10);
    return na - nb;
  });
}

/** 先裁 atlas 子區塊再旋轉，減少 drawImage+rotate 組合的偏差 */
let heartFxPatchCanvas = null;
function getHeartFxPatchCanvas(sw, sh) {
  let c = heartFxPatchCanvas;
  if (!c) {
    c = document.createElement("canvas");
    heartFxPatchCanvas = c;
  }
  const w = Math.ceil(sw);
  const h = Math.ceil(sh);
  if (c.width < w) c.width = w;
  if (c.height < h) c.height = h;
  return c;
}

/**
 * 圖集裡 rotated:true 的還原角度（弧度）。TexturePacker／多數文件假設「順時針轉進 atlas」→ 用 -π/2 還原。
 * free-tex-packer（Jimp）版本不同時方向可能相反；若特效仍歪，請在出圖時關閉 Allow rotation（最穩），
 * 或於載入遊戲前設：window.POCKET_PAWNS_HEARTFX_ROTATED_UNWIND = Math.PI / 2（或 -Math.PI / 2）試另一邊。
 */
function heartFxRotatedUnwindRad() {
  const w = typeof window !== "undefined" ? window.POCKET_PAWNS_HEARTFX_ROTATED_UNWIND : undefined;
  if (typeof w === "number" && Number.isFinite(w)) return w;
  return -Math.PI / 2;
}

/** 與當前 max 對齊；prev 為 null 或空則不與上一幀比對（不播特效） */
function alignPrevHeartSlots(prev, max) {
  if (prev == null || !Array.isArray(prev) || prev.length === 0) return null;
  return Array.from({ length: max }, (_, i) => (i < prev.length ? !!prev[i] : false));
}

/** 由當前 HP 數值推導每格是否亮起（與 renderHearts 的 i < cur 一致） */
function buildHeartSlots(hearts, max) {
  const m = Math.max(0, max | 0);
  const h = Math.max(0, Math.min(hearts | 0, m));
  return Array.from({ length: m }, (_, i) => i < h);
}

/** TexturePacker JSON hash：畫入與 sourceSize 同大的透明畫布（此專案為 256×256） */
function drawHeartFxFrame(ctx, image, frameData) {
  const { frame, rotated, spriteSourceSize, sourceSize } = frameData;
  const sx = frame.x;
  const sy = frame.y;
  const sw = frame.w;
  const sh = frame.h;
  const dx = spriteSourceSize.x;
  const dy = spriteSourceSize.y;
  const dw = spriteSourceSize.w;
  const dh = spriteSourceSize.h;
  ctx.clearRect(0, 0, sourceSize.w, sourceSize.h);
  if (!rotated) {
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  } else {
    const patch = getHeartFxPatchCanvas(sw, sh);
    const pctx = patch.getContext("2d");
    if (!pctx) return;
    pctx.imageSmoothingEnabled = false;
    pctx.clearRect(0, 0, patch.width, patch.height);
    pctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
    ctx.save();
    ctx.translate(dx + dw / 2, dy + dh / 2);
    ctx.rotate(heartFxRotatedUnwindRad());
    ctx.drawImage(patch, 0, 0, sw, sh, -dh / 2, -dw / 2, dh, dw);
    ctx.restore();
  }
}

function normalizeBattleFxFrameData(frameData) {
  if (!frameData) return null;
  if (frameData.frame && frameData.spriteSourceSize && frameData.sourceSize) return frameData;
  const f = frameData.frame || frameData;
  if (typeof f?.x !== "number") return null;
  return {
    frame: { x: f.x, y: f.y, w: f.w, h: f.h },
    rotated: false,
    spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
    sourceSize: { w: 256, h: 256 },
  };
}

function ensureBattleFxAtlas(kindKey) {
  if (battleFxAtlasCache[kindKey]) return battleFxAtlasCache[kindKey];
  battleFxAtlasCache[kindKey] = (async () => {
    const meta = BATTLE_FX_META[kindKey];
    if (!meta) throw new Error(`unknown battle fx kind: ${kindKey}`);
    const base = meta.json;
    const embedded = typeof window !== "undefined" ? window.POCKET_PAWNS_BATTLE_FX : null;
    let json = embedded && embedded[kindKey] ? embedded[kindKey] : null;
    if (!json) {
      json = await fetch(asset(`assets/fx/${base}.json`)).then((r) => {
        if (!r.ok) throw new Error(`${base}.json`);
        return r.json();
      });
    }
    const image = await loadImageForHeartFx(asset(`assets/fx/${base}.png`));
    const keys = sortHeartFxFrameKeys(json.frames || {});
    const first = keys[0] ? normalizeBattleFxFrameData(json.frames[keys[0]]) : null;
    const width = first?.sourceSize?.w || 256;
    const height = first?.sourceSize?.h || 256;
    return { json, image, keys, width, height };
  })();
  return battleFxAtlasCache[kindKey];
}

function playBattleFxCanvas(canvas, kindKey) {
  if (!canvas) return;
  if (canvas._battleFxRaf) {
    cancelAnimationFrame(canvas._battleFxRaf);
    canvas._battleFxRaf = 0;
  }
  ensureBattleFxAtlas(kindKey)
    .then((pack) => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !pack.keys.length) return;
      canvas.width = pack.width;
      canvas.height = pack.height;
      canvas.hidden = false;
      canvas.style.display = "block";
      ctx.imageSmoothingEnabled = false;
      const frameDur = BATTLE_FX_DURATION_MS / pack.keys.length;
      const start = performance.now();
      const tick = (now) => {
        if (!canvas.isConnected) {
          canvas._battleFxRaf = 0;
          return;
        }
        const elapsed = now - start;
        const idx = Math.min(Math.floor(elapsed / frameDur), pack.keys.length - 1);
        const frameData = normalizeBattleFxFrameData(pack.json.frames[pack.keys[idx]]);
        if (frameData) drawHeartFxFrame(ctx, pack.image, frameData);
        if (elapsed < BATTLE_FX_DURATION_MS) {
          canvas._battleFxRaf = requestAnimationFrame(tick);
          return;
        }
        canvas._battleFxRaf = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = "none";
        canvas.hidden = true;
      };
      canvas._battleFxRaf = requestAnimationFrame(tick);
    })
    .catch(() => {
      canvas.style.display = "none";
      canvas.hidden = true;
    });
}

function ensureHeartFxCache() {
  if (!heartFxCachePromise) {
    heartFxCachePromise = (async () => {
      let jsonU;
      let jsonD;
      const embedded =
        typeof window !== "undefined" && window.POCKET_PAWNS_HEARTFX && window.POCKET_PAWNS_HEARTFX.u && window.POCKET_PAWNS_HEARTFX.d;
      if (embedded) {
        jsonU = window.POCKET_PAWNS_HEARTFX.u;
        jsonD = window.POCKET_PAWNS_HEARTFX.d;
      } else {
        const [u, d] = await Promise.all([
          fetch(asset("assets/fx/heartfx_u.json")).then((r) => {
            if (!r.ok) throw new Error("heartfx_u.json");
            return r.json();
          }),
          fetch(asset("assets/fx/heartfx_d.json")).then((r) => {
            if (!r.ok) throw new Error("heartfx_d.json");
            return r.json();
          }),
        ]);
        jsonU = u;
        jsonD = d;
      }
      const [imgU, imgD] = await Promise.all([
        loadImageForHeartFx(asset("assets/fx/heartfx_u.png")),
        loadImageForHeartFx(asset("assets/fx/heartfx_d.png")),
      ]);
      return {
        jsonU,
        jsonD,
        imgU,
        imgD,
        keysU: sortHeartFxFrameKeys(jsonU.frames),
        keysD: sortHeartFxFrameKeys(jsonD.frames),
      };
    })();
  }
  return heartFxCachePromise;
}

function runHeartFxOnCanvas(canvas, kind, onDone) {
  if (canvas._heartFxRaf) {
    cancelAnimationFrame(canvas._heartFxRaf);
    canvas._heartFxRaf = 0;
  }
  canvas.style.display = "block";
  const finish = () => {
    if (typeof onDone === "function") onDone();
  };
  ensureHeartFxCache()
    .then((cache) => {
      const keys = kind === "u" ? cache.keysU : cache.keysD;
      const json = kind === "u" ? cache.jsonU : cache.jsonD;
      const img = kind === "u" ? cache.imgU : cache.imgD;
      const ctx = canvas.getContext("2d");
      if (!ctx || !keys.length) {
        canvas.style.display = "none";
        finish();
        return;
      }
      ctx.imageSmoothingEnabled = false;
      if (kind === "u") {
        window.PocketPawnsAudio?.playHpUp?.();
      }
      const duration = 500;
      const frameDur = duration / keys.length;
      const start = performance.now();
      const tick = (now) => {
        if (!canvas.isConnected) {
          canvas._heartFxRaf = 0;
          finish();
          return;
        }
        const elapsed = now - start;
        const idx = Math.min(Math.floor(elapsed / frameDur), keys.length - 1);
        const key = keys[idx];
        drawHeartFxFrame(ctx, img, json.frames[key]);
        if (elapsed < duration) {
          canvas._heartFxRaf = requestAnimationFrame(tick);
        } else {
          canvas._heartFxRaf = 0;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.style.display = "none";
          finish();
        }
      };
      canvas._heartFxRaf = requestAnimationFrame(tick);
    })
    .catch(() => {
      canvas.style.display = "none";
      finish();
    });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function readTotalPlays() {
  try {
    return Math.max(0, Number(localStorage.getItem(LS_TOTAL_PLAYS) || "0"));
  } catch {
    return 0;
  }
}

function writeTotalPlays(v) {
  try {
    localStorage.setItem(LS_TOTAL_PLAYS, String(Math.max(0, Number(v) || 0)));
  } catch {
    // ignore
  }
}

function safeNumber(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function charThumbPath(charId) {
  if (charId === RANDOM_CHARACTER_ENTRY.id) {
    return "assets/characters/charmin_random.png";
  }
  const suffix = String(charId).replace(/^char_/, "");
  return `assets/characters/charmin_${suffix}.png`;
}

function charPortraitPath(charId) {
  if (charId === RANDOM_CHARACTER_ENTRY.id) {
    return "assets/characters/char_random.png";
  }
  return `assets/characters/${charId}.png`;
}

function isRandomCharacter(ch) {
  return !!ch && (ch.isRandom === true || ch.id === RANDOM_CHARACTER_ENTRY.id);
}

function missCloudyFacePath(index) {
  return `assets/misscloudy/miss_cloudy${String(index).padStart(2, "0")}.png`;
}

function getMissCloudyConfig() {
  const cfg = window.POCKET_PAWNS_MISS_CLOUDY;
  return cfg && typeof cfg === "object" ? cfg : {};
}

function getMissCloudyFaceIndex(faceToken) {
  const cfg = getMissCloudyConfig();
  const faces = cfg.faces || {};
  if (typeof faceToken === "number") return faceToken;
  if (typeof faceToken === "string" && Number.isFinite(Number(faceToken))) return Number(faceToken);
  if (typeof faceToken === "string" && Number.isFinite(Number(faces[faceToken]))) return Number(faces[faceToken]);
  return 0;
}

function fillTemplate(text, vars) {
  return String(text || "").replace(/\{(\w+)\}/g, (_, key) => String(vars?.[key] ?? ""));
}

function applyMissCloudy(target, entry, vars = {}) {
  if (!entry) return;
  const text = fillTemplate(entry.text, vars);
  const faceIndex = getMissCloudyFaceIndex(entry.face);
  if (target === "characterSelect") {
    if (els.characterSelectNpcFace) els.characterSelectNpcFace.src = asset(missCloudyFacePath(faceIndex));
    if (els.characterSelectNpcMessage) els.characterSelectNpcMessage.textContent = text;
    return;
  }
  if (target === "characterDetail") {
    if (els.characterDetailNpcFace) els.characterDetailNpcFace.src = asset(missCloudyFacePath(faceIndex));
    if (els.characterDetailNpcMessage) els.characterDetailNpcMessage.textContent = text;
    return;
  }
  if (target === "battle") {
    if (els.npcFace) els.npcFace.src = asset(missCloudyFacePath(faceIndex));
    if (els.npcMessage) els.npcMessage.textContent = text;
  }
}

function getMissCloudyEntry(pageKey, stateKey) {
  const defaults = {
    characterSelect: { face: 0, text: "選擇你的角色。" },
    characterDetail: { face: 0, text: "確認後出戰吧。" },
    "battle:report": { face: 0, text: "目前場景 {field}，{fieldRule}。{phase}，請出牌。" },
    "battle:victory": { face: 1, text: "太棒了！這局拿下了！" },
    "battle:defeat": { face: 2, text: "先穩住節奏，下一局扳回來！" },
  };
  const cfg = getMissCloudyConfig();
  const pages = cfg.pages || {};
  const page = pages[pageKey] || {};
  if (!stateKey) return page.text ? page : defaults[pageKey];
  const key = `${pageKey}:${stateKey}`;
  return page[stateKey] || defaults[key] || null;
}

/**
 * 台詞欄位可為字串，或舊版 { player, enemy }（會優先取 player，再取 enemy）。
 */
function dialogueLine(row, base, key, fallback) {
  const r = row[key];
  const b = base[key];
  if (typeof r === "string" && r.trim()) return r;
  if (typeof b === "string" && b.trim()) return b;
  if (r && typeof r === "object") {
    if (typeof r.player === "string" && r.player.trim()) return r.player;
    if (typeof r.enemy === "string" && r.enemy.trim()) return r.enemy;
  }
  if (b && typeof b === "object") {
    if (typeof b.player === "string" && b.player.trim()) return b.player;
    if (typeof b.enemy === "string" && b.enemy.trim()) return b.enemy;
  }
  return fallback;
}

function getDialogueForCharacter(charId) {
  if (charId === RANDOM_CHARACTER_ENTRY.id) {
    return {
      menuSelect: "這次會抽到誰呢？",
      battleOpen: "抽卡時刻，來看看命運！",
      victory: "隨機之力，太神啦！",
      defeat: "這次手氣差了點。",
    };
  }
  const base = (dialogueData && dialogueData._default) || {};
  const row = (dialogueData && dialogueData[charId]) || {};
  return {
    menuSelect: row.menuSelect || base.menuSelect || "準備出戰吧。",
    battleOpen: dialogueLine(row, base, "battleOpen", "開戰了！"),
    victory: dialogueLine(row, base, "victory", "勝利！"),
    defeat: dialogueLine(row, base, "defeat", "敗北。"),
  };
}

function specialName(kind) {
  return (SPECIAL_META[kind] && SPECIAL_META[kind].name) || kind || "無";
}

/** 歸零卡在手上顯示的名稱：攻擊方為 VIT／AGI／LUK，防守方為 STR／INT／DEX */
function zeroSpecialCardTitle(stat) {
  return stat ? `${stat}歸0！` : "歸零卡！";
}

function specialCardDisplayName(kind, stat) {
  if (kind === "zero" && stat) return zeroSpecialCardTitle(stat);
  return specialName(kind);
}

function getValueCardTooltip(card) {
  const phase = state.phase === "attack" ? "attack" : "defense";
  const side = card.side === "E" ? "E" : "P";
  const key = `${phase}${side}`;
  const basic = CARD_TOOLTIPS.value[key] || "";
  return `${card.stat} ${card.side}：${basic}`;
}

function getSpecialCardTooltip(kind, stat) {
  const base = CARD_TOOLTIPS.special[kind] || "";
  if (kind === "boost" && stat) return `${specialName(kind)}（${stat} x2）：${base}`;
  if (kind === "zero" && stat) return `${zeroSpecialCardTitle(stat)}${base ? `：${base}` : ""}`;
  return `${specialName(kind)}：${base}`;
}

function ensureTipEls() {
  if (!els.mobileTipToast) {
    const toast = document.createElement("div");
    toast.className = "mobile-tip-toast";
    toast.hidden = true;
    document.body.appendChild(toast);
    els.mobileTipToast = toast;
  }
  if (!els.cardHoverTooltip) {
    const tip = document.createElement("div");
    tip.className = "card-hover-tooltip";
    tip.hidden = true;
    document.body.appendChild(tip);
    els.cardHoverTooltip = tip;
  }
}

function hideCardHoverTip() {
  if (els.cardHoverTooltip) els.cardHoverTooltip.hidden = true;
}

function showCardHoverTip(text, evt, anchorEl) {
  if (!text) return;
  ensureTipEls();
  if (!els.cardHoverTooltip) return;
  const tip = els.cardHoverTooltip;
  tip.textContent = text;
  tip.hidden = false;
  const vw = window.innerWidth || document.documentElement.clientWidth || 0;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const margin = 12;
  const w = tip.offsetWidth || 260;
  const h = tip.offsetHeight || 64;
  const hasPointer =
    evt &&
    typeof evt.clientX === "number" &&
    typeof evt.clientY === "number" &&
    !Number.isNaN(evt.clientX) &&
    !Number.isNaN(evt.clientY);
  let left;
  let top;
  if (hasPointer) {
    left = evt.clientX + 16;
    top = evt.clientY + 16;
  } else if (anchorEl && typeof anchorEl.getBoundingClientRect === "function") {
    const r = anchorEl.getBoundingClientRect();
    left = r.left + r.width / 2 - w / 2;
    top = r.bottom + 8;
  } else {
    left = margin + 16;
    top = margin + 16;
  }
  if (left + w + margin > vw) left = Math.max(margin, vw - w - margin);
  if (left < margin) left = margin;
  if (top + h + margin > vh) {
    if (hasPointer) {
      top = Math.max(margin, evt.clientY - h - 16);
    } else if (anchorEl && typeof anchorEl.getBoundingClientRect === "function") {
      const r = anchorEl.getBoundingClientRect();
      top = Math.max(margin, r.top - h - 8);
    } else {
      top = Math.max(margin, vh - h - margin);
    }
  }
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function showMobileTipToast(text) {
  if (!text) return;
  ensureTipEls();
  if (!els.mobileTipToast) return;
  hideCardHoverTip();
  if (tipTimers.toastHide) clearTimeout(tipTimers.toastHide);
  els.mobileTipToast.textContent = text;
  els.mobileTipToast.hidden = false;
  tipTimers.toastHide = setTimeout(() => {
    if (els.mobileTipToast) els.mobileTipToast.hidden = true;
  }, MOBILE_TIP_AUTO_HIDE_MS);
}

function preferCardHoverTip() {
  return typeof window.matchMedia === "function" ? !window.matchMedia("(pointer: coarse)").matches : true;
}

function attachCardTooltip(btn, getText) {
  if (!btn || typeof getText !== "function") return;
  btn.dataset.longPressShown = "0";
  btn.addEventListener("mouseenter", (evt) => {
    if (preferCardHoverTip()) showCardHoverTip(getText(), evt, btn);
  });
  btn.addEventListener("mousemove", (evt) => {
    if (preferCardHoverTip()) showCardHoverTip(getText(), evt, btn);
  });
  btn.addEventListener("mouseleave", () => {
    if (preferCardHoverTip()) hideCardHoverTip();
  });
  btn.addEventListener("focus", (evt) => {
    if (preferCardHoverTip()) showCardHoverTip(getText(), evt, btn);
  });
  btn.addEventListener("blur", () => {
    if (preferCardHoverTip()) hideCardHoverTip();
  });
  btn.addEventListener("touchstart", () => {
    btn.dataset.longPressShown = "0";
    if (tipTimers.pressStart) clearTimeout(tipTimers.pressStart);
    tipTimers.pressStart = setTimeout(() => {
      btn.dataset.longPressShown = "1";
      showMobileTipToast(getText());
    }, 450);
  }, { passive: true });
  const clearPress = () => {
    if (tipTimers.pressStart) clearTimeout(tipTimers.pressStart);
    tipTimers.pressStart = null;
  };
  btn.addEventListener("touchend", clearPress, { passive: true });
  btn.addEventListener("touchcancel", clearPress, { passive: true });
}

function formatEnemySpecialSettlement(on, kind, stat) {
  const name = specialName(kind);
  if (!on) return `未發動（本回合抽中：${name}）`;
  if (kind === "boost" && stat) return `${name}（${stat} x2）`;
  if (kind === "zero" && stat) return zeroSpecialCardTitle(stat);
  return name;
}

function fieldAppliesToStat(field, stat) {
  if (!field) return false;
  if (field.kind === "memory") {
    if (field.id === "light_memory") return FIELD_LIGHT_STATS.has(stat);
    if (field.id === "dark_memory") return FIELD_DARK_STATS.has(stat);
    return field.boost === stat;
  }
  if (field.id === "light") return FIELD_LIGHT_STATS.has(stat);
  if (field.id === "dark") return FIELD_DARK_STATS.has(stat);
  return field.boost === stat;
}

/** 場景規則下的有效數值（含光／闇／單屬性 X2 與記憶場 14−基礎值）。wasZeroed：本回合歸零卡使該屬性貢獻為 0。 */
function effectiveFieldStatValue(raw, stat, wasZeroed = false) {
  if (wasZeroed) return 0;
  if (!state.field) return Math.round(raw);
  const f = state.field;
  if (f.kind === "memory") {
    if (!fieldAppliesToStat(f, stat)) return Math.round(raw);
    return Math.round(MEMORY_FIELD_BASE - raw);
  }
  return Math.round(raw * boostValue(stat));
}

function isFieldBoostActive(stat) {
  if (!state.field) return false;
  const f = state.field;
  if (f.kind === "memory") return fieldAppliesToStat(f, stat);
  return boostValue(stat) > 1;
}

function boostValue(stat) {
  if (!state.field) return 1;
  const f = state.field;
  if (f.kind === "memory") return 1;
  if (f.id === "light") return FIELD_LIGHT_STATS.has(stat) ? 2 : 1;
  if (f.id === "dark") return FIELD_DARK_STATS.has(stat) ? 2 : 1;
  return f.boost === stat ? 2 : 1;
}

function fieldBonusText(field) {
  if (!field) return "—";
  if (field.kind === "memory") {
    if (field.id === "light_memory") return "AGI·VIT·LUK 為 14−基礎值";
    if (field.id === "dark_memory") return "STR·DEX·INT 為 14−基礎值";
    return `${field.boost} 為 14−基礎值`;
  }
  if (field.id === "light") return "AGI·VIT·LUK X2";
  if (field.id === "dark") return "STR·DEX·INT X2";
  return `${field.boost} X2`;
}

function renderFieldLabel() {
  if (!els.fieldLabel || !state.field) return;
  els.fieldLabel.replaceChildren();
  const nameEl = document.createElement("span");
  nameEl.className = "field-label-name";
  nameEl.textContent = state.field.name;
  const bonusEl = document.createElement("span");
  bonusEl.className = "field-label-bonus";
  bonusEl.textContent = `（${fieldBonusText(state.field)}）`;
  els.fieldLabel.append(nameEl, bonusEl);
}

/** 僅統計玩家抽到的 777（makeSpecial），不含敵方 makeEnemySpecial。 */
function registerPlayerSpecialDraw(kind) {
  if (kind === "seven77") session.seven77Draws += 1;
}

function createMatchState() {
  return {
    usedSpecial: false,
    used777Kill: false,
    showyUses: 0,
    noDamageStreak: 0,
    maxNoDamageStreak: 0,
    oneHpStreak: 0,
    maxOneHpStreak: 0,
    lukBoostWin: false,
    redheartAttackWin: false,
    killedBySpecialThisRound: false,
  };
}

/** 本場至今的最高連續擊殺（擊敗敵人數的峰值，含中途結束前） */
function getCurrentRunPeakCombo() {
  return Math.max(session.maxCombo || 0, session.wins || 0);
}

/** 是否超過進戰鬥前在詳情頁鎖定的基準（recordBaselineFromDetail） */
function didBreakComboRecordThisRun() {
  const peak = getCurrentRunPeakCombo();
  if (peak <= 0) return false;
  const raw = Number(session.recordBaselineFromDetail);
  const baseline = Number.isFinite(raw) ? Math.max(0, raw) : 0;
  return peak > baseline;
}

/**
 * 結局圖權重：破紀錄結局為唯一首選（並觸發暱稱輸入）；其餘在「本場有達成的結局」中隨機擇一。
 */
function chooseEndingKey(outcome) {
  const m = session.match || createMatchState();

  // 破紀錄結局：通關／選單結束／戰敗皆可（只要本場峰值連擊 > 進戰鬥前基準）
  if (didBreakComboRecordThisRun()) {
    return "record";
  }

  const pool = [];
  if (m.used777Kill) pool.push("ko777");
  if (m.maxNoDamageStreak >= 7) pool.push("nodmg7");
  if (m.showyUses >= 3) pool.push("showy3");
  if (m.lukBoostWin) pool.push("lukwin");
  if (m.maxOneHpStreak >= 3) pool.push("lockhp");
  if (m.redheartAttackWin) pool.push("redboom");
  if (outcome === "win" && !m.usedSpecial) pool.push("nospecial");

  if (pool.length === 0) return "plain";
  return pool[Math.floor(Math.random() * pool.length)];
}

function renderSettlement(outcome) {
  const key = chooseEndingKey(outcome);
  const ending = ENDINGS[key] || ENDINGS.plain;
  if (els.settlementEnding) {
    els.settlementEnding.innerHTML = `<div class="settlement-ending-card">
      <div class="ending-art ${ending.art}" aria-hidden="true"></div>
      <h3 class="settlement-ending-title">${ending.title}</h3>
      <p class="settlement-ending-line">${ending.line}</p>
    </div>`;
  }
  const clash = session.lastRoundClash;
  const details = [
    ["角色", session.playerChar?.name || "—"],
    ["本輪連續擊殺數", String(session.wins || 0)],
    ["抽到777次數（本輪）", String(session.seven77Draws || 0)],
    ["最後一戰對手", session.opponent?.name || "—"],
  ];
  if (clash) {
    details.push(["敵方特殊卡（最終回）", formatEnemySpecialSettlement(clash.enemySpecialOn, clash.enemySpecialKind, clash.enemySpecialStat)]);
    details.push(["最終回傷害", `敵方 ${clash.enemyFinal} vs 我方 ${clash.playerFinal}`]);
  }
  if (els.settlementDetails) {
    els.settlementDetails.hidden = false;
    els.settlementDetails.innerHTML = `<ul class="settlement-stat-list">${details
      .map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`)
      .join("")}</ul>`;
  }
  const brokeRecord = didBreakComboRecordThisRun();
  if (els.settlementRecord) els.settlementRecord.hidden = !brokeRecord;
  session.pendingRecordCharacterId = brokeRecord ? session.playerChar?.id || "" : "";
}

async function submitBattleSummary(outcome) {
  if (session.submitted || !session.playerChar?.id) return;
  session.submitted = true;
  const peakCombo = getCurrentRunPeakCombo();
  const brokeRecord = didBreakComboRecordThisRun();
  await window.PocketPawnsSupabase?.submitBattleResult?.({
    characterId: session.playerChar.id,
    characterName: session.playerChar.name,
    outcome: outcome === "win" ? "win" : "lose",
    kills: session.wins || 0,
    used777: !!session.any77Used,
    seven77DrawsThisMatch: session.seven77Draws || 0,
    maxComboThisMatch: peakCombo,
    brokeGlobalComboRecord: brokeRecord,
    recordHolderName: null,
  });
}

async function finishBattle(outcome) {
  state.over = true;
  state.resolving = false;
  // 結束後若不重置，下一場或幕後 refresh 仍用「上一戰最後一幀」比對，特效會誤判為不該播
  lastRenderedHeartState.player = null;
  lastRenderedHeartState.enemy = null;
  syncCardsDeckVisibility();
  if (outcome === "win") {
    window.PocketPawnsAudio?.playWin?.();
  }
  setOverlaysHidden();
  renderSettlement(outcome);
  if (els.settlement) els.settlement.hidden = false;
  window.PocketPawnsAudio?.setBgm?.("end");
  await submitBattleSummary(outcome);
}

function pickAndConsumeNextOpponent() {
  if (!session.remainingOpponents.length) return null;
  const next = session.remainingOpponents.shift() || null;
  session.opponent = next;
  return next;
}

/** 新戰鬥或換關進場：若玩家 0 HP，補到 1（不超過上限），避免進場即敗。對戰中回血仍以治癒卡等為主。 */
function ensurePlayerNotZeroHpAtBattleEntry() {
  if (!state.player) return;
  if ((state.player.hearts || 0) > 0) return;
  const cap = Math.max(0, state.player.maxHearts || 4);
  state.player.hearts = Math.min(cap, 1);
}

function setupRoundForCurrentOpponent() {
  if (!session.opponent?.initial) return false;
  ensurePlayerNotZeroHpAtBattleEntry();
  state.enemy = clone(session.opponent.initial);
  state.field = rand(FIELDS);
  state.phase = "attack";
  state.hand = makeHandForPhase(state.phase);
  const sp = makeSpecial(state.phase, state.hand);
  state.special = sp.kind;
  state.specialStat = sp.targetStat;
  registerPlayerSpecialDraw(sp.kind);
  const esp = makeEnemySpecial(state.phase);
  state.enemySpecial = esp.kind;
  state.enemySpecialStat = esp.targetStat;
  state.enemySpecialOn = Math.random() < 0.5;
  state.specialOn = false;
  state.resolving = false;
  state.over = false;
  lastRenderedHeartState.player = null;
  lastRenderedHeartState.enemy = null;
  renderValueCards();
  renderSpecialColumn();
  refreshBattleUI();
  setNpcSpeech("open");
  const wins = session.wins | 0;
  if (wins >= 1) showCombatRoundFlash(`ROUND ${wins + 1}`);
  return true;
}

function setVisibleById(id) {
  if (id !== "viewport") {
    lastRenderedHeartState.player = null;
    lastRenderedHeartState.enemy = null;
  }
  const ids = ["title-screen", "credits-screen", "character-select", "character-detail", "viewport", "menu-overlay", "settlement"];
  ids.forEach((x) => {
    const el = document.getElementById(x);
    if (!el) return;
    el.hidden = x !== id;
  });
  if (id === "viewport") {
    window.PocketPawnsAudio?.setBgm?.("battle");
  } else if (id === "settlement") {
    window.PocketPawnsAudio?.setBgm?.("end");
  } else if (id === "title-screen" || id === "character-select" || id === "character-detail" || id === "credits-screen") {
    window.PocketPawnsAudio?.setBgm?.("title");
  }
  syncCardsDeckVisibility();
}

function setOverlaysHidden() {
  ["menu-overlay", "settlement"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}

/** 開戰／下一關對手時的中央跳字（使用 #combat-banner）。 */
function showCombatRoundFlash(text) {
  const el = els.combatBanner;
  if (!el || !text) return;
  window.PocketPawnsAudio?.playBattleStart?.();
  el.textContent = text;
  el.hidden = false;
  el.classList.remove("combat-banner--round-flash");
  void el.offsetWidth;
  el.classList.add("combat-banner--round-flash");
  let cleaned = false;
  const finish = () => {
    if (cleaned) return;
    cleaned = true;
    window.clearTimeout(fallback);
    el.hidden = true;
    el.classList.remove("combat-banner--round-flash");
  };
  const fallback = window.setTimeout(finish, 2200);
  el.addEventListener(
    "animationend",
    (e) => {
      if (e.target === el && e.animationName === "combat-banner-round-pop") finish();
    },
    { once: true },
  );
}

async function runCurtainTransition(task, options = {}) {
  const fadeMs = Math.max(0, Number(options.fadeMs ?? 200));
  const holdMs = Math.max(0, Number(options.holdMs ?? 0));
  const curtain = els.screenCurtain;
  if (!curtain) {
    await Promise.resolve(task?.());
    return;
  }
  curtain.hidden = false;
  curtain.setAttribute("aria-hidden", "false");
  curtain.style.transition = `opacity ${fadeMs}ms ease`;
  curtain.style.opacity = "0";
  void curtain.offsetWidth;
  curtain.style.opacity = "1";
  await sleep(fadeMs);
  if (holdMs > 0) await sleep(holdMs);
  await Promise.resolve(task?.());
  curtain.style.opacity = "0";
  await sleep(fadeMs);
  curtain.hidden = true;
  curtain.setAttribute("aria-hidden", "true");
}

function renderStats(el, stats) {
  if (!el) return;
  el.innerHTML = "";
  STATS.forEach((s) => {
    const i = STATS.indexOf(s);
    const base = safeNumber(stats?.[i] ?? 0);
    const val = effectiveFieldStatValue(base, s, false);
    const boosted = state.field ? fieldAppliesToStat(state.field, s) : false;
    const row = document.createElement("div");
    row.className = `stat-cell stat-cell--${String(s || "").toLowerCase()}`;
    row.innerHTML = `<div class="stat-value stat-value--${String(s || "").toLowerCase()}${boosted ? " stat-boosted" : ""}">${val}</div><div class="stat-label">${s}</div>`;
    el.appendChild(row);
  });
}

/**
 * @param {{ silent?: boolean, fxBaseline?: { hearts: number, max: number } }} [options]
 * silent：只更新畫面與 lastRenderedHeartState，不播特效。
 * fxBaseline：與「本回合開始時」的 HP／max 比對，一次決定扣血／回血特效（不受中途 refresh 影響）。
 */
function renderHearts(container, cur, max, side, options = {}) {
  if (!container) return;
  const maxH = Math.max(0, max | 0);
  const curH = Math.max(0, Math.min(maxH, Math.floor(Number(cur) || 0)));
  const curSlots = Array.from({ length: maxH }, (_, i) => i < curH);
  const prevState = lastRenderedHeartState[side];
  const pendingFx = [];
  const silent = options.silent === true;
  const base = options.fxBaseline;

  if (!silent) {
    if (base != null && base.max != null) {
      const oldMax = Math.max(0, base.max | 0);
      const oldH = Math.max(0, Math.min(oldMax, Math.floor(Number(base.hearts) || 0)));
      if (oldMax === maxH) {
        for (let i = 0; i < maxH; i += 1) {
          const wasOn = i < oldH;
          const isOn = i < curH;
          if (wasOn && !isOn) pendingFx.push({ i, kind: "d" });
          if (!wasOn && isOn) pendingFx.push({ i, kind: "u" });
        }
      } else {
        const prevSlots = buildHeartSlots(oldH, oldMax);
        const prevAligned = alignPrevHeartSlots(prevSlots, maxH);
        if (prevAligned) {
          for (let i = 0; i < maxH; i += 1) {
            if (prevAligned[i] && !curSlots[i]) pendingFx.push({ i, kind: "d" });
            if (!prevAligned[i] && curSlots[i]) pendingFx.push({ i, kind: "u" });
          }
        }
      }
    } else if (prevState && prevState.max === maxH) {
      const ph = prevState.hearts;
      for (let i = 0; i < maxH; i += 1) {
        const wasOn = i < ph;
        const isOn = i < curH;
        if (wasOn && !isOn) pendingFx.push({ i, kind: "d" });
        if (!wasOn && isOn) pendingFx.push({ i, kind: "u" });
      }
    } else if (prevState && prevState.max !== maxH) {
      const prevSlots = buildHeartSlots(prevState.hearts, prevState.max);
      const prevAligned = alignPrevHeartSlots(prevSlots, maxH);
      if (prevAligned) {
        for (let i = 0; i < maxH; i += 1) {
          if (prevAligned[i] && !curSlots[i]) pendingFx.push({ i, kind: "d" });
          if (!prevAligned[i] && curSlots[i]) pendingFx.push({ i, kind: "u" });
        }
      }
    }
  }

  lastRenderedHeartState[side] = { hearts: curH, max: maxH };

  container.innerHTML = "";
  for (let i = 0; i < maxH; i += 1) {
    const isOn = i < curH;
    const wrap = document.createElement("div");
    wrap.className = "heart-wrap";
    wrap.style.zIndex = String(2 + i);

    const img = document.createElement("img");
    img.width = 100;
    img.height = 88;
    img.style.width = "100px";
    img.style.height = "88px";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.src = asset(`assets/${isOn ? "hp_1" : "hp_0"}.png`);

    const fxLayer = document.createElement("div");
    fxLayer.className = "heart-fx-layer";
    fxLayer.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    canvas.className = "heart-fx-canvas";
    canvas.style.display = "none";
    fxLayer.appendChild(canvas);

    const play = pendingFx.find((p) => p.i === i);
    img.onerror = () => {
      img.remove();
      fxLayer.remove();
      const span = document.createElement("span");
      span.className = `heart${isOn ? " on" : ""}`;
      wrap.appendChild(span);
    };

    wrap.appendChild(img);
    wrap.appendChild(fxLayer);
    container.appendChild(wrap);

    if (play) {
      wrap.classList.add("heart-wrap--fx-playing");
      wrap.style.setProperty("z-index", "120", "important");
      runHeartFxOnCanvas(canvas, play.kind, () => {
        wrap.classList.remove("heart-wrap--fx-playing");
        wrap.style.removeProperty("z-index");
        if (wrap.isConnected) wrap.style.zIndex = String(2 + i);
      });
    }
  }
}

function canInteractWithCards() {
  if (!els.viewport || els.viewport.hidden) return false;
  if (els.settlement && !els.settlement.hidden) return false;
  if (els.menuOverlay && !els.menuOverlay.hidden) return false;
  if (!state.active || !state.player || !state.enemy) return false;
  if (state.over || state.resolving) return false;
  return true;
}

/** 僅在可出牌時顯示手牌，避免動畫／結算／連點誤觸（只影響 #cards-deck，不含 HP／屬性列） */
function syncCardsDeckVisibility() {
  if (!els.cardsDeck) return;
  const show = canInteractWithCards();
  els.cardsDeck.toggleAttribute("hidden", !show);
  els.cardsDeck.classList.toggle("cards-deck--inactive", !show);
  els.cardsDeck.setAttribute("aria-hidden", show ? "false" : "true");
}

/**
 * @param {{
 *   skipHearts?: boolean,
 *   silentHearts?: boolean,
 *   heartFxBaseline?: { player?: { hearts: number, max: number }, enemy?: { hearts: number, max: number } },
 * }} [options]
 * skipHearts：兩側愛心都不重畫（例如特效播放中避免整塊 innerHTML 重置）。
 * silentHearts：重畫愛心但不播增減特效（回合中、數值已變但尚未結算完時）。
 * heartFxBaseline：與回合開始時比對，於本 refresh 一次性播愛心增減特效。
 */
function refreshBattleUI(options = {}) {
  const skipBoth = options.skipHearts === true;
  const skipEnemy = skipBoth;
  const skipPlayer = skipBoth;
  const silentHearts = options.silentHearts === true;
  const heartFxBaseline = options.heartFxBaseline;
  if (!state.player || !state.enemy || !state.field) {
    syncCardsDeckVisibility();
    return;
  }
  applyBattleFieldBackground();
  renderFighters();
  renderStats(els.enemyStats, state.enemy.stats || state.enemy.initial?.stats || []);
  renderStats(els.playerStats, state.player.stats || state.player.initial?.stats || []);

  if (!skipEnemy) {
    renderHearts(els.enemyHearts, state.enemy.hearts ?? 0, state.enemy.maxHearts ?? 0, "enemy", {
      silent: silentHearts,
      fxBaseline: heartFxBaseline?.enemy,
    });
  }
  if (!skipPlayer) {
    renderHearts(els.playerHearts, state.player.hearts ?? 0, state.player.maxHearts ?? 0, "player", {
      silent: silentHearts,
      fxBaseline: heartFxBaseline?.player,
    });
  }

  renderFieldLabel();
  if (els.phaseBadge) els.phaseBadge.textContent = state.phase === "attack" ? "玩家攻擊階段" : "玩家防禦階段";

  if (els.npcPanel) els.npcPanel.hidden = false;
  const phaseText = state.phase === "attack" ? "玩家攻擊階段" : "玩家防禦階段";
  applyMissCloudy("battle", getMissCloudyEntry("battle", "report"), {
    field: state.field.name,
    fieldRule: fieldBonusText(state.field),
    phase: phaseText,
  });
  syncCardsDeckVisibility();
}

function renderFighters() {
  if (els.playerFighter) els.playerFighter.classList.remove("dead", "fighter--hit-shake");
  if (els.enemyFighter) els.enemyFighter.classList.remove("dead", "fighter--hit-shake");
  if (els.playerSprite) {
    els.playerSprite.classList.remove("sprite--death-animate", "sprite--death-finished");
    els.playerSprite.classList.add("sprite--character-art");
    if (session.playerChar?.id) {
      els.playerSprite.style.backgroundImage = `url("${asset(charPortraitPath(session.playerChar.id))}")`;
    } else {
      els.playerSprite.style.backgroundImage = "";
    }
  }
  if (els.enemySprite) {
    els.enemySprite.classList.remove("sprite--death-animate", "sprite--death-finished");
    els.enemySprite.classList.add("sprite--character-art");
    if (session.opponent?.id) {
      els.enemySprite.style.backgroundImage = `url("${asset(charPortraitPath(session.opponent.id))}")`;
    } else {
      els.enemySprite.style.backgroundImage = "";
    }
  }
  if (els.playerFighterLabel) els.playerFighterLabel.textContent = session.playerChar?.name || "PLAYER";
  if (els.enemyFighterLabel) els.enemyFighterLabel.textContent = session.opponent?.name || "ENEMY";
}

function ensureDefenderBattleFxEls() {
  if (!els.stageBand) return;
  if (!els.enemyDefFxWrap) {
    const wrap = document.createElement("div");
    wrap.className = "defender-battle-fx defender-battle-fx--enemy";
    wrap.hidden = true;
    const canvas = document.createElement("canvas");
    canvas.className = "defender-battle-fx-canvas";
    canvas.width = 256;
    canvas.height = 256;
    canvas.hidden = true;
    const text = document.createElement("div");
    text.className = "defender-battle-fx-text";
    text.textContent = "";
    text.hidden = true;
    wrap.appendChild(canvas);
    wrap.appendChild(text);
    els.stageBand.appendChild(wrap);
    els.enemyDefFxWrap = wrap;
    els.enemyDefFxCanvas = canvas;
    els.enemyDefFxText = text;
  }
  if (!els.playerDefFxWrap) {
    const wrap = document.createElement("div");
    wrap.className = "defender-battle-fx defender-battle-fx--player";
    wrap.hidden = true;
    const canvas = document.createElement("canvas");
    canvas.className = "defender-battle-fx-canvas";
    canvas.width = 256;
    canvas.height = 256;
    canvas.hidden = true;
    const text = document.createElement("div");
    text.className = "defender-battle-fx-text";
    text.textContent = "";
    text.hidden = true;
    wrap.appendChild(canvas);
    wrap.appendChild(text);
    els.stageBand.appendChild(wrap);
    els.playerDefFxWrap = wrap;
    els.playerDefFxCanvas = canvas;
    els.playerDefFxText = text;
  }
}

function placeDefenderBattleFx(side) {
  const fighter = side === "enemy" ? els.enemyFighter : els.playerFighter;
  const wrap = side === "enemy" ? els.enemyDefFxWrap : els.playerDefFxWrap;
  if (!fighter || !wrap || !els.stageBand) return;
  const fr = fighter.getBoundingClientRect();
  const sr = els.stageBand.getBoundingClientRect();
  const centerX = fr.left - sr.left + fr.width / 2;
  const centerY = fr.top - sr.top + fr.height * 0.58;
  wrap.style.left = `${centerX}px`;
  wrap.style.top = `${centerY}px`;
}

function showDefenderBattleFxText(side, text) {
  const textEl = side === "enemy" ? els.enemyDefFxText : els.playerDefFxText;
  const fadeKey = side === "enemy" ? "enemyFade" : "playerFade";
  const clearKey = side === "enemy" ? "enemyClear" : "playerClear";
  if (!textEl) return;
  if (battleFxTextTimers[fadeKey]) clearTimeout(battleFxTextTimers[fadeKey]);
  if (battleFxTextTimers[clearKey]) clearTimeout(battleFxTextTimers[clearKey]);
  textEl.hidden = false;
  textEl.classList.remove("defender-battle-fx-text--fade");
  textEl.textContent = text || "";
  battleFxTextTimers[fadeKey] = setTimeout(() => {
    textEl.classList.add("defender-battle-fx-text--fade");
  }, BATTLE_FX_TEXT_VISIBLE_MS);
  battleFxTextTimers[clearKey] = setTimeout(() => {
    textEl.hidden = true;
    textEl.classList.remove("defender-battle-fx-text--fade");
    textEl.textContent = "";
  }, BATTLE_FX_TEXT_VISIBLE_MS + BATTLE_FX_TEXT_FADE_MS);
}

function playDefenderBattleFx(side, kindKey, text) {
  ensureDefenderBattleFxEls();
  const wrap = side === "enemy" ? els.enemyDefFxWrap : els.playerDefFxWrap;
  const canvas = side === "enemy" ? els.enemyDefFxCanvas : els.playerDefFxCanvas;
  if (!wrap || !canvas) return;
  placeDefenderBattleFx(side);
  wrap.hidden = false;
  if (battleFxWrapHideTimers[side]) clearTimeout(battleFxWrapHideTimers[side]);
  playBattleFxCanvas(canvas, kindKey);
  showDefenderBattleFxText(side, text);
  battleFxWrapHideTimers[side] = setTimeout(() => {
    if (wrap) wrap.hidden = true;
    battleFxWrapHideTimers[side] = null;
  }, BATTLE_FX_TEXT_VISIBLE_MS + BATTLE_FX_TEXT_FADE_MS + 120);
}

function showClashNumbers(enemyVal, playerVal) {
  if (!els.clashNumbers) return;
  els.clashNumbers.hidden = false; // never hide final values
  if (els.clashEnemyVal) els.clashEnemyVal.textContent = String(Math.round(enemyVal));
  if (els.clashPlayerVal) els.clashPlayerVal.textContent = String(Math.round(playerVal));
}

async function playAttackStepMotion(isPlayerAttacking) {
  if (!els.stageBand) {
    await sleep(400);
    return;
  }
  els.stageBand.classList.remove("stage-band--clash", "stage-band--clash-player-atk", "stage-band--clash-enemy-atk");
  void els.stageBand.offsetWidth;
  els.stageBand.classList.add("stage-band--clash");
  els.stageBand.classList.add(isPlayerAttacking ? "stage-band--clash-player-atk" : "stage-band--clash-enemy-atk");
  await sleep(400);
  els.stageBand.classList.remove("stage-band--clash", "stage-band--clash-player-atk", "stage-band--clash-enemy-atk");
}

/** 比拚命中扣血：守方角色左右震動 2 下（0.2s） */
function playDefenderHitShake(side) {
  const fighter = side === "enemy" ? els.enemyFighter : els.playerFighter;
  if (!fighter) return;
  fighter.classList.remove("fighter--hit-shake");
  void fighter.offsetWidth;
  fighter.classList.add("fighter--hit-shake");
  window.setTimeout(() => fighter.classList.remove("fighter--hit-shake"), 200);
}

/** 陣亡：brightness 1→1.5（0.2s）→ brightness 0.1 + opacity 0（0.5s） */
const FIGHTER_DEATH_FX_MS = 700;

async function playDeathFade(side) {
  const fighter = side === "player" ? els.playerFighter : els.enemyFighter;
  const sprite = side === "player" ? els.playerSprite : els.enemySprite;
  if (!fighter || !sprite) return;
  fighter.classList.add("dead");
  sprite.classList.remove("sprite--death-animate", "sprite--death-finished");
  void sprite.offsetWidth;
  window.PocketPawnsAudio?.playDead?.();
  sprite.classList.add("sprite--death-animate");
  await sleep(FIGHTER_DEATH_FX_MS);
  sprite.classList.remove("sprite--death-animate");
  sprite.classList.add("sprite--death-finished");
}

/** 對話氣泡為 body 下 fixed，依角色位置同步；SPEECH_BUBBLE_RAISE_PX 為相對錨點再往上偏移（數值愈大愈高） */
const SPEECH_BUBBLE_RAISE_PX = 10;

function syncSpeechBubblePositions() {
  const place = (bubble, fighter) => {
    if (!bubble || bubble.hidden || !fighter) return;
    const rect = fighter.getBoundingClientRect();
    const h = bubble.offsetHeight || 1;
    const left = rect.left + rect.width / 2;
    const top = rect.top + 54 - h - SPEECH_BUBBLE_RAISE_PX;
    bubble.style.left = `${left}px`;
    bubble.style.top = `${Math.max(8, top)}px`;
    bubble.style.transform = "translateX(-50%)";
  };
  place(els.playerSpeechBubble, els.playerFighter);
  place(els.enemySpeechBubble, els.enemyFighter);
}

let speechBubbleResizeRegistered = false;
function setupSpeechBubbleResizeSync() {
  if (speechBubbleResizeRegistered) return;
  speechBubbleResizeRegistered = true;
  window.addEventListener("resize", syncSpeechBubblePositions);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", syncSpeechBubblePositions);
}

function showSpeechBubble(side, text, options = {}) {
  const isPlayer = side === "player";
  const bubble = isPlayer ? els.playerSpeechBubble : els.enemySpeechBubble;
  const textEl = isPlayer ? els.playerSpeechText : els.enemySpeechText;
  const fadeKey = isPlayer ? "playerFade" : "enemyFade";
  const hideKey = isPlayer ? "playerHide" : "enemyHide";
  const extraMs = Math.max(0, Number(options.extraMs || 0));
  if (!bubble || !textEl) return;

  if (bubbleTimers[fadeKey]) clearTimeout(bubbleTimers[fadeKey]);
  if (bubbleTimers[hideKey]) clearTimeout(bubbleTimers[hideKey]);

  if (!text) {
    bubble.classList.remove("speech-bubble--fade");
    bubble.hidden = true;
    textEl.textContent = "";
    bubble.style.left = "";
    bubble.style.top = "";
    bubble.style.transform = "";
    return;
  }

  textEl.textContent = text;
  bubble.hidden = false;
  bubble.classList.remove("speech-bubble--fade");
  requestAnimationFrame(() => {
    requestAnimationFrame(syncSpeechBubblePositions);
  });
  bubbleTimers[fadeKey] = setTimeout(() => {
    bubble.classList.add("speech-bubble--fade");
  }, 2000 + extraMs);
  bubbleTimers[hideKey] = setTimeout(() => {
    bubble.hidden = true;
    bubble.classList.remove("speech-bubble--fade");
    bubble.style.left = "";
    bubble.style.top = "";
    bubble.style.transform = "";
  }, 2500 + extraMs);
}

function setNpcSpeech(kind) {
  if (!session.playerChar || !session.opponent) return;
  const dlg = getDialogueForCharacter(session.playerChar.id);
  const enemyDlg = getDialogueForCharacter(session.opponent.id);
  if (kind === "open") {
    showSpeechBubble("player", dlg.battleOpen);
    showSpeechBubble("enemy", enemyDlg.battleOpen);
    return;
  }
  if (kind === "victory") {
    // 我方擊敗當前對手：玩家角色播 victory，對手角色播 defeat
    showSpeechBubble("player", dlg.victory);
    showSpeechBubble("enemy", enemyDlg.defeat);
    return;
  }
  if (kind === "defeat") {
    // 我方敗北：玩家角色播 defeat，對手角色播 victory
    showSpeechBubble("player", dlg.defeat);
    showSpeechBubble("enemy", enemyDlg.victory);
  }
}

function statValueFromCharacter(charObj, stat) {
  const i = STATS.indexOf(stat);
  return safeNumber(charObj?.initial?.stats?.[i] ?? charObj?.stats?.[i] ?? 0);
}


/** 敵方本回合比拚用的屬性池：玩家攻擊時敵為守方（AGI/VIT/LUK）；玩家防禦時敵為攻方（STR/INT/DEX）。 */
function enemyStatPoolForClash(isPlayerAttacking) {
  return isPlayerAttacking ? ["AGI", "VIT", "LUK"] : ["STR", "INT", "DEX"];
}

/** 從池中取場景加成後最高值，並記錄實際用哪一項（供敵方特殊卡命中判定）。 */
function bestEnemyCombatValue(enemy, statPool, zeroStat = null) {
  let value = 0;
  let primaryStat = statPool[0];
  for (const s of statPool) {
    const wasZeroed = zeroStat === s;
    const raw = wasZeroed ? 0 : statValueFromCharacter(enemy, s);
    const v = effectiveFieldStatValue(raw, s, wasZeroed);
    if (v > value) {
      value = v;
      primaryStat = s;
    }
  }
  return { value, primaryStat };
}

function makeHandForPhase(phase) {
  const pool = phase === "attack" ? ["STR", "INT", "DEX"] : ["AGI", "VIT", "LUK"];
  const candidates = pool.flatMap((stat) => [
    { stat, side: "P" },
    { stat, side: "E" },
  ]);
  const picked = [];
  const bag = candidates.slice();
  while (picked.length < 3 && bag.length) {
    const i = Math.floor(Math.random() * bag.length);
    picked.push(bag.splice(i, 1)[0]);
  }
  return picked;
}

function specialPoolForPlayerPhase(phase) {
  return phase === "attack" ? ["STR", "INT", "DEX"] : ["AGI", "VIT", "LUK"];
}

function specialPoolForEnemyPhase(phase) {
  // If player is attacking, enemy is defending (and vice versa).
  return phase === "attack" ? ["AGI", "VIT", "LUK"] : ["STR", "INT", "DEX"];
}

function makeSpecial(phase, handStats = []) {
  const kind = rand(SPECIALS);
  let targetStat = null;
  if (kind === "boost") {
    const pool = handStats.length ? handStats.map((x) => x.stat || x) : specialPoolForPlayerPhase(phase);
    targetStat = rand(pool);
  }
  if (kind === "zero") {
    const enemyPool = specialPoolForEnemyPhase(phase);
    targetStat = rand(enemyPool);
  }
  return { kind, targetStat };
}

function makeEnemySpecial(phase) {
  const kind = rand(SPECIALS);
  let targetStat = null;
  if (kind === "boost") targetStat = rand(specialPoolForEnemyPhase(phase));
  if (kind === "zero") targetStat = rand(specialPoolForPlayerPhase(phase));
  return { kind, targetStat };
}

function valueCardPath(card) {
  const stat = card.stat;
  const side = card.side;
  const phasePrefix = state.phase === "attack" ? "a" : "d";
  return `assets/card/${phasePrefix}_${stat}_${side}.png`.toLowerCase();
}

function specialCardPath(kind) {
  return `assets/card/${SPECIAL_CARD_FILE[kind] || `${kind}.png`}`;
}

function fieldBackgroundPath(fieldId) {
  return `assets/fields/${fieldId}.png`;
}

function applyBattleFieldBackground() {
  if (!els.gameRoot) return;
  if (!state.field?.id) {
    els.gameRoot.style.backgroundImage = "";
    els.gameRoot.style.backgroundSize = "";
    els.gameRoot.style.backgroundPosition = "";
    els.gameRoot.style.backgroundRepeat = "";
    return;
  }
  const bg = asset(fieldBackgroundPath(state.field.id));
  /* 僅平鋪場景圖；勿再疊 linear-gradient，否則會比原圖偏暗、像半透明罩一層 */
  els.gameRoot.style.backgroundImage = `url("${bg}")`;
  els.gameRoot.style.backgroundSize = "cover";
  els.gameRoot.style.backgroundPosition = "center";
  els.gameRoot.style.backgroundRepeat = "no-repeat";
}

function renderSelectCards() {
  const list = window.POCKET_PAWNS_CHARACTERS || [];
  const regularList = list.filter((x) => !isRandomCharacter(x));
  const sorted = sortStat
    ? regularList.slice().sort((a, b) => {
        const i = STATS.indexOf(sortStat);
        return (b.initial.stats[i] || 0) - (a.initial.stats[i] || 0);
      })
    : regularList.slice().sort((a, b) => a.sortIndex - b.sortIndex);
  sorted.unshift(RANDOM_CHARACTER_ENTRY);

  els.characterStrip.innerHTML = "";
  const pageSize = 10;
  for (let start = 0; start < sorted.length; start += pageSize) {
    const page = document.createElement("div");
    page.className = "character-page";
    const slice = sorted.slice(start, start + pageSize);
    slice.forEach((ch) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "character-card-mini";
      btn.innerHTML = `<div class="character-card-stack">
        <div class="character-card-layer character-card-layer--bg" aria-hidden="true"></div>
        <div class="character-card-thumb" aria-hidden="true"></div>
        <div class="character-card-layer character-card-layer--fg" aria-hidden="true"></div>
        <span class="character-card-name"></span>
      </div>`;
      btn.querySelector(".character-card-name").textContent = ch.name;
      btn.querySelector(".character-card-layer--bg").style.backgroundImage = `url("${asset("assets/img_list_ui_bg.png")}")`;
      btn.querySelector(".character-card-layer--fg").style.backgroundImage = `url("${asset("assets/img_list_ui.png")}")`;
      btn.querySelector(".character-card-thumb").style.backgroundImage = `url("${asset(charThumbPath(ch.id))}")`;
      btn.addEventListener("click", () => {
        window.PocketPawnsAudio?.playBtn?.();
        openDetail(ch);
      });
      page.appendChild(btn);
    });
    const missing = pageSize - slice.length;
    for (let i = 0; i < missing; i += 1) {
      const holder = document.createElement("div");
      holder.className = "character-card-mini character-card-mini--placeholder";
      holder.setAttribute("aria-hidden", "true");
      page.appendChild(holder);
    }
    els.characterStrip.appendChild(page);
  }
}

function renderSpecialColumn() {
  if (!els.specialColumn) return;
  const kind = state.special;
  const meta = SPECIAL_META[kind] || { name: kind, desc: "" };
  const dynamicDesc =
    kind === "boost" && state.specialStat
      ? `本回合 ${state.specialStat} x2`
      : kind === "zero" && state.specialStat
        ? `本回合敵方在比拚中 ${state.specialStat} 素質 x0`
        : meta.desc;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `card card-special-mini${state.specialOn ? " selected" : ""}`;
  btn.style.backgroundImage = `url("${asset(specialCardPath(kind))}")`;
  const specialLabel =
    kind === "zero" && state.specialStat ? zeroSpecialCardTitle(state.specialStat) : meta.name;
  btn.setAttribute("aria-label", `${specialLabel}：${dynamicDesc}`);
  btn.innerHTML = "";
  if (kind === "boost") {
    const note = document.createElement("span");
    note.className = "card-note";
    const direct = state.specialStat || "";
    note.textContent = direct ? `${direct} x2` : "x2";
    btn.appendChild(note);
  }
  if (kind === "zero") {
    const note = document.createElement("span");
    note.className = "card-note";
    note.textContent = state.specialStat ? zeroSpecialCardTitle(state.specialStat) : "歸零";
    btn.appendChild(note);
  }
  btn.title = getSpecialCardTooltip(kind, state.specialStat);
  attachCardTooltip(btn, () => getSpecialCardTooltip(kind, state.specialStat));
  btn.addEventListener("click", () => {
    if (btn.dataset.longPressShown === "1") {
      btn.dataset.longPressShown = "0";
      return;
    }
    window.PocketPawnsAudio?.playCard?.();
    state.specialOn = !state.specialOn;
    renderSpecialColumn();
  });
  els.specialColumn.innerHTML = "";
  els.specialColumn.appendChild(btn);
}

function renderValueCards() {
  if (!els.valueCards) return;
  els.valueCards.innerHTML = "";
  state.hand.forEach((card) => {
    const stat = card.stat;
    if (!STATS_SET.has(stat)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card";
    btn.style.backgroundImage = `url("${asset(valueCardPath(card))}")`;
    btn.setAttribute("aria-label", `${stat} ${card.side}`);
    btn.title = getValueCardTooltip(card);
    attachCardTooltip(btn, () => getValueCardTooltip(card));
    btn.innerHTML = "";
    btn.addEventListener("click", () => {
      if (btn.dataset.longPressShown === "1") {
        btn.dataset.longPressShown = "0";
        return;
      }
      window.PocketPawnsAudio?.playCard?.();
      void playRound(card);
    });
    els.valueCards.appendChild(btn);
  });
}

function applyPlayerSpecialEffect(ctx) {
  const res = {
    playerFinal: Math.round(ctx.playerFinal),
    enemyFinal: Math.round(ctx.enemyFinal),
    selfDamage: 0,
    enemyDamage: 0,
    bonusDamage: 0,
    attackFxBoost: 1,
    note: "",
  };
  if (!state.specialOn) return res;

  switch (state.special) {
    case "boost":
      if (ctx.stat === state.specialStat) {
        res.playerFinal = Math.round(res.playerFinal * 2);
        res.note = `加成卡啟動：${state.specialStat} x2`;
      } else {
        res.note = `加成卡未命中：本回合為 ${ctx.stat}，非 ${state.specialStat}`;
      }
      break;
    case "zero":
      if (state.specialStat) {
        res.note = `歸零卡啟動：敵方 ${state.specialStat} 素質已於比拚中 x0`;
      }
      break;
    case "heal":
      state.player.hearts = Math.min(state.player.maxHearts || 0, (state.player.hearts || 0) + 1);
      res.note = "治癒卡啟動：玩家回復 1 點 HP";
      break;
    case "redheart":
      res.selfDamage = 1;
      res.enemyDamage = 1;
      res.bonusDamage = 2;
      res.note = "紅心卡啟動：雙方先各失去 1 點 HP，攻擊命中再追加 2 點";
      break;
    case "seven77":
      res.playerFinal = Math.round(res.playerFinal + 777);
      res.attackFxBoost = 1.8;
      session.any77Used = true;
      res.note = "777 卡啟動：玩家本回合最終值 +777";
      break;
    case "phloss":
      res.selfDamage = 1;
      res.note = "HP Loss 啟動：玩家失去 1 點 HP";
      break;
    case "showy":
      emitBattleFx("showy", {
        stat: ctx.stat,
        phase: state.phase,
      });
      res.note = "Showy 啟動：播放特效（不影響數值）";
      break;
    default:
      break;
  }
  return res;
}

function applyEnemySpecialEffect(ctx) {
  const res = {
    playerFinal: Math.round(ctx.playerFinal),
    enemyFinal: Math.round(ctx.enemyFinal),
    selfDamage: 0,
    enemyDamage: 0,
    note: "",
  };
  if (!state.enemySpecialOn) return res;

  /** 敵方數值來自攻防池時，加成須對「敵方實際用上的屬性」判定，而非玩家出牌屬性。 */
  const enemyStatForEnemySpecial = ctx.enemyCombatStat ?? ctx.stat;

  switch (state.enemySpecial) {
    case "boost":
      if (enemyStatForEnemySpecial === state.enemySpecialStat) {
        res.enemyFinal = Math.round(res.enemyFinal * 2);
        res.note = `敵方加成：${state.enemySpecialStat} x2`;
      }
      break;
    case "zero":
      if (ctx.stat === state.enemySpecialStat) {
        res.playerFinal = 0;
        res.note = `敵方歸零：玩家 ${state.enemySpecialStat} 素質 x0`;
      }
      break;
    case "heal":
      state.enemy.hearts = Math.min(state.enemy.maxHearts || 0, (state.enemy.hearts || 0) + 1);
      res.note = "敵方治癒：敵方回復 1 點 HP";
      break;
    case "redheart":
      res.selfDamage = 1; // enemy self
      res.enemyDamage = 1; // player
      res.note = "敵方紅心：雙方各失去 1 點 HP";
      break;
    case "seven77":
      res.enemyFinal = Math.round(res.enemyFinal + 777);
      res.note = "敵方777：敵方最終值 +777";
      break;
    case "phloss":
      state.enemy.hearts = Math.max(0, (state.enemy.hearts || 0) - 1);
      res.note = "敵方HP Loss：敵方失去 1 點 HP";
      break;
    case "showy":
      emitBattleFx("showy", { stat: ctx.stat, phase: state.phase, side: "enemy" });
      res.note = "敵方Showy：播放特效";
      break;
    default:
      break;
  }
  return res;
}

async function playRound(card) {
  if (state.over) return;
  if (state.resolving) return;
  if (!state.player || !state.enemy) return;
  state.resolving = true;
  syncCardsDeckVisibility();
  const stat = card.stat;
  const side = card.side;
  const playerHeartsBefore = state.player.hearts || 0;
  const enemyHeartsBefore = state.enemy.hearts || 0;
  const roundHeartFxBaseline = {
    player: { hearts: playerHeartsBefore, max: state.player.maxHearts ?? 0 },
    enemy: { hearts: enemyHeartsBefore, max: state.enemy.maxHearts ?? 0 },
  };
  const usedSpecialThisRound = !!state.specialOn;
  const usedSpecialKind = state.specialOn ? state.special : null;
  const usedEnemySpecialThisRound = !!state.enemySpecialOn;
  const usedEnemySpecialKind = state.enemySpecialOn ? state.enemySpecial : null;
  if (usedSpecialThisRound)
    showSpeechBubble("player", `${specialCardDisplayName(usedSpecialKind, state.specialStat)}`, { extraMs: 2000 });
  else showSpeechBubble("player", "");
  if (usedEnemySpecialThisRound)
    showSpeechBubble("enemy", `${specialCardDisplayName(usedEnemySpecialKind, state.enemySpecialStat)}`, { extraMs: 2000 });
  else showSpeechBubble("enemy", "");
  if (usedSpecialThisRound) {
    session.match.usedSpecial = true;
    if (usedSpecialKind === "showy") session.match.showyUses += 1;
  }

  // Resolve one round with a single stat card.
  const isPlayerAttacking = state.phase === "attack";
  const basePlayerOwn = statValueFromCharacter(state.player, stat);
  const baseEnemySameStat = statValueFromCharacter(state.enemy, stat);
  const enemyBuffedSameStat = effectiveFieldStatValue(baseEnemySameStat, stat, false);
  const playerSourceBase = side === "E" ? enemyBuffedSameStat : basePlayerOwn;

  let playerFinal = side === "E" ? playerSourceBase : effectiveFieldStatValue(basePlayerOwn, stat, false);
  const enemyPool = enemyStatPoolForClash(isPlayerAttacking);
  const playerZeroStat =
    state.specialOn && state.special === "zero" && state.specialStat && enemyPool.includes(state.specialStat)
      ? state.specialStat
      : null;
  const enemyCombat = bestEnemyCombatValue(state.enemy, enemyPool, playerZeroStat);
  let enemyFinal = enemyCombat.value;
  const enemyCombatStat = enemyCombat.primaryStat;

  const specialRes = applyPlayerSpecialEffect({
    isPlayerAttacking,
    stat,
    side,
    playerFinal,
    enemyFinal,
  });
  playerFinal = specialRes.playerFinal;
  enemyFinal = specialRes.enemyFinal;
  if (specialRes.selfDamage) state.player.hearts = Math.max(0, (state.player.hearts || 0) - specialRes.selfDamage);
  if (specialRes.enemyDamage) state.enemy.hearts = Math.max(0, (state.enemy.hearts || 0) - specialRes.enemyDamage);

  const enemySpecialRes = applyEnemySpecialEffect({
    isPlayerAttacking,
    stat,
    enemyCombatStat,
    playerFinal,
    enemyFinal,
  });
  playerFinal = enemySpecialRes.playerFinal;
  enemyFinal = enemySpecialRes.enemyFinal;
  if (enemySpecialRes.selfDamage) state.enemy.hearts = Math.max(0, (state.enemy.hearts || 0) - enemySpecialRes.selfDamage);
  if (enemySpecialRes.enemyDamage) state.player.hearts = Math.max(0, (state.player.hearts || 0) - enemySpecialRes.enemyDamage);
  refreshBattleUI({ silentHearts: true });

  // Attack windup: step forward and back in 1 second.
  await playAttackStepMotion(isPlayerAttacking);

  const attackerHas777ThisRound =
    (isPlayerAttacking && usedSpecialThisRound && usedSpecialKind === "seven77") ||
    (!isPlayerAttacking && usedEnemySpecialThisRound && usedEnemySpecialKind === "seven77");

  // Show clash numbers.
  showClashNumbers(enemyFinal, playerFinal);

  const attackerUsed777 =
    (isPlayerAttacking && usedSpecialThisRound && usedSpecialKind === "seven77") ||
    (!isPlayerAttacking && usedEnemySpecialThisRound && usedEnemySpecialKind === "seven77");
  if (attackerUsed777) emitBattleFx("seven77Shake", { isPlayerAttacking });

  session.lastRoundClash = {
    enemyFinal: Math.round(enemyFinal),
    playerFinal: Math.round(playerFinal),
    enemySpecialOn: usedEnemySpecialThisRound,
    enemySpecialKind: state.enemySpecial,
    enemySpecialStat: state.enemySpecialStat,
    /** 敵方本回合比拚實際採用的屬性（攻方 STR/INT/DEX 或守方 AGI/VIT/LUK 中最高者） */
    enemyCombatStat,
  };

  // Hit decision:
  // - Attack phase: player attacks enemy.
  // - Defense phase: enemy attacks player.
  // Damage only happens when attack value is strictly greater than defense value.
  // 玩家特殊卡資訊已由 tooltip + 角色氣泡承擔；朵雲公主不再重複播報玩家特殊卡
  let roundNote = [enemySpecialRes.note].filter(Boolean).join("｜");
  /** 須在 refreshBattleUI 之後再播，否則 renderFighters 會立刻清掉 fighter--hit-shake */
  let defenderHitShakeSide = null;
  let defenderBattleFxPlan = null;
  const attackerStatForResult = isPlayerAttacking ? stat : enemyCombatStat;
  const defenderStatForResult = isPlayerAttacking ? enemyCombatStat : stat;
  if (isPlayerAttacking) {
    if (playerFinal > enemyFinal) {
      const damage = 1 + (specialRes.bonusDamage || 0);
      state.enemy.hearts = Math.max(0, (state.enemy.hearts || 0) - damage);
      defenderHitShakeSide = "enemy";
      const key = String(attackerStatForResult || "").toLowerCase();
      if (BATTLE_FX_META[key]) defenderBattleFxPlan = { side: "enemy", key };
      emitBattleFx("attack", {
        stat,
        phase: state.phase,
        attacker: "player",
        target: "enemy",
        special: state.specialOn ? state.special : null,
        intensity: specialRes.attackFxBoost || 1,
        playerFinal: Math.round(playerFinal),
      });
      roundNote = roundNote || `命中成功：敵方失去 ${damage} 點 HP`;
      if (usedSpecialKind === "seven77" && state.enemy.hearts <= 0) session.match.used777Kill = true;
      if (usedSpecialKind === "redheart" && state.enemy.hearts <= 0 && playerHeartsBefore === 1) {
        session.match.redheartAttackWin = true;
      }
      if (stat === "LUK" && isFieldBoostActive("LUK") && state.enemy.hearts <= 0) session.match.lukBoostWin = true;
    } else if (!roundNote) {
      roundNote = "攻擊被擋下，未造成傷害";
    }
    const key = String(defenderStatForResult || "").toLowerCase();
    if (playerFinal <= enemyFinal && BATTLE_FX_META[key]) defenderBattleFxPlan = { side: "enemy", key };
  } else if (enemyFinal > playerFinal) {
    state.player.hearts = Math.max(0, (state.player.hearts || 0) - 1);
    defenderHitShakeSide = "player";
    const key = String(attackerStatForResult || "").toLowerCase();
    if (BATTLE_FX_META[key]) defenderBattleFxPlan = { side: "player", key };
    if (!roundNote) roundNote = "防禦失敗：玩家失去 1 點 HP";
  } else if (!roundNote) {
    roundNote = "防禦成功，未受到傷害";
  }
  const defenseWinKey = String(defenderStatForResult || "").toLowerCase();
  if (!isPlayerAttacking && playerFinal >= enemyFinal && BATTLE_FX_META[defenseWinKey]) {
    defenderBattleFxPlan = { side: "player", key: defenseWinKey };
  }

  state.player = clone(state.player);
  state.enemy = clone(state.enemy);
  const playerDamageThisRound = Math.max(0, playerHeartsBefore - (state.player.hearts || 0));
  const enemyDamageThisRound = Math.max(0, enemyHeartsBefore - (state.enemy.hearts || 0));
  session.kills += enemyDamageThisRound;
  if (playerDamageThisRound === 0) {
    session.match.noDamageStreak += 1;
    session.match.maxNoDamageStreak = Math.max(session.match.maxNoDamageStreak, session.match.noDamageStreak);
  } else {
    session.match.noDamageStreak = 0;
  }
  if ((state.player.hearts || 0) === 1) {
    session.match.oneHpStreak += 1;
    session.match.maxOneHpStreak = Math.max(session.match.maxOneHpStreak, session.match.oneHpStreak);
  } else {
    session.match.oneHpStreak = 0;
  }
  refreshBattleUI({ heartFxBaseline: roundHeartFxBaseline });
  if (defenderBattleFxPlan) {
    const meta = BATTLE_FX_META[defenderBattleFxPlan.key];
    const shouldPlay777AttackSfx =
      attackerHas777ThisRound && ["str", "int", "dex"].includes(String(defenderBattleFxPlan.key || "").toLowerCase());
    if (shouldPlay777AttackSfx) window.PocketPawnsAudio?.playAttack777?.();
    else window.PocketPawnsAudio?.playBattleFxByKey?.(defenderBattleFxPlan.key);
    if (meta) playDefenderBattleFx(defenderBattleFxPlan.side, defenderBattleFxPlan.key, meta.text);
  }
  if (defenderHitShakeSide) {
    requestAnimationFrame(() => playDefenderHitShake(defenderHitShakeSide));
  }
  if (els.npcMessage && roundNote) els.npcMessage.textContent = roundNote;

  if ((state.enemy.hearts || 0) <= 0) {
    await playDeathFade("enemy");
    setNpcSpeech("victory");
    session.wins += 1;
    session.maxCombo = Math.max(session.maxCombo || 0, session.wins || 0);
    const next = pickAndConsumeNextOpponent();
    if (next) {
      applyMissCloudy("battle", getMissCloudyEntry("battle", "victory"));
      await sleep(2000);
      await runCurtainTransition(async () => {
        setupRoundForCurrentOpponent();
      }, { fadeMs: 200 });
    } else {
      state.over = true;
      state.resolving = false;
      applyMissCloudy("battle", getMissCloudyEntry("battle", "victory"));
      await finishBattle("win");
    }
    return;
  }
  if ((state.player.hearts || 0) <= 0) {
    await playDeathFade("player");
    window.PocketPawnsAudio?.playLoss?.();
    setNpcSpeech("defeat");
    state.over = true;
    state.resolving = false;
    applyMissCloudy("battle", getMissCloudyEntry("battle", "defeat"));
    await sleep(2000);
    await finishBattle("lose");
    return;
  }

  // Next phase
  state.phase = state.phase === "attack" ? "defense" : "attack";
  state.hand = makeHandForPhase(state.phase);
  {
    const sp = makeSpecial(state.phase, state.hand);
    state.special = sp.kind;
    state.specialStat = sp.targetStat;
    registerPlayerSpecialDraw(sp.kind);
  }
  {
    const esp = makeEnemySpecial(state.phase);
    state.enemySpecial = esp.kind;
    state.enemySpecialStat = esp.targetStat;
    state.enemySpecialOn = Math.random() < 0.5;
  }
  state.specialOn = false;
  state.resolving = false;
  renderValueCards();
  renderSpecialColumn();
  refreshBattleUI({ skipHearts: true });
}

async function startBattle() {
  try {
    const list = window.POCKET_PAWNS_CHARACTERS || [];
    if (!selectedChar) {
      throw new Error("尚未選擇角色（selectedChar 為空）。");
    }

    const realPool = list.filter((x) => !isRandomCharacter(x));
    if (!realPool.length) {
      throw new Error("可用角色池為空。");
    }
    session.playerChar = isRandomCharacter(selectedChar) ? rand(realPool) : selectedChar;
    const opponentPool = realPool.filter((x) => x.id !== session.playerChar.id);
    if (!opponentPool.length) {
      throw new Error("對手池為空（僅剩一個角色？）。");
    }
    session.remainingOpponents = opponentPool.slice().sort(() => Math.random() - 0.5);
    session.opponent = pickAndConsumeNextOpponent();
    if (!session.opponent?.initial) throw new Error("對手資料不完整（opponent.initial 缺失）。");

    state.player = clone(session.playerChar.initial);
    ensurePlayerNotZeroHpAtBattleEntry();
    state.enemy = clone(session.opponent.initial);
    state.field = rand(FIELDS);
    state.phase = "attack";
    state.over = false;
    state.resolving = false;

    state.active = true;
    lastRenderedHeartState.player = null;
    lastRenderedHeartState.enemy = null;
    session.submitted = false;
    session.lastRoundClash = null;
    session.kills = 0;
    session.wins = 0;
    session.maxCombo = 0;
    session.seven77Draws = 0;
    session.any77Used = false;
    session.match = createMatchState();

    state.hand = makeHandForPhase(state.phase);
    {
      const sp = makeSpecial(state.phase, state.hand);
      state.special = sp.kind;
      state.specialStat = sp.targetStat;
      registerPlayerSpecialDraw(sp.kind);
    }
    {
      const esp = makeEnemySpecial(state.phase);
      state.enemySpecial = esp.kind;
      state.enemySpecialStat = esp.targetStat;
      state.enemySpecialOn = Math.random() < 0.5;
    }
    state.specialOn = false;
    session.totalPlays = readTotalPlays() + 1;
    writeTotalPlays(session.totalPlays);
    applyMissCloudy("battle", getMissCloudyEntry("battle", "report"), {
      field: state.field?.name || "",
      fieldRule: state.field ? fieldBonusText(state.field) : "—",
      phase: state.phase === "attack" ? "玩家攻擊階段" : "玩家防禦階段",
    });
    renderValueCards();
    renderSpecialColumn();
    refreshBattleUI();
    setNpcSpeech("open");
    setVisibleById("viewport");
    showCombatRoundFlash("GAME START");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // 若失敗，就把訊息顯示在角色詳情頁（避免你只看到沒反應）。
    setVisibleById("character-detail");
    if (els.characterDetailMenuDlg) {
      els.characterDetailMenuDlg.hidden = false;
      els.characterDetailMenuDlg.textContent = `進入戰鬥失敗：${msg}`;
    }
    // 留在角色詳情畫面，方便你點回去再試。
    window.alert(`進入戰鬥失敗：${msg}`);
  }
}

function openDetail(ch) {
  selectedChar = ch;
  session.detailPageMaxCombo = null;
  const randomMode = isRandomCharacter(ch);
  els.characterDetailName.textContent = randomMode ? "神祕人物" : ch.name;
  if (els.characterDetailPortrait) {
    els.characterDetailPortrait.classList.add("character-detail-portrait--art");
  }
  els.characterDetailPortrait.style.backgroundImage = `url("${asset(charPortraitPath(ch.id))}")`;
  if (randomMode) {
    if (els.characterDetailStats) {
      els.characterDetailStats.innerHTML = "";
      STATS.forEach((s) => {
        const row = document.createElement("div");
        row.className = "stat-cell";
        row.innerHTML = `<div class="stat-value">?</div><div class="stat-label">${s}</div>`;
        els.characterDetailStats.appendChild(row);
      });
    }
  } else {
    renderStats(els.characterDetailStats, ch.initial.stats);
  }
  els.characterDetailMenuDlg.hidden = false;
  const dlg = getDialogueForCharacter(ch.id);
  els.characterDetailMenuDlg.textContent = dlg.menuSelect;
  if (els.characterDetailMeta) els.characterDetailMeta.textContent = "讀取統計中...";
  if (randomMode) {
    if (els.characterDetailMeta) {
      els.characterDetailMeta.innerHTML = "使用次數：？　／　777 抽中：？<br>最高連續擊殺：？（玩家：？）";
    }
  } else {
    void loadCharacterDetailMeta(ch);
  }

  applyMissCloudy("characterDetail", getMissCloudyEntry("characterDetail"));

  setVisibleById("character-detail");
}

/** 連擊榜顯示：無名稱或佔位符時顯示「匿名」 */
function formatComboHolderDisplay(holder) {
  const s = String(holder ?? "").trim();
  if (!s || s === "—") return "匿名";
  return s;
}

async function loadCharacterDetailMeta(ch) {
  if (!els.characterDetailMeta || !ch?.id) return;
  const stats = await window.PocketPawnsSupabase?.fetchCharacterStats?.(ch.id);
  const useCount = stats?.use_count ?? 0;
  const sevenTotal = stats?.seven77_total ?? 0;
  const maxCombo = stats?.max_combo ?? 0;
  session.detailPageMaxCombo = Math.max(0, Number(maxCombo));
  const holder = formatComboHolderDisplay(stats?.combo_holder);
  els.characterDetailMeta.innerHTML = `使用次數：${useCount}　／　777 抽中：${sevenTotal}<br>最高連續擊殺：${maxCombo}（玩家：${holder}）`;
}

async function loadGlobalRecordInfo() {
  const ids = (window.POCKET_PAWNS_CHARACTERS || []).map((x) => x.id);
  if (!ids.length) return;
  const all = await window.PocketPawnsSupabase?.fetchAllCharacterStats?.(ids);
  if (!all || typeof all !== "object") return;
  let maxCombo = 0;
  let holder = "—";
  Object.values(all).forEach((row) => {
    const combo = Number(row?.max_combo || 0);
    if (combo > maxCombo) {
      maxCombo = combo;
      holder = formatComboHolderDisplay(row?.combo_holder);
    }
  });
  session.globalComboRecord = maxCombo;
  session.globalComboHolder = formatComboHolderDisplay(holder);
}

function bindEvents() {
  document.getElementById("title-btn-play").addEventListener("click", async () => {
    window.PocketPawnsAudio?.init?.();
    window.PocketPawnsAudio?.playBtn?.();
    setVisibleById("character-select");
    renderSelectCards();
    setTimeout(() => {
      applyMissCloudy("characterSelect", getMissCloudyEntry("characterSelect"));
    }, 0);
  });

  document.getElementById("title-btn-credits").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtn?.();
    setVisibleById("credits-screen");
  });
  document.getElementById("credits-btn-back").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtnBack?.();
    setVisibleById("title-screen");
  });
  document.getElementById("btn-character-back").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtnBack?.();
    setVisibleById("title-screen");
  });
  document.getElementById("character-detail-back").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtnBack?.();
    setVisibleById("character-select");
  });
  document.getElementById("character-detail-confirm").addEventListener("click", () => {
    // playBtn() 的回傳值不應影響是否進入戰鬥。
    window.PocketPawnsAudio?.playBtn?.();
    void runCurtainTransition(async () => {
      if (selectedChar && !isRandomCharacter(selectedChar)) {
        try {
          const st = await window.PocketPawnsSupabase?.fetchCharacterStats?.(selectedChar.id);
          const raw = Number(st?.max_combo ?? 0);
          session.recordBaselineFromDetail = Number.isFinite(raw) ? Math.max(0, raw) : 0;
        } catch {
          const fallback = Number(session.detailPageMaxCombo);
          session.recordBaselineFromDetail =
            Number.isFinite(fallback) && session.detailPageMaxCombo != null ? Math.max(0, fallback) : 0;
        }
      } else {
        session.recordBaselineFromDetail = 0;
      }
      await startBattle();
    }, { fadeMs: 200 });
  });

  document.querySelectorAll(".stat-sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.PocketPawnsAudio?.playBtn?.();
      const nextSort = btn.dataset.sortStat || null;
      const cancelCurrent = sortStat && sortStat === nextSort;
      sortStat = cancelCurrent ? null : nextSort;
      document.querySelectorAll(".stat-sort-btn").forEach((b) => {
        const isActive = !cancelCurrent && b === btn;
        b.classList.toggle("is-active", isActive);
      });
      renderSelectCards();
    });
  });

  // Menu overlay
  document.getElementById("btn-menu").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtn?.();
    if (els.menuOverlay) els.menuOverlay.hidden = false;
    syncCardsDeckVisibility();
  });
  document.getElementById("menu-btn-close").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtnBack?.();
    if (els.menuOverlay) els.menuOverlay.hidden = true;
    syncCardsDeckVisibility();
  });
  document.getElementById("menu-btn-quit-battle").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtn?.();
    if (els.menuOverlay) els.menuOverlay.hidden = true;
    void finishBattle("quit");
  });

  // Settlement
  document.getElementById("settlement-btn-back").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtn?.();
    void runCurtainTransition(() => {
      setVisibleById("title-screen");
    }, { fadeMs: 200 });
  });
  document.getElementById("settlement-btn-record").addEventListener("click", async () => {
    window.PocketPawnsAudio?.playBtn?.();
    const id = session.pendingRecordCharacterId;
    if (!id) return;
    const name = String(els.settlementRecordInput?.value || "").trim();
    if (name.length < 2) {
      if (els.npcMessage) els.npcMessage.textContent = "請輸入至少 2 個字元的名稱。";
      return;
    }
    await window.PocketPawnsSupabase?.submitComboRecordName?.(id, name);
    if (els.settlementRecordHint) els.settlementRecordHint.textContent = "紀錄已更新，恭喜成為新守門人！";
    if (els.settlementRecordInput) els.settlementRecordInput.value = "";
    session.pendingRecordCharacterId = "";
  });
}

async function loadDialogue() {
  try {
    if (window.__POCKET_PAWNS_DIALOGUE__ && typeof window.__POCKET_PAWNS_DIALOGUE__ === "object") {
      dialogueData = window.__POCKET_PAWNS_DIALOGUE__;
      return;
    }
    // When opening via file://, fetch() may be blocked by browser CORS rules.
    // In that case, fall back to a minimal default dialogue dataset.
    if (location.protocol === "file:") {
      dialogueData = { _default: { menuSelect: "準備出戰吧。" } };
      return;
    }
    const res = await fetch(asset("dialogueData.json"), { cache: "no-cache" });
    dialogueData = await res.json();
  } catch {
    dialogueData = { _default: { menuSelect: "準備出戰吧。" } };
  }
}

function initEls() {
  els.gameRoot = document.getElementById("game-root");
  els.viewport = document.getElementById("viewport");
  els.enemySprite = document.querySelector("#enemy-sprite .sprite");
  els.playerSprite = document.querySelector("#player-sprite .sprite");
  els.enemyFighter = document.getElementById("enemy-sprite");
  els.playerFighter = document.getElementById("player-sprite");
  els.enemyFighterLabel = document.getElementById("enemy-fighter-label");
  els.playerFighterLabel = document.getElementById("player-fighter-label");
  els.enemyStats = document.getElementById("enemy-stats");
  els.playerStats = document.getElementById("player-stats");
  els.enemyHearts = document.getElementById("enemy-hearts");
  els.playerHearts = document.getElementById("player-hearts");
  els.fieldLabel = document.getElementById("field-label");
  els.phaseBadge = document.getElementById("phase-badge");

  els.valueCards = document.getElementById("value-cards");
  els.specialColumn = document.getElementById("special-column");
  els.cardsDeck = document.getElementById("cards-deck");
  els.npcPanel = document.getElementById("npc-panel");
  els.npcFace = document.getElementById("npc-face");
  els.npcMessage = document.getElementById("npc-message");
  els.playerSpeechBubble = document.getElementById("player-speech-bubble");
  els.enemySpeechBubble = document.getElementById("enemy-speech-bubble");
  els.playerSpeechText = document.getElementById("player-speech-text");
  els.enemySpeechText = document.getElementById("enemy-speech-text");

  els.clashNumbers = document.getElementById("clash-numbers");
  els.clashEnemyVal = document.getElementById("clash-enemy-val");
  els.clashPlayerVal = document.getElementById("clash-player-val");
  els.stageBand = document.getElementById("stage-band");

  els.characterStrip = document.getElementById("character-strip");

  els.characterSelectNpcFace = document.getElementById("character-select-npc-face");
  els.characterSelectNpcMessage = document.getElementById("character-select-npc-message");

  els.characterDetailName = document.getElementById("character-detail-name");
  els.characterDetailPortrait = document.getElementById("character-detail-portrait");
  els.characterDetailStats = document.getElementById("character-detail-stats");
  els.characterDetailMeta = document.getElementById("character-detail-meta");
  els.characterDetailMenuDlg = document.getElementById("character-detail-menu-dlg");
  els.characterDetailNpcFace = document.getElementById("character-detail-npc-face");
  els.characterDetailNpcMessage = document.getElementById("character-detail-npc-message");

  els.menuOverlay = document.getElementById("menu-overlay");

  els.settlement = document.getElementById("settlement");
  els.settlementEnding = document.getElementById("settlement-ending");
  els.settlementDetails = document.getElementById("settlement-details");
  els.settlementRecord = document.getElementById("settlement-record");
  els.settlementRecordHint = document.querySelector("#settlement-record .settlement-record-hint");
  els.settlementRecordInput = document.getElementById("settlement-record-input");
  els.screenCurtain = document.getElementById("screen-curtain");
  els.combatBanner = document.getElementById("combat-banner");
}

function setupMobileTooltipCleanup() {
  if (mobileTooltipTouchCleanupRegistered) return;
  mobileTooltipTouchCleanupRegistered = true;
  document.addEventListener(
    "touchstart",
    () => {
      if (typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) hideCardHoverTip();
    },
    { passive: true }
  );
}

async function init() {
  initEls();
  syncCardsDeckVisibility();
  setupMobileTooltipCleanup();
  setupSpeechBubbleResizeSync();
  await loadGlobalRecordInfo();
  bindEvents();
  await loadDialogue();
  setVisibleById("title-screen");
}

document.addEventListener("DOMContentLoaded", init);

