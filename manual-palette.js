/* Hand-picked color dots belong to the current page's canvas nodes. */
const paletteAdd = document.querySelector('.palette-add');
const paletteRemove = document.querySelector('.palette-remove');
const paletteCount = document.querySelector('.palette-count');
let paletteGesture = null;
let paletteHold = null;

function currentPalette() {
  return editorCanvas.querySelector('.outfit-color-palette');
}

function syncPaletteControls() {
  const count = currentPalette()?.querySelectorAll('.palette-swatch').length || 0;
  paletteCount.value = String(count);
  paletteCount.textContent = String(count);
  paletteRemove.disabled = count === 0;
  paletteAdd.disabled = count >= 12;
}

function paletteSize(group) {
  return Math.max(14, Math.min(40, Number(group.dataset.size) || 22));
}

function paletteMaxSize(group) {
  const count = group.querySelectorAll('.palette-swatch').length;
  return count ? Math.max(14, Math.min(40, Math.floor((editorCanvas.clientWidth - 16 - (count - 1) * 8) / count))) : 40;
}

function clampPalettePosition(group) {
  const maxLeft = Math.max(0, editorCanvas.clientWidth - group.offsetWidth);
  const maxTop = canvasEditMaxTop(group.offsetHeight);
  group.style.left = `${Math.max(0, Math.min(maxLeft, Number.parseFloat(group.style.left) || 0))}px`;
  group.style.top = `${Math.max(canvasEditMinTop(), Math.min(maxTop, Number.parseFloat(group.style.top) || canvasEditMinTop()))}px`;
}

function selectPaletteSwatch(group, index) {
  group.dataset.activeIndex = String(index);
  group.querySelectorAll('.palette-swatch').forEach((swatch, i) => {
    swatch.classList.toggle('is-active', i === index);
    swatch.setAttribute('aria-pressed', String(i === index));
  });
}

paletteAdd.addEventListener('click', () => {
  let group = currentPalette();
  if (!group) {
    group = document.createElement('div');
    group.className = 'outfit-color-palette';
    group.dataset.size = '22';
    group.dataset.rotation = '0';
    group.style.setProperty('--swatch-size', '22px');
    group.style.left = `${Math.round(editorCanvas.clientWidth / 2 - 20)}px`;
    group.style.top = `${Math.round(Math.min(editorCanvas.clientHeight * .59, canvasEditMaxTop(40) - 20))}px`;
    group.setAttribute('aria-label', '搭配色卡，拖动移动');
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'palette-resize';
    handle.setAttribute('aria-label', '拖动缩放整组色卡');
    handle.textContent = '↗';
    const rotate = document.createElement('button');
    rotate.type = 'button';
    rotate.className = 'palette-rotate';
    rotate.setAttribute('aria-label', '拖动旋转整组色卡');
    rotate.textContent = '↻';
    group.append(handle, rotate);
    editorCanvas.append(group);
  }
  const count = group.querySelectorAll('.palette-swatch').length;
  if (count >= 12) return;
  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.className = 'palette-swatch';
  swatch.setAttribute('aria-label', `色卡 ${count + 1}，未取色`);
  group.insertBefore(swatch, group.querySelector('.palette-resize'));
  if (paletteSize(group) > paletteMaxSize(group)) {
    group.dataset.size = String(paletteMaxSize(group));
    group.style.setProperty('--swatch-size', `${paletteMaxSize(group)}px`);
  }
  selectPaletteSwatch(group, count);
  clampPalettePosition(group);
  syncPaletteControls();
});

paletteRemove.addEventListener('click', () => {
  const group = currentPalette();
  if (!group) return;
  [...group.querySelectorAll('.palette-swatch')].at(-1)?.remove();
  const remaining = group.querySelectorAll('.palette-swatch').length;
  if (!remaining) group.remove();
  else selectPaletteSwatch(group, Math.min(remaining - 1, Number(group.dataset.activeIndex) || 0));
  syncPaletteControls();
});

new MutationObserver(syncPaletteControls).observe(editorCanvas, { childList: true, subtree: true });
syncPaletteControls();

editorCanvas.addEventListener('pointerdown', event => {
  const group = event.target.closest('.outfit-color-palette');
  if (!group || !detailPage.classList.contains('is-editing')) return;
  const swatch = event.target.closest('.palette-swatch');
  if (swatch) selectPaletteSwatch(group, [...group.querySelectorAll('.palette-swatch')].indexOf(swatch));
  const bounds = group.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  const centerY = bounds.top + bounds.height / 2;
  paletteGesture = {
    group, pointerId: event.pointerId, resizing: Boolean(event.target.closest('.palette-resize')),
    rotating: Boolean(event.target.closest('.palette-rotate')),
    x: event.clientX, y: event.clientY, left: group.offsetLeft, top: group.offsetTop, size: paletteSize(group),
    centerX, centerY, rotation: Number(group.dataset.rotation || 0),
    startAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX)
  };
  group.setPointerCapture(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
});

editorCanvas.addEventListener('pointermove', event => {
  if (!paletteGesture || paletteGesture.pointerId !== event.pointerId) return;
  const { group } = paletteGesture;
  const dx = (event.clientX - paletteGesture.x) / canvasDisplayScale();
  const dy = (event.clientY - paletteGesture.y) / canvasDisplayScale();
  if (paletteGesture.rotating) {
    const angle = Math.atan2(event.clientY - paletteGesture.centerY, event.clientX - paletteGesture.centerX);
    const rotation = paletteGesture.rotation + (angle - paletteGesture.startAngle) * 180 / Math.PI;
    group.dataset.rotation = String(rotation);
    group.style.setProperty('--palette-rotation', `${rotation}deg`);
  } else if (paletteGesture.resizing) {
    const size = Math.max(14, Math.min(paletteMaxSize(group), Math.round(paletteGesture.size + (dx + dy) / 2)));
    group.dataset.size = String(size);
    group.style.setProperty('--swatch-size', `${size}px`);
  } else {
    group.style.left = `${paletteGesture.left + dx}px`;
    group.style.top = `${paletteGesture.top + dy}px`;
  }
  clampPalettePosition(group);
  event.preventDefault();
  event.stopPropagation();
});

