"use strict";

// Minimal but stable UI/logic for Pocket Pawns.
// Intentionally avoids fancy UI logic until assets are present.

const STATS = ["STR", "INT", "DEX", "AGI", "VIT", "LUK"];
const STATS_SET = new Set(STATS);

const FIELDS = [
  { id: "fire", name: "火", boost: "STR" },
  { id: "water", name: "水", boost: "INT" },
  { id: "wood", name: "木", boost: "DEX" },
  { id: "wind", name: "風", boost: "AGI" },
  { id: "earth", name: "土", boost: "VIT" },
  { id: "metal", name: "金", boost: "LUK" },
  { id: "light", name: "光", boost: "AGI" },
  { id: "dark", name: "闇", boost: "STR" },
];

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
  heal: { name: "治癒", desc: "立即回復 1 點 HP（不超過上限）" },
  boost: { name: "加成", desc: "本回合玩家最終值 x2" },
  zero: { name: "歸零", desc: "本回合對手最終值歸零" },
  seven77: { name: "777", desc: "本回合玩家最終值改為 77" },
  redheart: { name: "紅心", desc: "本回合若命中，額外造成 1 點傷害" },
  phloss: { name: "損血", desc: "敵方立即失去 1 點 HP" },
  showy: { name: "華麗", desc: "本回合玩家最終值提升 50%" },
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
  if (type === "attack") {
    els.viewport.classList.remove("screen-shake");
    void els.viewport.offsetWidth;
    els.viewport.classList.add("screen-shake");
    setTimeout(() => els.viewport && els.viewport.classList.remove("screen-shake"), 1100);
  }
}

