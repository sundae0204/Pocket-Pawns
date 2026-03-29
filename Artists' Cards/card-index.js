/**
 * Artists' Cards — 上傳與剪裁
 * 與牌框同尺寸 460×640；裁切框內底部 460×144 為「角色詳細」提示區（半透明）
 * 輸出至 sessionStorage：artcard_cropped（data URL）
 */
(function () {
  const STORAGE_KEY = "artcard_cropped";
  /** 與卡牌／牌框一致 */
  const CARD_W = 460;
  const CARD_H = 640;
  const DETAIL_ZONE_H = 144;
  /** 底部詳細區佔卡牌高度比例（144/640） */
  const DETAIL_ZONE_RATIO = DETAIL_ZONE_H / CARD_H;

  const input = document.getElementById("file-input");
  const img = document.getElementById("crop-image");
  const btnNext = document.getElementById("btn-next");
  const errEl = document.getElementById("index-error");
  const cropStage = document.querySelector(".crop-stage");
  let cropper = null;
  /** 須在裁切／輸出完成前保持有效，不可於 onload 內立即 revoke */
  let imageObjectUrl = null;

  function showErr(msg) {
    if (errEl) {
      errEl.textContent = msg || "";
      errEl.hidden = !msg;
    }
  }

  function revokeImageUrl() {
    if (imageObjectUrl) {
      URL.revokeObjectURL(imageObjectUrl);
      imageObjectUrl = null;
    }
  }

  function destroyCropper() {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    revokeImageUrl();
  }

  /**
   * 先嘗試直接輸出 460×640；若 Cropper 回傳 null（瀏覽器／尺寸組合問題），改為任意裁切再手動縮放。
   */
  function getCroppedCanvasOutput() {
    if (!cropper) return null;
    let canvas = cropper.getCroppedCanvas({
      width: CARD_W,
      height: CARD_H,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (canvas && canvas.width > 0 && canvas.height > 0) return canvas;

    const raw = cropper.getCroppedCanvas({
      imageSmoothingEnabled: true,
      imageSmoothingQuality: "high",
    });
    if (!raw || raw.width <= 0 || raw.height <= 0) return null;

    const out = document.createElement("canvas");
    out.width = CARD_W;
    out.height = CARD_H;
    const ctx = out.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(raw, 0, 0, CARD_W, CARD_H);
    return out;
  }

  /** 在裁切框內底部顯示 460×144 對應的半透明提示（不阻擋裁切操作） */
  function attachDetailZoneHint() {
    const box = cropStage?.querySelector(".cropper-crop-box");
    if (!box) return;
    let hint = box.querySelector(".artcard-detail-hint");
    if (!hint) {
      hint = document.createElement("div");
      hint.className = "artcard-detail-hint";
      hint.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "artcard-detail-hint__label";
      label.textContent = "角色詳細（文字／圖示）460×144";
      hint.appendChild(label);
      box.appendChild(hint);
    }
    hint.style.height = `${DETAIL_ZONE_RATIO * 100}%`;
  }

  input?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      showErr("請選擇圖片檔。");
      return;
    }
    showErr("");
    destroyCropper();
    imageObjectUrl = URL.createObjectURL(file);
    img.removeAttribute("src");
    img.src = imageObjectUrl;
    img.onload = () => {
      cropper = new Cropper(img, {
        viewMode: 1,
        dragMode: "move",
        aspectRatio: CARD_W / CARD_H,
        autoCropArea: 0.92,
        responsive: true,
        background: false,
        ready() {
          attachDetailZoneHint();
        },
        crop() {
          attachDetailZoneHint();
        },
      });
      btnNext.disabled = false;
    };
  });

  btnNext?.addEventListener("click", () => {
    if (!cropper) {
      showErr("請先上傳圖片。");
      return;
    }
    showErr("");
    const canvas = getCroppedCanvasOutput();
    if (!canvas) {
      showErr("無法輸出剪裁結果，請重試。");
      return;
    }
    try {
      const dataUrl = canvas.toDataURL("image/png");
      sessionStorage.setItem(STORAGE_KEY, dataUrl);
      window.location.href = "CardIndex_Export.html";
    } catch (err) {
      showErr("儲存失敗，圖片可能過大。");
      console.error(err);
    }
  });
})();