function endPaletteGesture(event) {
  if (!paletteGesture || paletteGesture.pointerId !== event.pointerId) return;
  const { group } = paletteGesture;
  if (group.hasPointerCapture(event.pointerId)) group.releasePointerCapture(event.pointerId);
  paletteGesture = null;
  event.preventDefault();
  event.stopPropagation();
}
editorCanvas.addEventListener('pointerup', endPaletteGesture);
editorCanvas.addEventListener('pointercancel', endPaletteGesture);

function sampleHeldImage(piece, clientX, clientY) {
  const image = piece.querySelector('img');
  const record = getPieceImages(piece)[Number(piece.dataset.imageIndex || 0)];
  if (!image?.naturalWidth || !record) return null;
  const canvasRect = editorCanvas.getBoundingClientRect();
  const scale = canvasDisplayScale();
  const x = (clientX - canvasRect.left) / scale - piece.offsetLeft - piece.offsetWidth / 2;
  const y = (clientY - canvasRect.top) / scale - piece.offsetTop - piece.offsetHeight / 2;
  const angle = -Number(piece.dataset.rotation || 0) * Math.PI / 180;
  const localX = x * Math.cos(angle) - y * Math.sin(angle) + piece.clientWidth / 2;
  const localY = x * Math.sin(angle) + y * Math.cos(angle) + piece.clientHeight / 2;
  const fit = Math.min(piece.clientWidth / image.naturalWidth, piece.clientHeight / image.naturalHeight);
  const width = image.naturalWidth * fit * record.scale;
  const height = image.naturalHeight * fit * record.scale;
  const sourceX = (localX - (piece.clientWidth - width) / 2 - record.x) / width * image.naturalWidth;
  const sourceY = (localY - (piece.clientHeight - height) / 2 - record.y) / height * image.naturalHeight;
  if (sourceX < 0 || sourceX >= image.naturalWidth || sourceY < 0 || sourceY >= image.naturalHeight) return null;
  const radiusX = Math.max(2, 12 / width * image.naturalWidth);
  const radiusY = Math.max(2, 12 / height * image.naturalHeight);
  const cropX = Math.max(0, sourceX - radiusX), cropY = Math.max(0, sourceY - radiusY);
  const cropWidth = Math.min(image.naturalWidth - cropX, radiusX * 2);
  const cropHeight = Math.min(image.naturalHeight - cropY, radiusY * 2);
  const sample = document.createElement('canvas');
  sample.width = 20; sample.height = 20;
  const ctx = sample.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, 20, 20);
  const data = ctx.getImageData(0, 0, 20, 20).data;
  const bins = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 150) continue;
    const channels = [data[i], data[i + 1], data[i + 2]];
    const key = channels.map(channel => Math.floor(channel / 24)).join(',');
    const bin = bins.get(key) || { sum: [0, 0, 0], count: 0 };
    channels.forEach((channel, index) => { bin.sum[index] += channel; });
    bin.count++;
    bins.set(key, bin);
  }
  const dominant = [...bins.values()].sort((a, b) => b.count - a.count)[0];
  return dominant && `#${dominant.sum.map(total => Math.round(total / dominant.count).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function cancelPaletteHold() {
  if (paletteHold) window.clearTimeout(paletteHold.timer);
  paletteHold = null;
}

editorCanvas.addEventListener('pointerdown', event => {
  if (!detailPage.classList.contains('is-editing') || !currentPalette()) return;
  const piece = event.target.closest('.outfit-piece.has-image');
  if (!piece || event.target.closest('.piece-handle')) return;
  cancelPaletteHold();
  paletteHold = { pointerId: event.pointerId, piece, x: event.clientX, y: event.clientY, timer: null };
  const hold = paletteHold;
  hold.timer = window.setTimeout(() => {
    if (paletteHold !== hold || activePiecePointers.size > 1) return;
    try {
      const color = sampleHeldImage(piece, hold.x, hold.y);
      if (!color) { showToast('请长按图片有颜色的区域'); return; }
      const group = currentPalette();
      const swatches = [...group.querySelectorAll('.palette-swatch')];
      const index = Math.max(0, Math.min(swatches.length - 1, Number(group.dataset.activeIndex) || 0));
      const swatch = swatches[index];
      swatch.dataset.color = color;
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', `色卡 ${index + 1}，${color}`);
      selectPaletteSwatch(group, swatches.findIndex(item => !item.dataset.color) >= 0 ? swatches.findIndex(item => !item.dataset.color) : index);
      editGesture = null;
      showToast(`已吸取 ${color}`);
    } catch { showToast('这张图片暂时无法取色'); }
    cancelPaletteHold();
  }, 650);
}, true);

editorCanvas.addEventListener('pointermove', event => {
  if (paletteHold?.pointerId === event.pointerId && Math.hypot(event.clientX - paletteHold.x, event.clientY - paletteHold.y) > 8) cancelPaletteHold();
}, true);
editorCanvas.addEventListener('pointerup', cancelPaletteHold, true);
editorCanvas.addEventListener('pointercancel', cancelPaletteHold, true);
editorCanvas.addEventListener('contextmenu', event => {
  if (detailPage.classList.contains('is-editing') && currentPalette() && event.target.closest('.outfit-piece.has-image')) event.preventDefault();
});
