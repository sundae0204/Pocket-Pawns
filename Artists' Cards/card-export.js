/**
 * Artists' Cards — 匯出頁：表單 + 右下縮小預覽 + PNG 合成（此頁不調整照片平移／縮放）
 * 卡牌座標 460×640，資源於 artcard_object/
 */
(function () {
  const STORAGE_KEY = "artcard_cropped";
  const CARD_W = 460;
  const CARD_H = 640;

  const JOB_ICON = 105;
  const ATTR_W = 74;
  const ATTR_H = 89;
  const ATTR_SCALE_SMALL = 0.75;
  /** 第 2～4 個屬性相對原座標往右；與第 1 個底邊切齊 */
  const ATTR_EXTRA_SHIFT_X = 15;
  const ATTR_FIRST_Y = 530;
  const ATTR_FIRST_BOTTOM = ATTR_FIRST_Y + ATTR_H;
  const ATTR_SMALL_H = ATTR_H * ATTR_SCALE_SMALL;
  const ATTR_SMALL_W = ATTR_W * ATTR_SCALE_SMALL;
  /** 第 2～4 格原設計 X（右起第 2～4），僅供加總位移 */
  const ATTR_BASE_X_SMALL = [294, 238, 182];

  /**
   * 屬性 icon 由右到左：index 0 最右、滿尺寸；1～3 為 75% 寬高，右移 15px，底與第 1 個對齊
   * @returns {{ x: number, y: number, w: number, h: number }}
   */
  function getAttrDrawRect(slotIndex) {
    if (slotIndex === 0) {
      return { x: 367, y: ATTR_FIRST_Y, w: ATTR_W, h: ATTR_H };
    }
    if (slotIndex >= 1 && slotIndex <= 3) {
      const x = ATTR_BASE_X_SMALL[slotIndex - 1] + ATTR_EXTRA_SHIFT_X;
      const y = Math.round(ATTR_FIRST_BOTTOM - ATTR_SMALL_H);
      return { x, y, w: ATTR_SMALL_W, h: ATTR_SMALL_H };
    }
    return { x: 0, y: 0, w: ATTR_W, h: ATTR_H };
  }

  /** 角色名／簡介：最上層繪製，避免被框線或 icon 遮擋 */
  function drawCardNameIntro(ctx, name, intro) {
    const nameFontPx = Math.round((22 * 96) / 72);
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.font = `800 ${nameFontPx}px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(name, CARD_W / 2, 478);
    ctx.font = `400 22px "Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(intro, CARD_W / 2, 521);
    ctx.textAlign = "left";
  }

  const FRAMES = [
    { id: "n", file: "artcard_object/card_n.png" },
    { id: "r", file: "artcard_object/card_r.png" },
    { id: "s", file: "artcard_object/card_s.png" },
  ];

  const els = {
    wrap: document.getElementById("export-root"),
    missing: document.getElementById("missing-image"),
    main: document.getElementById("export-main"),
    canvas: document.getElementById("preview-canvas"),
    frameInfo: document.getElementById("frame-info"),
    err: document.getElementById("export-error"),
    name: document.getElementById("field-name"),
    intro: document.getElementById("field-intro"),
    btnDl: document.getElementById("btn-download"),
    previewFloat: document.getElementById("preview-float"),
  };

  /** 屬性勾選順序（第 1 個勾選 = 卡牌最右側 icon） */
  let attrSelectionOrder = [];

  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text;
    return d.innerHTML;
  }

  function getJobValue() {
    const r = document.querySelector('input[name="field-job"]:checked');
    return r ? String(r.value) : "";
  }

  function getAttrSlots() {
    return attrSelectionOrder.slice(0, 4);
  }

  function updateAttrOrderHint() {
    const el = document.getElementById("attr-order-hint");
    if (!el) return;
    if (attrSelectionOrder.length === 0) {
      el.textContent = "尚未選擇屬性";
      return;
    }
    const labels = attrSelectionOrder.map((n) => `屬性 ${String(n).padStart(2, "0")}`);
    el.textContent = `已選順序（最右 → 最左）：${labels.join(" → ")}`;
  }

  function buildPickListsFromData() {
    const data = window.ARTCARD_EXPORT_DATA;
    if (!data || !data.jobs) return;

    const jobHost = document.getElementById("job-list");
    if (jobHost) {
      jobHost.innerHTML = "";
      data.jobs.forEach((j) => {
        const id = String(j.id).padStart(2, "0");
        const lab = document.createElement("label");
        lab.className = "pick-row";
        lab.innerHTML = `
          <span class="pick-row__thumb">
            <input type="radio" name="field-job" value="${j.id}" />
            <span class="pick-row__icon pick-row__icon--job">
              <img src="artcard_object/icon_job${id}.png" width="105" height="105" alt="" loading="lazy" decoding="async" />
            </span>
          </span>
          <span class="pick-desc">${escapeHtml(j.text)}</span>
        `;
        jobHost.appendChild(lab);
      });
    }

    const attrHost = document.getElementById("attr-list");
    const attrSource = Array.isArray(data.attrs) ? data.attrs : null;
    if (attrHost) {
      attrHost.innerHTML = "";
      if (attrSource && attrSource.length) {
        attrSource.forEach((attr) => {
          const n = attr.id;
          const id = String(n).padStart(2, "0");
          const lab = document.createElement("label");
          lab.className = "pick-row";
          lab.innerHTML = `
          <span class="pick-row__thumb">
            <input type="checkbox" name="attr-el" value="${n}" data-el="${n}" />
            <span class="pick-row__icon pick-row__icon--el">
              <img src="artcard_object/icon_el${id}.png" width="74" height="89" alt="" loading="lazy" decoding="async" />
            </span>
          </span>
          <span class="pick-desc pick-desc--stacked">
            <span class="pick-desc__title">${escapeHtml(attr.title)}</span>
            <span class="pick-desc__body">${escapeHtml(attr.body)}</span>
          </span>
        `;
          attrHost.appendChild(lab);
        });
      } else if (Array.isArray(data.attrTexts)) {
        data.attrTexts.forEach((txt, i) => {
          const n = i + 1;
          const id = String(n).padStart(2, "0");
          const lab = document.createElement("label");
          lab.className = "pick-row";
          lab.innerHTML = `
          <span class="pick-row__thumb">
            <input type="checkbox" name="attr-el" value="${n}" data-el="${n}" />
            <span class="pick-row__icon pick-row__icon--el">
              <img src="artcard_object/icon_el${id}.png" width="74" height="89" alt="" loading="lazy" decoding="async" />
            </span>
          </span>
          <span class="pick-desc">${escapeHtml(txt)}</span>
        `;
          attrHost.appendChild(lab);
        });
      }
    }
  }

  function onAttrCheckboxChange(ev) {
    const t = ev.target;
    if (!(t instanceof HTMLInputElement) || t.name !== "attr-el") return;
    const id = parseInt(t.value, 10);
    if (Number.isNaN(id)) return;

    if (t.checked) {
      if (attrSelectionOrder.includes(id)) return;
      if (attrSelectionOrder.length >= 4) {
        t.checked = false;
        showErr("最多選擇 4 個屬性");
        return;
      }
      attrSelectionOrder.push(id);
    } else {
      attrSelectionOrder = attrSelectionOrder.filter((x) => x !== id);
    }
    updateAttrOrderHint();
    scheduleRedraw();
    syncDownloadButton();
  }

  /** 字元數（含 emoji 等） */
  function uLen(str) {
    return [...String(str || "")].length;
  }

  /**
   * 載入圖供 canvas 使用。勿對 Image 設 crossOrigin（靜態站常無 CORS 標頭會導致 canvas 污染、toBlob 失敗）。
   * 在 http(s) 下優先 fetch→blob 再載入，可避免邊緣污染問題。
   */
  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error("無法載入圖片：" + src));
      im.src = src;
    });
  }

  async function loadImage(src) {
    const s = String(src);
    if (s.startsWith("data:")) {
      return loadImageElement(s);
    }

    const httpPage =
      typeof location !== "undefined" && (location.protocol === "http:" || location.protocol === "https:");
    if (httpPage && typeof fetch === "function") {
      try {
        const res = await fetch(s, { cache: "force-cache" });
        if (!res.ok) throw new Error("fetch");
        const blob = await res.blob();
        const u = URL.createObjectURL(blob);
        try {
          return await loadImageElement(u);
        } finally {
          URL.revokeObjectURL(u);
        }
      } catch {
        /* 改走下方直接 src */
      }
    }

    return loadImageElement(s);
  }

  let userPhoto = null;
  /** 以「恰好蓋滿卡牌」為 scale=1 的基準 */
  let photoState = { scale: 1, panX: 0, panY: 0, baseCover: 1 };

  function resetPhotoTransform() {
    if (!userPhoto) return;
    const iw = userPhoto.naturalWidth;
    const ih = userPhoto.naturalHeight;
    photoState.baseCover = Math.max(CARD_W / iw, CARD_H / ih);
    photoState.scale = 1;
    photoState.panX = 0;
    photoState.panY = 0;
  }

  function drawUserPhoto(ctx) {
    if (!userPhoto) return;
    const iw = userPhoto.naturalWidth;
    const ih = userPhoto.naturalHeight;
    const s = photoState.baseCover * photoState.scale;
    const dw = iw * s;
    const dh = ih * s;
    const x = (CARD_W - dw) / 2 + photoState.panX;
    const y = (CARD_H - dh) / 2 + photoState.panY;
    ctx.drawImage(userPhoto, x, y, dw, dh);
  }

  function pickRandomFrame() {
    return FRAMES[Math.floor(Math.random() * FRAMES.length)];
  }

  /** 預覽區固定使用 card_n，下載時才隨機 n/r/s */
  const PREVIEW_FRAME = { id: "n", file: "artcard_object/card_n.png" };

  let cachedFrameImg = null;
  let cachedFrameMeta = null;

  async function ensureFrameImage() {
    if (cachedFrameImg && cachedFrameMeta && cachedFrameMeta.id === "n") {
      return { img: cachedFrameImg, meta: cachedFrameMeta };
    }
    cachedFrameImg = await loadImage(PREVIEW_FRAME.file);
    cachedFrameMeta = PREVIEW_FRAME;
    return { img: cachedFrameImg, meta: cachedFrameMeta };
  }

  async function compositeToCanvasForDownload() {
    const ctx = els.canvas.getContext("2d");
    if (!userPhoto) throw new Error("缺少照片");

    const pick = pickRandomFrame();
    const frameImg = await loadImage(pick.file);

    ctx.clearRect(0, 0, CARD_W, CARD_H);

    drawUserPhoto(ctx);

    ctx.drawImage(frameImg, 0, 0, CARD_W, CARD_H);

    const jv = parseInt(getJobValue(), 10);
    if (!Number.isFinite(jv) || jv < 1 || jv > 12) throw new Error("請選擇職業");
    const jobNum = String(jv).padStart(2, "0");
    const jobImg = await loadImage(`artcard_object/icon_job${jobNum}.png`);
    ctx.drawImage(jobImg, 0, 0, JOB_ICON, JOB_ICON);

    const name = String(els.name.value || "").trim();
    const intro = String(els.intro.value || "").trim();
    if (uLen(name) > 9) throw new Error("角色名稱最多 9 個字");
    if (uLen(intro) > 14) throw new Error("角色簡介最多 14 個字");

    const slots = getAttrSlots();
    if (slots.length < 1 || slots.length > 4) throw new Error("請選擇 1～4 個屬性（不可重複）");
    const uniq = new Set(slots);
    if (uniq.size !== slots.length) throw new Error("屬性不可重複");

    for (let i = 0; i < slots.length; i++) {
      const num = String(slots[i]).padStart(2, "0");
      const elImg = await loadImage(`artcard_object/icon_el${num}.png`);
      const r = getAttrDrawRect(i);
      ctx.drawImage(elImg, r.x, r.y, r.w, r.h);
    }

    drawCardNameIntro(ctx, name, intro);

    return pick;
  }

  let rafPending = false;
  function scheduleRedraw() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(async () => {
      rafPending = false;
      try {
        await redrawPreview();
      } catch (e) {
        console.error(e);
      }
    });
  }

  async function redrawPreview() {
    const ctx = els.canvas.getContext("2d");
    if (!userPhoto) return;
    ctx.clearRect(0, 0, CARD_W, CARD_H);
    drawUserPhoto(ctx);
    try {
      const { img: frameImg, meta } = await ensureFrameImage();
      ctx.drawImage(frameImg, 0, 0, CARD_W, CARD_H);
      if (els.frameInfo)
        els.frameInfo.textContent =
          "預覽框體固定為 card_n.png（下載 PNG 時隨機 card_n／card_r／card_s）";
    } catch {
      if (els.frameInfo) els.frameInfo.textContent = "";
    }

    const jobVal = getJobValue();
    if (jobVal) {
      const jobNum = String(Math.min(12, Math.max(1, parseInt(jobVal, 10)))).padStart(2, "0");
      const jobImg = await loadImage(`artcard_object/icon_job${jobNum}.png`);
      ctx.drawImage(jobImg, 0, 0, JOB_ICON, JOB_ICON);
    }

    const slots = getAttrSlots();
    const uniq = new Set(slots);
    if (slots.length >= 1 && slots.length <= 4 && uniq.size === slots.length) {
      for (let i = 0; i < slots.length; i++) {
        const num = String(slots[i]).padStart(2, "0");
        const elImg = await loadImage(`artcard_object/icon_el${num}.png`);
        const r = getAttrDrawRect(i);
        ctx.drawImage(elImg, r.x, r.y, r.w, r.h);
      }
    }

    const name = String(els.name.value || "").trim();
    const intro = String(els.intro.value || "").trim();
    drawCardNameIntro(ctx, name, intro);
  }

  function showErr(msg) {
    if (els.err) {
      els.err.textContent = msg || "";
      els.err.hidden = !msg;
    }
  }

  /** 與下載前驗證一致；通過才可啟用「下載 PNG」 */
  function canExportForm() {
    if (!userPhoto) return false;
    const name = String(els.name?.value || "").trim();
    const intro = String(els.intro?.value || "").trim();
    if (!name || uLen(name) > 9) return false;
    if (!intro || uLen(intro) > 14) return false;
    const jv = parseInt(getJobValue(), 10);
    if (!Number.isFinite(jv) || jv < 1 || jv > 12) return false;
    const slots = getAttrSlots();
    if (slots.length < 1 || slots.length > 4) return false;
    if (new Set(slots).size !== slots.length) return false;
    return true;
  }

  function syncDownloadButton() {
    if (els.btnDl) els.btnDl.disabled = !canExportForm();
  }

  async function init() {
    const dataUrl = sessionStorage.getItem(STORAGE_KEY);
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      if (els.missing) els.missing.hidden = false;
      if (els.main) els.main.hidden = true;
      if (els.previewFloat) {
        els.previewFloat.hidden = true;
        els.previewFloat.setAttribute("aria-hidden", "true");
      }
      if (els.btnDl) els.btnDl.disabled = true;
      return;
    }

    if (els.missing) els.missing.hidden = true;
    if (els.main) els.main.hidden = false;
    if (els.previewFloat) {
      els.previewFloat.hidden = false;
      els.previewFloat.setAttribute("aria-hidden", "false");
    }

    attrSelectionOrder = [];
    buildPickListsFromData();
    updateAttrOrderHint();

    function onFormChange() {
      scheduleRedraw();
      syncDownloadButton();
    }
    document.getElementById("job-list")?.addEventListener("change", onFormChange);
    document.getElementById("attr-list")?.addEventListener("change", onAttrCheckboxChange);

    userPhoto = await loadImage(dataUrl);
    els.canvas.width = CARD_W;
    els.canvas.height = CARD_H;
    resetPhotoTransform();
    cachedFrameImg = null;
    cachedFrameMeta = null;

    await redrawPreview();

    ["input", "change"].forEach((ev) => {
      els.name?.addEventListener(ev, onFormChange);
      els.intro?.addEventListener(ev, onFormChange);
    });

    syncDownloadButton();

    document.getElementById("btn-back")?.addEventListener("click", () => {
      window.location.href = "CardIndex.html";
    });

    els.btnDl?.addEventListener("click", async () => {
      showErr("");
      try {
        const name = String(els.name.value || "").trim();
        const intro = String(els.intro.value || "").trim();
        if (!name) throw new Error("請填角色名稱");
        if (uLen(name) > 9) throw new Error("角色名稱最多 9 個字");
        if (!intro) throw new Error("請填角色簡介");
        if (uLen(intro) > 14) throw new Error("角色簡介最多 14 個字");
        if (!getJobValue()) throw new Error("請選擇職業");

        const slots = getAttrSlots();
        if (slots.length < 1 || slots.length > 4) throw new Error("請選擇 1～4 個屬性");
        if (new Set(slots).size !== slots.length) throw new Error("屬性不可重複");

        const frameMeta = await compositeToCanvasForDownload();
        showErr("");
        if (els.frameInfo) els.frameInfo.textContent = `本次輸出框體：card_${frameMeta.id}.png`;

        let blob;
        try {
          blob = await new Promise((resolve, reject) => {
            try {
              els.canvas.toBlob(
                (b) => {
                  if (b) resolve(b);
                  else reject(new Error("TOBLOB_NULL"));
                },
                "image/png",
                1,
              );
            } catch (e) {
              reject(e);
            }
          });
        } catch (e) {
          const msg = String(e?.message || e || "");
          const isTaint =
            e?.name === "SecurityError" ||
            /tainted|securityerror/i.test(msg) ||
            msg === "TOBLOB_NULL";
          if (isTaint) {
            showErr(
              location.protocol === "file:"
                ? "無法匯出 PNG：用 file:// 開啟時，瀏覽器會鎖定 canvas 匯出。請改用具網址的本機伺服器開啟（例如 http://127.0.0.1:8080）。"
                : "無法匯出 PNG：canvas 已被污染（常因跨網域圖片或外掛）。請重新整理後重試，或改用同源網址開啟本頁。",
            );
          } else {
            showErr(msg || "無法產生 PNG");
          }
          return;
        }

        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `artcard_${frameMeta.id}_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch (err) {
        showErr(err?.message || String(err));
      }
    });
  }

  document.getElementById("btn-top")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