function asset(rel) {
  return new URL(rel, location.href).href;
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
    "battle:report": { face: 0, text: "目前場景 {field}，直接屬性 x2。{phase}，請出牌。" },
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

function formatEnemySpecialSettlement(on, kind, stat) {
  const name = specialName(kind);
  if (!on) return `未發動（本回合抽中：${name}）`;
  if (kind === "boost" && stat) return `${name}（${stat} x2）`;
  if (kind === "zero" && stat) return `${name}（${stat} x0）`;
  return name;
}

function boostValue(stat) {
  if (!state.field) return 1;
  const phase = state.phase;
  const attackStats = ["STR", "INT", "DEX"];
  const defenseStats = ["AGI", "VIT", "LUK"];
  const isAttackStat = attackStats.includes(stat);
  const isDefenseStat = defenseStats.includes(stat);

  if (state.field.id === "light") return phase === "defense" && isDefenseStat ? 2 : 1;
  if (state.field.id === "dark") return phase === "attack" && isAttackStat ? 2 : 1;
  return state.field.boost === stat ? 2 : 1;
}

function fieldBonusText(field) {
  if (!field) return "直接屬性X2";
  if (field.id === "light") return "防守三屬性X2";
  if (field.id === "dark") return "攻擊三屬性X2";
  return `${field.boost}X2`;
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

function chooseEndingKey(outcome) {
  const m = session.match || createMatchState();
  if (outcome === "win") {
    if (m.used777Kill) return "ko777";
    if (m.maxNoDamageStreak >= 7) return "nodmg7";
    if (m.showyUses >= 3) return "showy3";
    if (m.lukBoostWin) return "lukwin";
    if (m.maxOneHpStreak >= 3) return "lockhp";
    if (m.redheartAttackWin) return "redboom";
    if (!m.usedSpecial) return "nospecial";
    if ((session.wins || 0) > (session.globalComboRecord || 0)) return "record";
  }
  return "plain";
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
    ["連續擊殺數", String(session.wins || 0)],
    ["總遊玩次數", String(session.totalPlays || 0)],
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
  const brokeRecord = outcome === "win" && (session.wins || 0) > (session.globalComboRecord || 0);
  if (els.settlementRecord) els.settlementRecord.hidden = !brokeRecord;
  session.pendingRecordCharacterId = brokeRecord ? session.playerChar?.id || "" : "";
}

async function submitBattleSummary(outcome) {
  if (session.submitted || !session.playerChar?.id) return;
  session.submitted = true;
  const brokeRecord = outcome === "win" && (session.wins || 0) > (session.globalComboRecord || 0);
  await window.PocketPawnsSupabase?.submitBattleResult?.({
    characterId: session.playerChar.id,
    characterName: session.playerChar.name,
    outcome: outcome === "win" ? "win" : "lose",
    kills: session.wins || 0,
    used777: !!session.any77Used,
    seven77DrawsThisMatch: session.seven77Draws || 0,
    maxComboThisMatch: session.wins || 0,
    brokeGlobalComboRecord: brokeRecord,
    recordHolderName: null,
  });
}

async function finishBattle(outcome) {
  if (outcome === "win") {
    window.PocketPawnsAudio?.playWin?.();
  }
  setOverlaysHidden();
  renderSettlement(outcome);
  if (els.settlement) els.settlement.hidden = false;
  await submitBattleSummary(outcome);
}

function pickAndConsumeNextOpponent() {
  if (!session.remainingOpponents.length) return null;
  const next = session.remainingOpponents.shift() || null;
  session.opponent = next;
  return next;
}

function setupRoundForCurrentOpponent() {
  if (!session.opponent?.initial) return false;
  state.enemy = clone(session.opponent.initial);
  state.phase = "attack";
  state.hand = makeHandForPhase(state.phase);
  const sp = makeSpecial(state.phase, state.hand);
  state.special = sp.kind;
  state.specialStat = sp.targetStat;
  if (sp.kind === "seven77") session.seven77Draws += 1;
  const esp = makeEnemySpecial(state.phase);
  state.enemySpecial = esp.kind;
  state.enemySpecialStat = esp.targetStat;
  state.enemySpecialOn = Math.random() < 0.5;
  state.specialOn = false;
  state.resolving = false;
  state.over = false;
  renderValueCards();
  renderSpecialColumn();
  refreshBattleUI();
  setNpcSpeech("open");
  return true;
}

function setVisibleById(id) {
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
}

function setOverlaysHidden() {
  ["menu-overlay", "settlement"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
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
    const mult = boostValue(s);
    const val = Math.round(base * mult);
    const boosted = mult > 1;
    const row = document.createElement("div");
    row.className = "stat-cell";
    row.innerHTML = `<div class="stat-value${boosted ? " stat-boosted" : ""}">${val}</div><div class="stat-label">${s}</div>`;
    el.appendChild(row);
  });
}

function renderHearts(container, cur, max) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < max; i += 1) {
    const isOn = i < cur;
    const img = document.createElement("img");
    img.width = 100;
    img.height = 88;
    img.style.width = "100px";
    img.style.height = "88px";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.src = asset(`assets/${isOn ? "hp_1" : "hp_0"}.png`);
    img.onerror = () => {
      img.remove();
      const span = document.createElement("span");
      span.className = `heart${isOn ? " on" : ""}`;
      container.appendChild(span);
    };
    container.appendChild(img);
  }
}

function refreshBattleUI() {
  if (!state.player || !state.enemy || !state.field) return;
  applyBattleFieldBackground();
  renderFighters();
  renderStats(els.enemyStats, state.enemy.stats || state.enemy.initial?.stats || []);
  renderStats(els.playerStats, state.player.stats || state.player.initial?.stats || []);

  renderHearts(els.enemyHearts, state.enemy.hearts ?? 0, state.enemy.maxHearts ?? 0);
  renderHearts(els.playerHearts, state.player.hearts ?? 0, state.player.maxHearts ?? 0);

  if (els.fieldLabel) els.fieldLabel.textContent = `場景：${state.field.name}（${fieldBonusText(state.field)}）`;
  if (els.phaseBadge) els.phaseBadge.textContent = state.phase === "attack" ? "玩家攻擊階段" : "玩家防禦階段";

  if (els.npcPanel) els.npcPanel.hidden = false;
  const phaseText = state.phase === "attack" ? "玩家攻擊階段" : "玩家防禦階段";
  applyMissCloudy("battle", getMissCloudyEntry("battle", "report"), {
    field: state.field.name,
    phase: phaseText,
  });
}

