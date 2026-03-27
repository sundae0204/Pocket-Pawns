#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const CHARACTERS_FILE = path.join(PROJECT_ROOT, "characters.js");

function loadCharacters() {
  const source = fs.readFileSync(CHARACTERS_FILE, "utf8");
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "characters.js" });
  return sandbox.window.POCKET_PAWNS_CHARACTERS;
}

function isNonNegativeInt(v) {
  return Number.isInteger(v) && v >= 0;
}

function main() {
  let characters;
  try {
    characters = loadCharacters();
  } catch (err) {
    console.error("[validate-characters] 無法讀取 characters.js：");
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  if (!Array.isArray(characters)) {
    errors.push("window.POCKET_PAWNS_CHARACTERS 必須是陣列。");
  } else if (characters.length === 0) {
    warnings.push("角色清單是空的。");
  }

  const idSeen = new Map();
  const sortSeen = new Map();

  (characters || []).forEach((ch, idx) => {
    const p = `角色[${idx}]`;
    if (!ch || typeof ch !== "object") {
      errors.push(`${p} 必須是物件。`);
      return;
    }

    if (typeof ch.id !== "string" || !ch.id.trim()) {
      errors.push(`${p} id 必須是非空字串。`);
    } else {
      const id = ch.id.trim();
      if (!/^char_\d{3}$/.test(id)) warnings.push(`${p} id 格式建議為 char_001（目前: ${id}）。`);
      if (idSeen.has(id)) errors.push(`${p} id 重複：${id}（與角色[${idSeen.get(id)}] 重複）。`);
      else idSeen.set(id, idx);
    }

    if (typeof ch.name !== "string" || !ch.name.trim()) {
      errors.push(`${p} name 必須是非空字串。`);
    }

    if (!isNonNegativeInt(ch.sortIndex)) {
      errors.push(`${p} sortIndex 必須是 >= 0 的整數。`);
    } else if (sortSeen.has(ch.sortIndex)) {
      warnings.push(`${p} sortIndex 重複：${ch.sortIndex}（與角色[${sortSeen.get(ch.sortIndex)}] 重複）。`);
    } else {
      sortSeen.set(ch.sortIndex, idx);
    }

    if (!ch.initial || typeof ch.initial !== "object") {
      errors.push(`${p} initial 必須是物件。`);
      return;
    }

    const stats = ch.initial.stats;
    if (!Array.isArray(stats)) {
      errors.push(`${p} initial.stats 必須是陣列。`);
    } else {
      if (stats.length !== 6) errors.push(`${p} initial.stats 必須剛好 6 個數值。`);
      stats.forEach((n, statIdx) => {
        if (!Number.isFinite(n)) errors.push(`${p} initial.stats[${statIdx}] 必須是數字。`);
      });
    }

    if (!isNonNegativeInt(ch.initial.hearts)) {
      errors.push(`${p} initial.hearts 必須是 >= 0 的整數。`);
    }
    if (!isNonNegativeInt(ch.initial.maxHearts)) {
      errors.push(`${p} initial.maxHearts 必須是 >= 0 的整數。`);
    }
    if (
      isNonNegativeInt(ch.initial.hearts)
      && isNonNegativeInt(ch.initial.maxHearts)
      && ch.initial.hearts > ch.initial.maxHearts
    ) {
      errors.push(`${p} initial.hearts (${ch.initial.hearts}) 不可大於 maxHearts (${ch.initial.maxHearts})。`);
    }
  });

  if (warnings.length) {
    console.warn("[validate-characters] 警告：");
    warnings.forEach((w) => console.warn(`- ${w}`));
  }

  if (errors.length) {
    console.error("[validate-characters] 失敗：");
    errors.forEach((e) => console.error(`- ${e}`));
    process.exit(1);
  }

  console.log(`[validate-characters] 通過：共 ${characters.length} 位角色。`);
  process.exit(0);
}

main();
