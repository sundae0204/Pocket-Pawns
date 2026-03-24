/**
 * Supabase / 本地快取：角色統計與戰鬥結算上傳
 * 請在 index.html 設定 window.POCKET_PAWNS_SUPABASE_URL 與 window.POCKET_PAWNS_SUPABASE_ANON_KEY
 */
(function () {
  const LS_KEY = "pocket_pawns_character_stats_v1";
  const LS_BATTLES = "pocket_pawns_battle_log_v1";

  function readLocalMap() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeLocalMap(map) {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  }

  function getSupabase() {
    const url = typeof window !== "undefined" ? window.POCKET_PAWNS_SUPABASE_URL : "";
    const key = typeof window !== "undefined" ? window.POCKET_PAWNS_SUPABASE_ANON_KEY : "";
    const createClient = window.supabase?.createClient;
    if (!url || !key || typeof createClient !== "function") return null;
    return createClient(url, key);
  }

  /**
   * @param {string} characterId
   * @returns {Promise<{ use_count: number, seven77_total: number, max_combo: number, combo_holder: string }>}
   */
  async function fetchCharacterStats(characterId) {
    const local = readLocalMap()[characterId];
    const base = {
      use_count: local?.use_count ?? 0,
      seven77_total: local?.seven77_total ?? 0,
      max_combo: local?.max_combo ?? 0,
      combo_holder: local?.combo_holder ?? "—",
    };

    const sb = getSupabase();
    if (!sb) return base;

    const { data, error } = await sb.from("character_stats").select("*").eq("character_id", characterId).maybeSingle();
    if (error || !data) return base;

    return {
      use_count: data.use_count ?? 0,
      seven77_total: data.seven77_total ?? 0,
      max_combo: data.max_combo ?? 0,
      combo_holder: data.combo_holder || "—",
    };
  }

  /**
   * @returns {Promise<Record<string, { use_count: number, seven77_total: number, max_combo: number, combo_holder: string }>>}
   */
  async function fetchAllCharacterStats(ids) {
    /** @type {Record<string, any>} */
    const out = {};
    const sb = getSupabase();

    if (sb) {
      // PostgREST 在某些環境對 text + in.(a,b,c) 會將值誤判為識別字，改用明確字串 in 避免 400。
      const quotedIds = ids
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .map((id) => `"${id.replace(/"/g, '\\"')}"`);
      const inExpr = `(${quotedIds.join(",")})`;
      const { data, error } = quotedIds.length
        ? await sb.from("character_stats").select("*").filter("character_id", "in", inExpr)
        : { data: [], error: null };
      if (!error && data) {
        for (const row of data) {
          out[row.character_id] = {
            use_count: row.use_count ?? 0,
            seven77_total: row.seven77_total ?? 0,
            max_combo: row.max_combo ?? 0,
            combo_holder: row.combo_holder || "—",
          };
        }
      }
    }

    const local = readLocalMap();
    for (const id of ids) {
      if (!out[id]) {
        const l = local[id];
        out[id] = {
          use_count: l?.use_count ?? 0,
          seven77_total: l?.seven77_total ?? 0,
          max_combo: l?.max_combo ?? 0,
          combo_holder: l?.combo_holder ?? "—",
        };
      }
    }
    return out;
  }

  /**
   * 戰鬥結束時呼叫：寫入本場數據並更新累計（使用次數、777 抽中次數、連擊紀錄等）
   * @param {{
   *   characterId: string,
   *   characterName: string,
   *   outcome: "win"|"lose",
   *   kills: number,
   *   used777: boolean,
   *   seven77DrawsThisMatch: number,
   *   maxComboThisMatch: number,
   *   brokeGlobalComboRecord: boolean,
   *   recordHolderName?: string | null
   * }} payload
   */
  async function submitBattleResult(payload) {
    const {
      characterId,
      characterName,
      outcome,
      kills,
      used777,
      seven77DrawsThisMatch,
      maxComboThisMatch,
      brokeGlobalComboRecord,
      recordHolderName,
    } = payload;

    const map = readLocalMap();
    const prev = map[characterId] || { use_count: 0, seven77_total: 0, max_combo: 0, combo_holder: "—" };

    const next = {
      use_count: prev.use_count + 1,
      seven77_total: prev.seven77_total + (seven77DrawsThisMatch | 0),
      max_combo: prev.max_combo,
      combo_holder: prev.combo_holder || "—",
    };

    if (maxComboThisMatch > next.max_combo) {
      next.max_combo = maxComboThisMatch;
      if (recordHolderName && String(recordHolderName).trim()) {
        next.combo_holder = String(recordHolderName).trim().slice(0, 32);
      }
    }

    map[characterId] = next;
    writeLocalMap(map);

    try {
      const battles = JSON.parse(localStorage.getItem(LS_BATTLES) || "[]");
      battles.push({
        at: new Date().toISOString(),
        characterId,
        characterName,
        outcome,
        kills,
        used777,
        seven77DrawsThisMatch,
        maxComboThisMatch,
      });
      localStorage.setItem(LS_BATTLES, JSON.stringify(battles.slice(-80)));
    } catch {
      /* ignore */
    }

    const sb = getSupabase();
    if (!sb) {
      return { ok: true, local: next, remote: null };
    }

    const { data: existing, error: fetchErr } = await sb.from("character_stats").select("*").eq("character_id", characterId).maybeSingle();
    if (fetchErr) {
      return { ok: false, error: fetchErr.message, local: next };
    }

    const newUse = (existing?.use_count ?? 0) + 1;
    const new77 = (existing?.seven77_total ?? 0) + (seven77DrawsThisMatch | 0);
    let newMax = existing?.max_combo ?? 0;
    let comboHolder = existing?.combo_holder || "—";

    if (maxComboThisMatch > newMax) {
      newMax = maxComboThisMatch;
      const nm = recordHolderName && String(recordHolderName).trim() ? String(recordHolderName).trim().slice(0, 32) : "";
      if (nm) comboHolder = nm;
    }

    const { error: upErr } = await sb.from("character_stats").upsert(
      {
        character_id: characterId,
        use_count: newUse,
        seven77_total: new77,
        max_combo: newMax,
        combo_holder: comboHolder,
      },
      { onConflict: "character_id" }
    );

    if (upErr) return { ok: false, error: upErr.message, local: next };

    const { error: logErr } = await sb.from("battle_results").insert({
      character_id: characterId,
      character_name: characterName,
      outcome,
      kills,
      used_777: !!used777,
      seven77_draws: seven77DrawsThisMatch | 0,
      max_combo: maxComboThisMatch | 0,
      broke_record: !!brokeGlobalComboRecord,
    });

    if (logErr) {
      return { ok: true, local: next, remote: "stats_ok_log_skip", logError: logErr.message };
    }

    return { ok: true, local: next, remote: "ok" };
  }

  /**
   * 僅更新連擊榜持有者名稱（破紀錄後玩家輸入暱稱時）
   */
  async function submitComboRecordName(characterId, name) {
    const trimmed = String(name || "").trim().slice(0, 32);
    if (!trimmed) return { ok: false, error: "empty" };

    const map = readLocalMap();
    const prev = map[characterId] || {};
    map[characterId] = { ...prev, combo_holder: trimmed };
    writeLocalMap(map);

    const sb = getSupabase();
    if (!sb) return { ok: true, local: map[characterId] };

    const { error } = await sb.from("character_stats").update({ combo_holder: trimmed }).eq("character_id", characterId);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  window.PocketPawnsSupabase = {
    fetchCharacterStats,
    fetchAllCharacterStats,
    submitBattleResult,
    submitComboRecordName,
  };
})();