function renderFighters() {
  if (els.playerFighter) els.playerFighter.classList.remove("dead", "fighter--death-fade");
  if (els.enemyFighter) els.enemyFighter.classList.remove("dead", "fighter--death-fade");
  if (els.playerSprite) {
    els.playerSprite.classList.add("sprite--character-art");
    if (session.playerChar?.id) {
      els.playerSprite.style.backgroundImage = `url("${asset(charPortraitPath(session.playerChar.id))}")`;
    }
  }
  if (els.enemySprite) {
    els.enemySprite.classList.add("sprite--character-art");
    if (session.opponent?.id) {
      els.enemySprite.style.backgroundImage = `url("${asset(charPortraitPath(session.opponent.id))}")`;
    }
  }
  if (els.playerFighterLabel) els.playerFighterLabel.textContent = session.playerChar?.name || "PLAYER";
  if (els.enemyFighterLabel) els.enemyFighterLabel.textContent = session.opponent?.name || "ENEMY";
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

async function playDeathFade(side) {
  const fighter = side === "player" ? els.playerFighter : els.enemyFighter;
  if (!fighter) return;
  fighter.classList.remove("fighter--death-fade");
  fighter.classList.add("dead");
  void fighter.offsetWidth;
  fighter.classList.add("fighter--death-fade");
  await sleep(450);
}

function showSpeechBubble(side, text) {
  const isPlayer = side === "player";
  const bubble = isPlayer ? els.playerSpeechBubble : els.enemySpeechBubble;
  const textEl = isPlayer ? els.playerSpeechText : els.enemySpeechText;
  const fadeKey = isPlayer ? "playerFade" : "enemyFade";
  const hideKey = isPlayer ? "playerHide" : "enemyHide";
  if (!bubble || !textEl) return;

  if (bubbleTimers[fadeKey]) clearTimeout(bubbleTimers[fadeKey]);
  if (bubbleTimers[hideKey]) clearTimeout(bubbleTimers[hideKey]);

  if (!text) {
    bubble.classList.remove("speech-bubble--fade");
    bubble.hidden = true;
    textEl.textContent = "";
    return;
  }

  textEl.textContent = text;
  bubble.hidden = false;
  bubble.classList.remove("speech-bubble--fade");
  bubbleTimers[fadeKey] = setTimeout(() => {
    bubble.classList.add("speech-bubble--fade");
  }, 2000);
  bubbleTimers[hideKey] = setTimeout(() => {
    bubble.hidden = true;
    bubble.classList.remove("speech-bubble--fade");
  }, 2500);
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

function boostMultiplier(stat) {
  return boostValue(stat);
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
  els.gameRoot.style.backgroundImage = `linear-gradient(rgba(8, 4, 24, 0.32), rgba(8, 4, 24, 0.48)), url("${bg}")`;
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
        ? `本回合敵方 ${state.specialStat} x0`
        : meta.desc;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `card card-special-mini${state.specialOn ? " selected" : ""}`;
  btn.style.backgroundImage = `url("${asset(specialCardPath(kind))}")`;
  btn.setAttribute("aria-label", `${meta.name}：${dynamicDesc}`);
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
    const direct = state.specialStat || "";
    note.textContent = direct ? `${direct} x0` : "x0";
    btn.appendChild(note);
  }
  btn.title = `${meta.name}：${dynamicDesc}`;
  btn.addEventListener("click", () => {
    window.PocketPawnsAudio?.playCard?.();
    state.specialOn = !state.specialOn;
    if (els.npcMessage) {
      els.npcMessage.textContent = state.specialOn ? `${meta.name}` : "";
    }
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
    btn.innerHTML = "";
    btn.addEventListener("click", () => {
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
      if (ctx.stat === state.specialStat) {
        res.enemyFinal = 0;
        res.note = `歸零卡啟動：敵方 ${state.specialStat} x0`;
      } else {
        res.note = `歸零卡未命中：本回合為 ${ctx.stat}，非 ${state.specialStat}`;
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
      state.player.hearts = Math.max(0, (state.player.hearts || 0) - 1);
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

  switch (state.enemySpecial) {
    case "boost":
      if (ctx.stat === state.enemySpecialStat) {
        res.enemyFinal = Math.round(res.enemyFinal * 2);
        res.note = `敵方加成：${state.enemySpecialStat} x2`;
      }
      break;
    case "zero":
      if (ctx.stat === state.enemySpecialStat) {
        res.playerFinal = 0;
        res.note = `敵方歸零：玩家 ${state.enemySpecialStat} x0`;
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
  const stat = card.stat;
  const side = card.side;
  const playerHeartsBefore = state.player.hearts || 0;
  const enemyHeartsBefore = state.enemy.hearts || 0;
  const usedSpecialThisRound = !!state.specialOn;
  const usedSpecialKind = state.specialOn ? state.special : null;
  const usedEnemySpecialThisRound = !!state.enemySpecialOn;
  const usedEnemySpecialKind = state.enemySpecialOn ? state.enemySpecial : null;
  if (usedSpecialThisRound) showSpeechBubble("player", `${specialName(usedSpecialKind)}`);
  else showSpeechBubble("player", "");
  if (usedEnemySpecialThisRound) showSpeechBubble("enemy", `${specialName(usedEnemySpecialKind)}`);
  else showSpeechBubble("enemy", "");
  if (usedSpecialThisRound) {
    session.match.usedSpecial = true;
    if (usedSpecialKind === "showy") session.match.showyUses += 1;
  }

  // Resolve one round with a single stat card.
  const isPlayerAttacking = state.phase === "attack";
  const basePlayerOwn = statValueFromCharacter(state.player, stat);
  const baseEnemy = statValueFromCharacter(state.enemy, stat);
  const fieldMult = boostMultiplier(stat);
  const enemyBuffed = Math.round(baseEnemy * fieldMult);
  const playerSourceBase = side === "E" ? enemyBuffed : basePlayerOwn;

  let playerFinal = Math.round(playerSourceBase * (side === "E" ? 1 : fieldMult));
  let enemyFinal = enemyBuffed;

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
    playerFinal,
    enemyFinal,
  });
  playerFinal = enemySpecialRes.playerFinal;
  enemyFinal = enemySpecialRes.enemyFinal;
  if (enemySpecialRes.selfDamage) state.enemy.hearts = Math.max(0, (state.enemy.hearts || 0) - enemySpecialRes.selfDamage);
  if (enemySpecialRes.enemyDamage) state.player.hearts = Math.max(0, (state.player.hearts || 0) - enemySpecialRes.enemyDamage);
  refreshBattleUI();

  // Attack windup: step forward and back in 1 second.
  await playAttackStepMotion(isPlayerAttacking);

  const use777AttackSfx =
    (isPlayerAttacking && usedSpecialThisRound && usedSpecialKind === "seven77") ||
    (!isPlayerAttacking && usedEnemySpecialThisRound && usedEnemySpecialKind === "seven77");
  if (use777AttackSfx) window.PocketPawnsAudio?.playAttack777?.();
  else window.PocketPawnsAudio?.playAttack?.();

  // Show clash numbers.
  showClashNumbers(enemyFinal, playerFinal);

  session.lastRoundClash = {
    enemyFinal: Math.round(enemyFinal),
    playerFinal: Math.round(playerFinal),
    enemySpecialOn: usedEnemySpecialThisRound,
    enemySpecialKind: state.enemySpecial,
    enemySpecialStat: state.enemySpecialStat,
  };

  // Hit decision:
  // - Attack phase: player attacks enemy.
  // - Defense phase: enemy attacks player.
  // Damage only happens when attack value is strictly greater than defense value.
  let roundNote = [specialRes.note, enemySpecialRes.note].filter(Boolean).join("｜");
  if (isPlayerAttacking) {
    if (playerFinal > enemyFinal) {
      const damage = 1 + (specialRes.bonusDamage || 0);
      state.enemy.hearts = Math.max(0, (state.enemy.hearts || 0) - damage);
      emitBattleFx("attack", {
        stat,
        phase: state.phase,
        attacker: "player",
        target: "enemy",
        special: state.specialOn ? state.special : null,
        intensity: specialRes.attackFxBoost || 1,
      });
      roundNote = roundNote || `命中成功：敵方失去 ${damage} 點 HP`;
      if (usedSpecialKind === "seven77" && state.enemy.hearts <= 0) session.match.used777Kill = true;
      if (usedSpecialKind === "redheart" && state.enemy.hearts <= 0 && playerHeartsBefore === 1) {
        session.match.redheartAttackWin = true;
      }
      if (stat === "LUK" && boostMultiplier("LUK") > 1 && state.enemy.hearts <= 0) session.match.lukBoostWin = true;
    } else if (!roundNote) {
      roundNote = "攻擊被擋下，未造成傷害";
    }
  } else if (enemyFinal > playerFinal) {
    state.player.hearts = Math.max(0, (state.player.hearts || 0) - 1);
    if (!roundNote) roundNote = "防禦失敗：玩家失去 1 點 HP";
  } else if (!roundNote) {
    roundNote = "防禦成功，未受到傷害";
  }

  // 平手：先被自傷類特殊扣到 0 HP 時，本回合仍算平手（攻／防皆不造成比拚傷害），補 1 心避免帶 0 HP 進下一回合
  const clashTie = Math.round(playerFinal) === Math.round(enemyFinal);
  if (clashTie && (state.player.hearts || 0) <= 0) {
    const cap = state.player.maxHearts || 4;
    state.player.hearts = Math.min(cap, 1);
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
  refreshBattleUI();
  if (els.npcMessage && roundNote) els.npcMessage.textContent = roundNote;

  if ((state.enemy.hearts || 0) <= 0) {
    if ((state.player.hearts || 0) <= 0) {
      const cap = state.player.maxHearts || 4;
      state.player.hearts = Math.min(cap, 1);
    }
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
    if (sp.kind === "seven77") session.seven77Draws += 1;
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
  refreshBattleUI();
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
    state.enemy = clone(session.opponent.initial);
    state.field = rand(FIELDS);
    state.phase = "attack";
    state.over = false;
    state.resolving = false;
    state.hand = makeHandForPhase(state.phase);
    {
      const sp = makeSpecial(state.phase, state.hand);
      state.special = sp.kind;
      state.specialStat = sp.targetStat;
      if (sp.kind === "seven77") session.seven77Draws += 1;
    }
    state.specialOn = false;

    state.active = true;
    session.submitted = false;
    session.lastRoundClash = null;
    session.kills = 0;
    session.wins = 0;
    session.maxCombo = 0;
    session.seven77Draws = 0;
    session.any77Used = false;
    session.match = createMatchState();
    session.totalPlays = readTotalPlays() + 1;
    writeTotalPlays(session.totalPlays);
    applyMissCloudy("battle", getMissCloudyEntry("battle", "report"), {
      field: state.field?.name || "",
      phase: state.phase === "attack" ? "玩家攻擊階段" : "玩家防禦階段",
    });
    renderValueCards();
    renderSpecialColumn();
    refreshBattleUI();
    setNpcSpeech("open");
    setVisibleById("viewport");
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

async function loadCharacterDetailMeta(ch) {
  if (!els.characterDetailMeta || !ch?.id) return;
  const stats = await window.PocketPawnsSupabase?.fetchCharacterStats?.(ch.id);
  const useCount = stats?.use_count ?? 0;
  const sevenTotal = stats?.seven77_total ?? 0;
  const maxCombo = stats?.max_combo ?? 0;
  const holder = stats?.combo_holder || "—";
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
      holder = row?.combo_holder || "—";
    }
  });
  session.globalComboRecord = maxCombo;
  session.globalComboHolder = holder;
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
      await startBattle();
    }, { fadeMs: 200 });
  });

  document.querySelectorAll(".stat-sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.PocketPawnsAudio?.playBtn?.();
      sortStat = btn.dataset.sortStat || null;
      document.querySelectorAll(".stat-sort-btn").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderSelectCards();
    });
  });

  // Menu overlay
  document.getElementById("btn-menu").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtn?.();
    if (els.menuOverlay) els.menuOverlay.hidden = false;
  });
  document.getElementById("menu-btn-close").addEventListener("click", () => {
    window.PocketPawnsAudio?.playBtnBack?.();
    if (els.menuOverlay) els.menuOverlay.hidden = true;
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
}

async function init() {
  initEls();
  await loadGlobalRecordInfo();
  bindEvents();
  await loadDialogue();
  setVisibleById("title-screen");
}

document.addEventListener("DOMContentLoaded", init);

