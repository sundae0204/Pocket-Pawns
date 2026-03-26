/**
 * 音效管理：以 new Audio() 建立小型音效池，避免 Web Audio decode 與複雜節點。
 * 請將 se_btn / se_atk_str / … 放在 ./sounds/（檔名見 SOUND_FILES）。
 * 須在使用者手勢後呼叫 init()（內含 AudioContext.resume() 以符合自動播放策略）。
 */
(function (global) {
  "use strict";

  const BGM_FILES = {
    title: "bgm/bgm_title.mp3",
    battle: "bgm/bgm_battle.mp3",
    end: "bgm/bgm_end.mp3",
  };

  const SOUND_FILES = {
    btn: "sounds/se_btn.mp3",
    btnBack: "sounds/se_btn_back.mp3",
    card: "sounds/se_btn_card.mp3",
    atkStr: "sounds/se_atk_str.mp3",
    atkInt: "sounds/se_atk_int.mp3",
    atkDex: "sounds/se_atk_dex.mp3",
    defAgi: "sounds/se_def_agi.mp3",
    defVit: "sounds/se_def_vit.mp3",
    defLuk: "sounds/se_def_luk.mp3",
    attack777: "sounds/se_attack_777.mp3",
    win: "sounds/se_win.mp3",
    loss: "sounds/se_loss.mp3",
    hpUp: "sounds/se_hp_up.mp3",
    dead: "sounds/se_dead.mp3",
    battleStart: "sounds/se_start.mp3",
  };

  const POOL_PER_KEY = 4;

  /** @type {Record<string, HTMLAudioElement[]>} */
  const pools = {};

  /** @type {HTMLAudioElement | null} */
  let bgmAudio = null;
  /** @type {string | null} */
  let currentBgmKey = null;

  function resolveUrl(rel) {
    return new URL(rel, global.location.href).href;
  }

  function ensurePool(key) {
    if (pools[key] && pools[key].length) return;
    const rel = SOUND_FILES[key];
    if (!rel) return;
    const url = resolveUrl(rel);
    pools[key] = [];
    for (let i = 0; i < POOL_PER_KEY; i++) {
      const a = new Audio(url);
      a.preload = "auto";
      pools[key].push(a);
    }
  }

  function ensureAllPools() {
    for (const key of Object.keys(SOUND_FILES)) {
      ensurePool(key);
    }
  }

  /**
   * @param {keyof typeof BGM_FILES} key
   */
  function setBgm(key) {
    const rel = BGM_FILES[key];
    if (!rel) return;
    const v = Math.max(0, Math.min(1, Number(PocketPawnsAudio.bgmVolume) || 0));
    if (key === currentBgmKey && bgmAudio) {
      bgmAudio.volume = v;
      if (!bgmAudio.paused) return;
      if (v > 0) bgmAudio.play().catch(() => {});
      return;
    }
    const url = resolveUrl(rel);
    if (!bgmAudio) {
      bgmAudio = new Audio(url);
      bgmAudio.loop = true;
    } else {
      bgmAudio.pause();
      bgmAudio.src = url;
      bgmAudio.load();
      bgmAudio.loop = true;
    }
    bgmAudio.volume = v;
    currentBgmKey = key;
    if (v > 0) {
      bgmAudio.play().catch(() => {});
    }
  }

  function stopBgm() {
    if (bgmAudio) {
      bgmAudio.pause();
      try {
        bgmAudio.currentTime = 0;
      } catch (_) {}
    }
    currentBgmKey = null;
  }

  /**
   * 在使用者點「遊玩」等按鈕時呼叫：resume AudioContext（解鎖自動播放）並預建音效池。
   */
  function init() {
    const AC = global.AudioContext || global.webkitAudioContext;
    if (AC) {
      try {
        const ctx = new AC();
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
      } catch (_) {
        /* ignore */
      }
    }
    ensureAllPools();
  }

  /**
   * @param {keyof typeof SOUND_FILES} soundName
   */
  function play(soundName) {
    if (!SOUND_FILES[soundName]) return;
    const vol = Math.max(0, Math.min(1, Number(PocketPawnsAudio.globalVolume) || 0));
    if (vol <= 0) return;
    ensurePool(soundName);
    const list = pools[soundName];
    if (!list || !list.length) return;
    let a = list.find((x) => x.paused || x.ended);
    if (!a) a = list[0];
    a.volume = vol;
    try {
      a.currentTime = 0;
    } catch (_) {
      /* ignore */
    }
    a.play().catch(() => {});
  }

  const PocketPawnsAudio = {
    globalVolume: 1,
    /** BGM 音量 0～1（與音效分開） */
    bgmVolume: 0.55,

    init,

    /** 與 init 相同；保留舊程式呼叫 */
    unlock() {
      init();
      return Promise.resolve();
    },

    play,

    playBtn() {
      play("btn");
    },
    playBtnBack() {
      play("btnBack");
    },
    playCard() {
      play("card");
    },
    playAttack() {
      // 舊 API：預設走 STR 攻擊音效（避免舊呼叫壞掉）
      play("atkStr");
    },
    playBattleFxByKey(kindKey) {
      const k = String(kindKey || "").toLowerCase();
      if (k === "str") play("atkStr");
      else if (k === "int") play("atkInt");
      else if (k === "dex") play("atkDex");
      else if (k === "agi") play("defAgi");
      else if (k === "vit") play("defVit");
      else if (k === "luk") play("defLuk");
    },
    playAttack777() {
      play("attack777");
    },
    playWin() {
      play("win");
    },
    playLoss() {
      play("loss");
    },
    playHpUp() {
      play("hpUp");
    },
    playDead() {
      play("dead");
    },
    /** GAME START／ROUND 2+ 中央跳字演出 */
    playBattleStart() {
      play("battleStart");
    },

    setBgm,
    stopBgm,

    isReady() {
      return Object.keys(pools).some((k) => pools[k] && pools[k].length);
    },
  };

  global.PocketPawnsAudio = PocketPawnsAudio;
})(typeof window !== "undefined" ? window : globalThis);
